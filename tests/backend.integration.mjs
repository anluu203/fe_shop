import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { request as httpRequest } from "node:http";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { PrismaClient } from "../generated/prisma/client.ts";
import { getDatabaseUrl } from "../lib/server/database-config.ts";
import { importMockData, loadMockData } from "../scripts/mock-data-import.ts";
import { isPublicAddress, pinnedLookup } from "../lib/server/image-network.ts";
import { CHAT_SUGGESTIONS } from "../lib/services/chatbot-suggestions.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
test("remote image policy blocks private, mapped and transition IPs", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.0.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::1"]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true, address);
});
test("pinned DNS supports both Node single-address and auto-family lookup", async () => {
  const server = createHttpServer((_request, response) => { response.end("image bytes"); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    for (const autoSelectFamily of [true, false]) {
      const text = await new Promise((fulfill, reject) => {
        const req = httpRequest({ hostname: "image-source.invalid", port: server.address().port, autoSelectFamily, lookup: pinnedLookup({ address: "127.0.0.1", family: 4 }) }, (response) => { let value = ""; response.on("data", (chunk) => { value += chunk; }); response.on("end", () => fulfill(value)); });
        req.on("error", reject); req.end();
      });
      assert.equal(text, "image bytes");
    }
  } finally { server.closeAllConnections(); await new Promise((fulfill) => server.close(fulfill)); }
});
async function freePort() {
  const socket = createServer(); socket.listen(0, "127.0.0.1"); await once(socket, "listening");
  const port = socket.address().port; await new Promise((fulfill) => socket.close(fulfill)); return port;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit"); child.kill();
  await Promise.race([exited, delay(5000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })]);
}

test("production HTTP backend, real PostgreSQL, and runtime images", { timeout: 180_000 }, async (t) => {
  await stat(resolve(root, ".next/BUILD_ID"));
  const suffix = randomUUID().replaceAll("-", "");
  const database = `book_shop_api_test_${suffix}`;
  const artifactRoot = resolve(root, ".test-artifacts", suffix);
  const imageRoot = resolve(artifactRoot, "images");
  await mkdir(imageRoot, { recursive: true });
  const adminUrl = new URL(getDatabaseUrl()); adminUrl.pathname = "/postgres";
  const connection = new Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  let created = false, db, provider;
  const children = [];
  const secret = randomBytes(48).toString("hex");
  try {
    await connection.connect();
    assert.match(database, /^book_shop_api_test_[a-f0-9]{32}$/);
    await connection.query(`CREATE DATABASE "${database}" TEMPLATE template0 ENCODING 'UTF8'`); created = true;
    const target = new URL(adminUrl); target.pathname = `/${database}`;
    const environment = { ...process.env, DATABASE_URL: target.toString(), AUTH_SECRET: secret, IMAGE_ROOT: imageRoot, NEXT_PUBLIC_USE_MOCK: "false", NEXT_PUBLIC_API_URL: "/api/v1", GEMINI_API_KEY: "", AI_API_URL: "", AI_API_KEY: "", RETURN_WINDOW_DAYS: "14", TRUST_PROXY: "false" };
    const migration = spawnSync(process.execPath, [resolve(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"], { cwd: root, env: environment, encoding: "utf8", timeout: 40_000 });
    assert.equal(migration.status, 0, migration.stderr);
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString(), connectionTimeoutMillis: 5000 }) });
    const source = await loadMockData(resolve(root, "mock-data")); await importMockData(db, source);
    assert.equal(await db.consultationProfile.count(), 32);

    async function start(extra = {}) {
      const port = await freePort();
      const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: root, env: { ...environment, ...extra }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      children.push(child);
      let logs = ""; for (const stream of [child.stdout, child.stderr]) stream.on("data", (bytes) => { logs = (logs + bytes).slice(-8000); });
      const base = `http://127.0.0.1:${port}`;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) assert.fail(`Server exited: ${logs}`);
        try { if ((await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(1000) })).ok) return { base, child }; } catch {}
        await delay(100);
      }
      assert.fail(`Server did not start: ${logs}`);
    }
    let app = await start();
    async function call(path, { method = "GET", token, body, headers = {}, base = app.base } = {}) {
      const response = await fetch(`${base}/api/v1${path}`, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const payload = response.status === 204 ? null : await response.json();
      return { status: response.status, body: payload, headers: response.headers };
    }
    async function expect(path, status, options) { const result = await call(path, options); assert.equal(result.status, status, `${options?.method ?? "GET"} ${path}: ${JSON.stringify(result.body)}`); return result.body; }
    const login = async (email, password) => (await expect("/auth/login", 200, { method: "POST", body: { email, password } })).accessToken;
    const adminSeed = source.users.find((user) => user.role === 1);
    const readerSeeds = source.users.filter((user) => user.role === 0);
    let admin = await login(adminSeed.email, adminSeed.password);
    const reader = await login(readerSeeds[0].email, readerSeeds[0].password);
    const other = await login(readerSeeds[1].email, readerSeeds[1].password);
    const readerId = Number((await expect("/auth/me", 200, { token: reader })).id);
    const category = (await expect("/categories", 200))[0];
    let book, assetUrl, order;
    const shipping = { shippingName: "Người nhận", shippingPhone: "0901234567", shippingAddress: "123 Nguyễn Trãi, TP. Hồ Chí Minh", paymentMethod: "COD" };
    async function stock(id, delta, key = randomUUID()) { return expect(`/admin/products/${id}/stock-adjustments`, 200, { method: "POST", token: admin, headers: { "Idempotency-Key": key }, body: { delta, reason: "Integration test" } }); }
    async function place(token, id, quantity = 1, key = randomUUID()) {
      await expect("/orders/cart/items", 200, { method: "POST", token, body: { productId: id, quantity } });
      return expect("/orders/checkout", 201, { method: "POST", token, body: shipping, headers: { "Idempotency-Key": key } });
    }
    async function deliver(row) {
      for (const status of ["Preparing", "Shipping", "Done"]) row = await expect(`/admin/orders/${row.id}/status`, 200, { method: "PATCH", token: admin, body: { status, ...(status === "Done" ? { paymentCollected: true } : {}) } });
      return row;
    }

    await t.test("health, validation, role and session revocation", async () => {
      await expect("/ready", 200);
      const head = await fetch(`${app.base}/api/v1/health`, { method: "HEAD" }); assert.equal(head.status, 200); assert.equal(await head.text(), "");
      await expect("/auth/me", 401);
      await expect("/admin/orders", 403, { token: reader });
      await expect("/auth/register", 400, { method: "POST", body: { username: "Bad", email: "bad@example.com", password: "Secret@12345", role: "ADMIN" } });
      const registered = await expect("/auth/register", 201, { method: "POST", body: { username: "New reader", email: "NEW@example.invalid", password: "Secret@12345" } });
      assert.equal(registered.user.email, "new@example.invalid"); assert.equal(registered.user.role, "USER"); assert.equal(registered.user.passwordHash, undefined);
      await expect("/auth/logout", 204, { method: "POST", token: registered.accessToken });
      await expect("/auth/me", 401, { token: registered.accessToken });
      await expect("/auth/login", 401, { method: "POST", body: { email: "new@example.invalid", password: "bad" } });
      await expect("/users/me", 400, { method: "PATCH", token: reader, body: { role: "ADMIN" } });
      const profile = await expect("/users/me", 200, { method: "PATCH", token: reader, body: { address: shipping.shippingAddress, phoneNumber: shipping.shippingPhone } });
      assert.equal(profile.address, shipping.shippingAddress);
      await db.user.update({ where: { email: adminSeed.email }, data: { role: 0 } });
      await expect("/admin/orders", 403, { token: admin });
      await db.user.update({ where: { email: adminSeed.email }, data: { role: 1 } });
    });

    await t.test("admin bootstrap requires explicit credentials and never promotes existing users", async () => {
      const run = (email, password) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", resolve(root, "scripts/create-admin.mts")], { cwd: root, env: { ...environment, ADMIN_EMAIL: email, ADMIN_PASSWORD: password }, encoding: "utf8", timeout: 20_000 });
      const first = run("bootstrap@example.invalid", "Admin-Test@123456"); assert.equal(first.status, 0, first.stderr);
      const account = await db.user.findUniqueOrThrow({ where: { email: "bootstrap@example.invalid" } }); assert.equal(account.role, 1);
      assert.equal(run("bootstrap@example.invalid", "Another-Test@123456").status, 0); assert.equal((await db.user.findUniqueOrThrow({ where: { id: account.id } })).passwordHash, account.passwordHash);
      assert.equal(run(readerSeeds[0].email, "Admin-Test@123456").status, 1); assert.equal((await db.user.findUniqueOrThrow({ where: { id: readerId } })).role, 0);
    });

    await t.test("runtime upload, ownership, malicious files and remote URL restrictions", async () => {
      const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).png().toBuffer();
      async function upload(target, token, bytes, type = "image/png") {
        const form = new FormData(); form.append("file", new Blob([bytes], { type }), "picture.png");
        const response = await fetch(`${app.base}/api/v1/images/${target}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
        return { status: response.status, body: await response.json() };
      }
      assert.equal((await upload("products", reader, png)).status, 403);
      const saved = await upload("products", admin, png); assert.equal(saved.status, 201, JSON.stringify(saved.body)); assetUrl = saved.body.imageUrl;
      assert.match(assetUrl, /^\/images\/uploads\/products\/[a-f0-9-]+\.webp$/);
      const image = await fetch(app.base + assetUrl); assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/webp");
      assert.ok((await readFile(resolve(imageRoot, assetUrl.slice("/images/".length)))).length > 0);
      assert.equal((await upload("products", admin, Buffer.from("<svg onload='alert(1)'></svg>"))).status, 400);
      assert.equal((await upload("products", admin, Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
      const avatar = await upload("avatars", reader, png); assert.equal(avatar.status, 201);
      await expect("/users/me", 403, { method: "PATCH", token: other, body: { avatarUrl: avatar.body.imageUrl } });
      for (const url of ["http://127.0.0.1/test.png", "http://[::1]/test.png", "file:///etc/passwd", "http://169.254.169.254/latest/meta-data", "http://user:pass@example.com/image.png"]) await expect("/images/products/import", 400, { method: "POST", token: admin, body: { url } });
    });

    await t.test("catalog CRUD, exact prices, accent search, stock idempotency, and hide", async () => {
      const parent = await expect("/category-parents", 201, { method: "POST", token: admin, body: { name: "Integration parent" } });
      const child = await expect("/categories", 201, { method: "POST", token: admin, body: { name: "Integration category", parentId: parent.id } });
      await expect(`/category-parents/${parent.id}`, 409, { method: "DELETE", token: admin });
      book = await expect("/products", 201, { method: "POST", token: admin, body: { name: "Sách thử nghiệm Nguyễn", author: "Tác giả", categoryId: child.id, price: "80000", originalPrice: "100000", imageUrl: assetUrl } });
      assert.equal(book.discount, 20); assert.equal(book.stockQuantity, 0);
      const matches = await expect("/products?search=nguyen", 200); assert.ok(matches.items.some((item) => item.id === book.id));
      await expect(`/categories/${child.id}`, 409, { method: "DELETE", token: admin });
      await expect("/products?includeInactive=1", 403);
      await expect(`/products/${book.id}`, 400, { method: "PATCH", token: admin, body: { stockQuantity: 999 } });
      await expect(`/products/${book.id}`, 400, { method: "PATCH", token: admin, body: { imageUrl: "/images/../.env" } });
      await expect(`/products/${book.id}`, 400, { method: "PATCH", token: admin, body: { imageUrl: "https://example.com/image.jpg" } });
      const key = randomUUID(); await stock(book.id, 10, key); const same = await stock(book.id, 10, key); assert.equal(same.stockQuantity, 10);
      await expect(`/admin/products/${book.id}/stock-adjustments`, 409, { method: "POST", token: admin, headers: { "Idempotency-Key": key }, body: { delta: 1, reason: "Integration test" } });
      const hidden = await expect("/products", 201, { method: "POST", token: admin, body: { name: "Hidden", author: "Test", categoryId: category.id, price: "1000" } });
      await expect(`/products/${hidden.id}`, 204, { method: "DELETE", token: admin }); await expect(`/products/${hidden.id}`, 404);
      await expect("/orders/cart/items", 404, { method: "POST", token: reader, body: { productId: hidden.id, quantity: 1 } });
    });

    await t.test("cart ownership and transactional checkout retries", async () => {
      const cart = await expect("/orders/cart/items", 200, { method: "POST", token: reader, body: { productId: book.id, quantity: 1 } });
      await expect(`/orders/cart/items/${cart.items[0].id}`, 404, { method: "PATCH", token: other, body: { quantity: 2 } });
      await expect(`/products/${book.id}`, 200, { method: "PATCH", token: admin, body: { price: "90000", originalPrice: "100000" } });
      assert.equal((await expect("/orders/cart", 200, { token: reader })).totalPrice, "90000");
      const key = randomUUID();
      const results = await Promise.all([call("/orders/checkout", { method: "POST", token: reader, body: shipping, headers: { "Idempotency-Key": key } }), call("/orders/checkout", { method: "POST", token: reader, body: shipping, headers: { "Idempotency-Key": key } })]);
      results.forEach((result) => assert.equal(result.status, 201, JSON.stringify(result.body))); assert.equal(results[0].body.id, results[1].body.id); order = results[0].body;
      assert.equal(order.totalPrice, "90000"); assert.equal((await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity, 9);
      await expect(`/orders/${order.id}`, 404, { token: other });
      await expect("/orders/checkout", 409, { method: "POST", token: reader, body: { ...shipping, shippingName: "Other" }, headers: { "Idempotency-Key": key } });
      await expect("/orders/checkout", 400, { method: "POST", token: reader, body: shipping, headers: { "Idempotency-Key": randomUUID() } });
      await expect(`/products/${book.id}`, 200, { method: "PATCH", token: admin, body: { name: "Renamed catalog title", price: "95000", originalPrice: "100000" } });
      const historic = await expect(`/orders/${order.id}`, 200, { token: reader }); assert.equal(historic.items[0].unitPrice, "90000"); assert.equal(historic.items[0].product.name, "Sách thử nghiệm Nguyễn");
    });

    await t.test("two customers buying the last copy cannot oversell", async () => {
      const last = await expect("/products", 201, { method: "POST", token: admin, body: { name: "Last copy", author: "Test", categoryId: category.id, price: "1000" } }); await stock(last.id, 1);
      for (const token of [reader, other]) await expect("/orders/cart/items", 200, { method: "POST", token, body: { productId: last.id, quantity: 1 } });
      const results = await Promise.all([reader, other].map((token) => call("/orders/checkout", { method: "POST", token, body: shipping, headers: { "Idempotency-Key": randomUUID() } })));
      assert.deepEqual(results.map((row) => row.status).sort(), [201, 409]);
      assert.equal((await db.book.findUnique({ where: { id: Number(last.id) } })).stockQuantity, 0);
      for (const token of [reader, other]) await expect("/orders/cart", 204, { method: "DELETE", token });
    });

    await t.test("sequential delivery, immutable completion and cancellation restores stock once", async () => {
      await expect(`/admin/orders/${order.id}/status`, 409, { method: "PATCH", token: admin, body: { status: "Shipping" } });
      for (const status of ["Preparing", "Shipping"]) await expect(`/admin/orders/${order.id}/status`, 200, { method: "PATCH", token: admin, body: { status } });
      await expect(`/admin/orders/${order.id}/status`, 400, { method: "PATCH", token: admin, body: { status: "Done" } });
      order = await expect(`/admin/orders/${order.id}/status`, 200, { method: "PATCH", token: admin, body: { status: "Done", paymentCollected: true } });
      assert.equal(order.paymentStatus, "PAID");
      const again = await expect(`/admin/orders/${order.id}/status`, 200, { method: "PATCH", token: admin, body: { status: "Done", paymentCollected: true } }); assert.equal(again.completedAt, order.completedAt);
      await expect(`/orders/${order.id}/cancel`, 409, { method: "POST", token: reader });
      const cancelled = await place(reader, book.id);
      const before = (await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity;
      const results = await Promise.all([call(`/orders/${cancelled.id}/cancel`, { method: "POST", token: reader }), call(`/orders/${cancelled.id}/cancel`, { method: "POST", token: reader })]);
      results.forEach((result) => assert.equal(result.status, 200)); assert.equal((await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity, before + 1);
      assert.equal(await db.inventoryMovement.count({ where: { referenceKey: `cancel:${cancelled.id}:${book.id}` } }), 1);
      const imported = await db.order.findFirstOrThrow({ where: { seedKey: { not: null }, status: "PENDING", userId: readerId }, include: { items: true } });
      const importedBook = await db.book.findUniqueOrThrow({ where: { id: imported.items[0].bookId } });
      await expect(`/orders/${imported.id}/cancel`, 200, { method: "POST", token: reader });
      assert.equal((await db.book.findUniqueOrThrow({ where: { id: importedBook.id } })).stockQuantity, importedBook.stockQuantity);
    });

    await t.test("reviews and consultation use authenticated users and real catalog prices", async () => {
      await expect(`/products/${book.id}/reviews`, 400, { method: "POST", token: reader, body: { Rating: 6 } });
      const review = await expect(`/products/${book.id}/reviews`, 201, { method: "POST", token: reader, body: { Rating: 5, Comment: "Rất tốt" } }); assert.equal(review.UserID, String(readerId)); assert.equal(review.user.email, undefined);
      await expect(`/admin/reviews/${review.ReviewID}`, 403, { method: "DELETE", token: reader }); await expect(`/admin/reviews/${review.ReviewID}`, 204, { method: "DELETE", token: admin });
      const profiles = await expect("/admin/consultation/products", 200, { token: admin }); assert.equal(profiles.length, 32);
      await expect("/admin/consultation/products", 201, { method: "POST", token: admin, body: { bookId: book.id, component: "literature", usages: ["relaxation"], specs: ["Readable"], reasons: { relaxation: "Đọc để thư giãn" }, isActive: true } });
      const recommendations = await expect("/consultation/recommendations?usage=relaxation&component=literature&budget=100000", 200); assert.equal(recommendations.find((row) => row.id === book.id).price, 95000);
    });

    await t.test("returns enforce ownership/quantity, refund atomically, and update revenue", async () => {
      const item = order.items[0];
      const input = { productId: item.id, quantity: 1, contactName: "Người nhận", phone: "0901234567", description: "Sách bị lỗi in một trang" };
      await expect("/returns", 404, { method: "POST", token: other, body: input });
      const competing = await Promise.all([call("/returns", { method: "POST", token: reader, body: input }), call("/returns", { method: "POST", token: reader, body: input })]); assert.deepEqual(competing.map((row) => row.status).sort(), [201, 409]);
      const request = competing.find((row) => row.status === 201).body;
      await expect(`/returns/${request.id}`, 404, { token: other });
      await expect(`/admin/returns/${request.id}/status`, 409, { method: "PATCH", token: admin, body: { status: "completed", note: "Skip" } });
      for (const status of ["checking", "repairing"]) await expect(`/admin/returns/${request.id}/status`, 200, { method: "PATCH", token: admin, body: { status, note: "Đã kiểm tra phiếu" } });
      const before = (await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity;
      const complete = { status: "completed", note: "Đã hoàn tiền mặt và kiểm tra sách", resolution: "refund", restockQuantity: 1 };
      await expect(`/admin/returns/${request.id}/status`, 400, { method: "PATCH", token: admin, body: complete }); assert.equal((await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity, before);
      for (let run = 0; run < 2; run++) { const result = await expect(`/admin/returns/${request.id}/status`, 200, { method: "PATCH", token: admin, body: { ...complete, refundConfirmed: true } }); assert.equal(result.refundAmount, "90000"); }
      assert.equal((await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity, before + 1); assert.equal(await db.refundRecord.count(), 1);
      const now = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
      const report = await expect(`/admin/reports/revenue?from=${now}&to=${now}&period=day`, 200, { token: admin }); assert.equal(report.refunded, "90000"); assert.equal(report.netRevenue, (BigInt(report.revenue) - BigInt(report.refunded)).toString());
      await expect("/admin/reports/revenue?from=2026-02-30&to=2026-03-02&period=day", 400, { token: admin });
    });

    await t.test("exchange records separate inventory movements and expiry is enforced", async () => {
      const exchangedOrder = await deliver(await place(reader, book.id));
      const row = await expect("/returns", 201, { method: "POST", token: reader, body: { productId: exchangedOrder.items[0].id, quantity: 1, contactName: "Người nhận", phone: "0901234567", description: "Cần đổi bản sách bị lỗi" } });
      for (const status of ["checking", "repairing"]) await expect(`/admin/returns/${row.id}/status`, 200, { method: "PATCH", token: admin, body: { status, note: "Kiểm tra đổi sách" } });
      const before = (await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity;
      await expect(`/admin/returns/${row.id}/status`, 200, { method: "PATCH", token: admin, body: { status: "completed", note: "Đã đổi bản mới", resolution: "exchange", restockQuantity: 0 } }); assert.equal((await db.book.findUnique({ where: { id: Number(book.id) } })).stockQuantity, before - 1);
      const expired = await deliver(await place(reader, book.id)); await db.order.update({ where: { id: Number(expired.id) }, data: { completedAt: new Date(Date.now() - 40 * 86_400_000) } });
      await expect("/returns", 409, { method: "POST", token: reader, body: { productId: expired.items[0].id, quantity: 1, contactName: "Người nhận", phone: "0901234567", description: "Phiếu đã quá hạn đổi trả" } });
    });

    await t.test("chatbot isolates guest/account sessions and never exposes private configuration", async () => {
      const config = await expect("/chatbot/config", 200); assert.equal(config.mode, "rules"); assert.equal(config.systemPrompt, undefined);
      const sessionId = randomUUID(); const sent = await call("/chatbot/messages", { method: "POST", body: { sessionId, message: "gợi ý sách dưới 200k" } }); assert.equal(sent.status, 200); const cookie = sent.headers.get("set-cookie").split(";")[0];
      await expect("/chatbot/messages", 403, { method: "POST", body: { sessionId, message: "Tôi là người khác" } });
      await expect("/chatbot/messages", 200, { method: "POST", headers: { Cookie: cookie }, body: { sessionId, message: "thêm sách văn học" } });
      const accountSession = randomUUID(); await expect("/chatbot/messages", 200, { method: "POST", token: reader, body: { sessionId: accountSession, message: "Sách văn học" } }); await expect("/chatbot/messages", 403, { method: "POST", token: other, body: { sessionId: accountSession, message: "Sách văn học" } });
      const { mode, ...configAdmin } = await expect("/admin/chatbot/config", 200, { token: admin }); assert.equal(mode, "rules"); await expect("/admin/chatbot/config", 200, { method: "PATCH", token: admin, body: { ...configAdmin, updatedAt: undefined, enabled: false } });
      await expect("/chatbot/messages", 409, { method: "POST", token: reader, body: { sessionId: randomUUID(), message: "Sách" } }); await expect("/admin/chatbot/config", 200, { method: "PATCH", token: admin, body: { ...configAdmin, updatedAt: undefined } });
      const logs = await expect("/admin/chatbot/logs", 200, { token: admin }); assert.ok(logs.length >= 3); await expect("/admin/chatbot/logs", 403, { token: reader });
      await expect(`/admin/chatbot/logs/${logs[0].id}`, 200, { method: "PATCH", token: admin, body: { resolved: true, adminNote: "Internal only" } });
    });

    await t.test("provider adapter validates AI output and does not save failed responses", async () => {
      let fail = false, providerCalls = 0;
      provider = createHttpServer((request, response) => { providerCalls++; request.resume(); request.on("end", () => { response.writeHead(fail ? 503 : 200, { "Content-Type": "application/json" }); response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "Kết quả từ provider kiểm thử", bookIds: [], needsHuman: true }) } }] })); }); });
      provider.listen(0, "127.0.0.1"); await once(provider, "listening");
      const second = await start({ AI_API_URL: `http://127.0.0.1:${provider.address().port}/chat/completions`, AI_API_KEY: "integration-provider-key" });
      const result = await expect("/chatbot/messages", 200, { method: "POST", base: second.base, body: { sessionId: randomUUID(), message: "gợi ý sách" } }); assert.equal(result.mode, "provider");
      fail = true; const before = await db.chatLog.count(); await expect("/chatbot/messages", 503, { method: "POST", base: second.base, body: { sessionId: randomUUID(), message: "provider failing" } }); assert.equal(await db.chatLog.count(), before);
      // Even with an AI provider configured and failing, every client suggestion
      // must reply from database/templates and keep the normal admin history.
      const callsBeforeSuggestions = providerCalls;
      for (const suggestion of CHAT_SUGGESTIONS) {
        const sessionId = randomUUID();
        const quick = await expect("/chatbot/messages", 200, { method: "POST", base: second.base, body: { sessionId, message: suggestion.text } });
        assert.equal(quick.mode, "rules");
        assert.ok(quick.answer.length > 0);
        assert.ok(quick.books.length <= 3);
        assert.ok(quick.books.every((book) => book.isActive && book.stockQuantity > 0));
        if (suggestion.maxPrice) assert.ok(quick.books.every((book) => Number(book.price) <= suggestion.maxPrice));
        assert.equal(await db.chatLog.count({ where: { sessionId, answer: quick.answer } }), 1);
      }
      assert.equal(providerCalls, callsBeforeSuggestions, "Suggested questions must never call the AI provider");
      await stop(second.child);
    });

    await t.test("maintenance removes old orphan images but preserves order snapshot images", async () => {
      const form = new FormData(); form.append("file", new Blob([await sharp({ create: { width: 2, height: 2, channels: 3, background: "#abcdef" } }).png().toBuffer()], { type: "image/png" }), "orphan.png");
      const response = await fetch(`${app.base}/api/v1/images/products`, { method: "POST", headers: { Authorization: `Bearer ${admin}` }, body: form }); assert.equal(response.status, 201);
      const orphan = await response.json();
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await db.uploadedAsset.updateMany({ where: { imageUrl: { in: [assetUrl, orphan.imageUrl] } }, data: { createdAt: old } });
      await expect(`/products/${book.id}`, 200, { method: "PATCH", token: admin, body: { imageUrl: null } });
      const cleanup = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", resolve(root, "scripts/server-maintenance.mts")], { cwd: root, env: environment, encoding: "utf8", timeout: 20_000 });
      assert.equal(cleanup.status, 0, cleanup.stderr); assert.equal((await fetch(app.base + orphan.imageUrl)).status, 404);
      await assert.rejects(stat(resolve(imageRoot, orphan.imageUrl.slice("/images/".length))), { code: "ENOENT" });
      assert.equal((await fetch(app.base + assetUrl)).status, 200); assert.ok(await db.uploadedAsset.findUnique({ where: { imageUrl: assetUrl } }));
    });

    await t.test("restart keeps sessions, orders, images, and page rendering", async () => {
      await stop(app.child); app = await start();
      await expect("/auth/me", 200, { token: reader }); await expect(`/orders/${order.id}`, 200, { token: reader });
      assert.equal((await fetch(app.base + assetUrl)).status, 200);
      for (const path of ["/client", "/client/products", "/client/cart", "/client/warranty", "/admin", "/admin/consultation", "/admin/warranty"]) assert.equal((await fetch(app.base + path)).status, 200, path);
      await expect("/auth/logout", 204, { method: "POST", token: admin }); await expect("/admin/orders", 401, { token: admin }); admin = await login(adminSeed.email, adminSeed.password);
      await expect("/admin/orders", 200, { token: admin });
    });
  } finally {
    await Promise.all(children.map(stop));
    if (provider) { provider.closeAllConnections(); await new Promise((fulfill) => provider.close(fulfill)); }
    await db?.$disconnect();
    if (created) { assert.match(database, /^book_shop_api_test_[a-f0-9]{32}$/); await connection.query(`DROP DATABASE "${database}" WITH (FORCE)`); }
    await connection.end();
    assert.ok(artifactRoot.startsWith(resolve(root, ".test-artifacts") + sep)); assert.match(suffix, /^[a-f0-9]{32}$/);
    await rm(artifactRoot, { recursive: true, force: true });
  }
});
