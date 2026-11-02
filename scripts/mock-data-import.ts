import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { listPrice, validISBN } from "../lib/utils/books";

const scrypt = promisify(scryptCallback);
type Row = Record<string, unknown>;
type Json = Prisma.InputJsonValue;

function fail(message: string): never {
  throw new Error(`Invalid mock-data: ${message}`);
}

function object(value: unknown, label: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Row;
}

function text(value: unknown, label: string, max = 150): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(`${label} must contain 1-${max} characters`);
  return value;
}

function optionalText(value: unknown, label: string, max = 100_000): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max) fail(`${label} must be a string of at most ${max} characters`);
  return value;
}

function integer(value: unknown, label: string, min = 1, max = 2_147_483_647): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail(`${label} must be an integer between ${min} and ${max}`);
  return value;
}

function date(value: unknown, label: string): Date {
  const input = text(value, label, 40);
  const result = new Date(input);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input) || !Number.isFinite(result.getTime())) fail(`${label} must be an ISO timestamp`);
  return result;
}

function money(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{1,12}$/.test(value)) fail(`${label} must be an integer VND string, at most 12 digits`);
  return BigInt(value).toString();
}

function rows(documents: Record<string, unknown>, filename: string): Row[] {
  const value = documents[filename];
  if (!Array.isArray(value)) fail(`${filename} must be an array`);
  return value.map((item, index) => object(item, `${filename}[${index}]`));
}

function unique<T>(items: T[], key: (item: T) => string, label: string): T[] {
  const seen = new Set<string>();
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) fail(`duplicate ${label}: ${id}`);
    seen.add(id);
  }
  return items;
}

function reference(keys: Set<string>, key: string, label: string) {
  if (!keys.has(key)) fail(`${label} references missing key ${key}`);
}

function withoutSecrets(value: unknown): Json {
  if (Array.isArray(value)) return value.map(withoutSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) =>
      !/^(password|passwordHash|accessToken|refreshToken|apiKey|secret)$/i.test(key),
    ).map(([key, item]) => [key, item === null ? null : withoutSecrets(item)]));
  }
  return value as Json;
}

export function documentChecksum(value: Json): string {
  // JSONB does not preserve object key order; canonicalize before hashing.
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object") return Object.fromEntries(
      Object.entries(item).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => [key, canonical(child)]),
    );
    return item;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function prepareMockData(documents: Record<string, unknown>) {
  const parents = unique(rows(documents, "category-parents.json").map((row) => ({
    seedKey: text(row.id, "parent.id"), name: text(row.name, "parent.name"),
    description: optionalText(row.description, "parent.description"), imageUrl: optionalText(row.imageUrl, "parent.imageUrl"),
    createdAt: date(row.createdAt, "parent.createdAt"), updatedAt: date(row.updatedAt, "parent.updatedAt"),
  })), (row) => row.seedKey, "parent.id");
  const parentKeys = new Set(parents.map((row) => row.seedKey));

  const categories = unique(rows(documents, "categories.json").map((row) => {
    const parentSeedKey = text(row.parentId, "category.parentId");
    reference(parentKeys, parentSeedKey, "category.parentId");
    return {
      seedKey: text(row.id, "category.id"), parentSeedKey, name: text(row.name, "category.name"),
      description: optionalText(row.description, "category.description"), imageUrl: optionalText(row.imageUrl, "category.imageUrl"),
      createdAt: date(row.createdAt, "category.createdAt"), updatedAt: date(row.updatedAt, "category.updatedAt"),
    };
  }), (row) => row.seedKey, "category.id");
  const categoryKeys = new Set(categories.map((row) => row.seedKey));

  const users = unique(rows(documents, "users.json").map((row) => {
    if (row.role !== "ADMIN" && row.role !== "USER") fail("user.role must be ADMIN or USER");
    const email = text(row.email, "user.email", 254).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("user.email is invalid");
    return {
      seedKey: text(row.id, "user.id"), fullName: text(row.username, "user.username"), email,
      password: text(row.password, "user.password", 1024), role: row.role === "ADMIN" ? 1 : 0,
      avatarUrl: optionalText(row.avatarUrl, "user.avatarUrl"),
      createdAt: date(row.createdAt, "user.createdAt"), updatedAt: date(row.updatedAt, "user.updatedAt"),
    };
  }), (row) => row.seedKey, "user.id");
  unique(users, (row) => row.email, "user.email");
  const userKeys = new Set(users.map((row) => row.seedKey));

  const books = unique(rows(documents, "products.json").map((row) => {
    const categorySeedKey = text(row.categoryId, "product.categoryId");
    reference(categoryKeys, categorySeedKey, "product.categoryId");
    if (typeof row.isActive !== "boolean") fail("product.isActive must be boolean");
    const sellingPrice = money(row.price, "product.price");
    const discount = row.discount ?? 0;
    if (typeof discount !== "number" || !Number.isFinite(discount) || discount < 0 || discount >= 100 || Math.abs(discount * 100 - Math.round(discount * 100)) > 0.000001) fail("product.discount must be 0 <= discount < 100, at most 2 decimal places");
    const originalPrice = row.originalPrice == null ? listPrice(sellingPrice, discount) ?? sellingPrice : money(row.originalPrice, "product.originalPrice");
    if (BigInt(originalPrice) < BigInt(sellingPrice)) fail("product.originalPrice must be at least the selling price");
    money(originalPrice, "product.originalPrice");
    const isbn = optionalText(row.isbn, "product.isbn", 17);
    if (isbn && !validISBN(isbn)) fail("product.isbn has invalid ISBN checksum");
    return {
      seedKey: text(row.id, "product.id"), categorySeedKey, title: text(row.name, "product.name", 255),
      author: text(row.author, "product.author", 255), publisher: optionalText(row.publisher, "product.publisher", 255),
      description: optionalText(row.description, "product.description"), coverImage: optionalText(row.imageUrl, "product.imageUrl"),
      sellingPrice, originalPrice, discount, isbn,
      pageCount: row.pageCount == null ? null : integer(row.pageCount, "product.pageCount"),
      publicationYear: row.publicationYear == null ? null : integer(row.publicationYear, "product.publicationYear"),
      language: optionalText(row.language, "product.language", 100), coverType: optionalText(row.coverType, "product.coverType", 100),
      isActive: row.isActive, stockQuantity: row.stockQuantity == null ? 0 : integer(row.stockQuantity, "product.stockQuantity", 0),
      createdAt: date(row.createdAt, "product.createdAt"), updatedAt: date(row.updatedAt, "product.updatedAt"),
    };
  }), (row) => row.seedKey, "product.id");
  const bookKeys = new Set(books.map((row) => row.seedKey));

  const services = object(documents["customer-services.json"], "customer-services.json");
  if (!Array.isArray(services.products)) fail("customer-services.products must be an array");
  const consultations = unique(services.products.map((value) => {
    const row = object(value, "consultation.product");
    const bookSeedKey = text(row.id, "consultation.id");
    reference(bookKeys, bookSeedKey, "consultation.id");
    if (!Array.isArray(row.usages) || !row.usages.every((usage) => typeof usage === "string") || !Array.isArray(row.specs) || !row.specs.every((spec) => typeof spec === "string")) fail("consultation usages/specs must be string arrays");
    return { bookSeedKey, component: text(row.component, "consultation.component", 40), usages: row.usages as string[], specs: row.specs as string[], reasons: withoutSecrets(object(row.reasons, "consultation.reasons")), isActive: true };
  }), (row) => row.bookSeedKey, "consultation.id");

  const statusMap = { Processing: "PENDING", Preparing: "PREPARING", Shipping: "SHIPPING", Done: "DELIVERED" } as const;
  const orders = unique(rows(documents, "orders.json").map((row) => {
    const seedKey = text(row.id, "order.id");
    const userSeedKey = text(row.userId, "order.userId");
    reference(userKeys, userSeedKey, "order.userId");
    const inputStatus = text(row.status, "order.status");
    if (!Object.hasOwn(statusMap, inputStatus)) fail(`unsupported order.status: ${inputStatus}`);
    const status = statusMap[inputStatus as keyof typeof statusMap];
    if (!Array.isArray(row.items) || row.items.length === 0) fail("order.items must not be empty");
    const items = unique(row.items.map((input) => {
      const item = object(input, "order.item");
      const bookSeedKey = text(item.productId, "item.productId");
      reference(bookKeys, bookSeedKey, "item.productId");
      if (item.orderId !== seedKey) fail("item.orderId does not match its order");
      const product = object(item.product, "item.product");
      if (product.id !== bookSeedKey) fail("item.product.id does not match item.productId");
      return {
        seedKey: text(item.id, "item.id"), bookSeedKey, bookTitle: text(product.name, "item.product.name", 255),
        quantity: integer(item.quantity, "item.quantity"), unitPrice: money(item.unitPrice, "item.unitPrice"),
        createdAt: date(item.createdAt, "item.createdAt"), updatedAt: date(item.updatedAt, "item.updatedAt"),
      };
    }), (item) => item.bookSeedKey, "item.productId within order");
    const totalAmount = money(row.totalPrice, "order.totalPrice");
    if (items.reduce((sum, item) => sum + BigInt(item.unitPrice) * BigInt(item.quantity), BigInt(0)) !== BigInt(totalAmount)) fail(`order ${seedKey}: totalPrice does not equal its items`);
    const updatedAt = date(row.updatedAt, "order.updatedAt");
    return {
      seedKey, userSeedKey, status, totalAmount, items,
      // The demo does not supply shipping addresses. Preserve that absence explicitly.
      shippingAddress: optionalText(row.shippingAddress, "order.shippingAddress") ?? "",
      orderDate: date(row.createdAt, "order.createdAt"), updatedAt,
      completedAt: status === "DELIVERED" ? date(row.completedAt ?? row.updatedAt, "order.completedAt") : null,
    };
  }), (row) => row.seedKey, "order.id");
  unique(orders.flatMap((row) => row.items), (row) => row.seedKey, "item.id");

  const reviews = unique(rows(documents, "reviews.json").map((row) => {
    const userSeedKey = text(row.UserID, "review.UserID");
    const bookSeedKey = text(row.BookID, "review.BookID");
    reference(userKeys, userSeedKey, "review.UserID");
    reference(bookKeys, bookSeedKey, "review.BookID");
    return {
      seedKey: `review-${integer(row.ReviewID, "review.ReviewID")}`, userSeedKey, bookSeedKey,
      rating: integer(row.Rating, "review.Rating", 1, 5), comment: optionalText(row.Comment, "review.Comment"),
      createdAt: date(row.CreatedAt, "review.CreatedAt"),
    };
  }), (row) => row.seedKey, "review.ReviewID");

  const sourceDocuments = Object.entries(documents).sort(([a], [b]) => a.localeCompare(b)).map(([filename, value]) => {
    if (value == null || typeof value !== "object") fail(`${filename} must contain a JSON object or array`);
    const payload = withoutSecrets(value);
    const recordCount = Array.isArray(value) ? value.length : Object.values(value).reduce<number>((count, item) => count + (Array.isArray(item) ? item.length : 0), 0);
    return { filename, payload, checksum: documentChecksum(payload), recordCount };
  });
  return { parents, categories, users, books, orders, reviews, consultations, documents: sourceDocuments };
}

export type MockDataBundle = ReturnType<typeof prepareMockData>;

export async function loadMockData(directory: string): Promise<MockDataBundle> {
  const filenames = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  if (filenames.length === 0) fail("no JSON files found");
  const entries = await Promise.all(filenames.map(async (filename) => {
    try { return [filename, JSON.parse(await readFile(join(directory, filename), "utf8"))] as const; }
    catch { fail(`cannot parse ${filename}`); }
  }));
  return prepareMockData(Object.fromEntries(entries));
}

export async function hashSeedPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const digest = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${digest.toString("hex")}`;
}

export function bundleCounts(bundle: MockDataBundle) {
  return {
    Users: bundle.users.length, Category_Parents: bundle.parents.length,
    Categories: bundle.categories.length, Books: bundle.books.length,
    Orders: bundle.orders.length, Order_Items: bundle.orders.reduce((sum, order) => sum + order.items.length, 0),
    Reviews: bundle.reviews.length, Seed_Documents: bundle.documents.length,
    Consultation_Profiles: bundle.consultations.length,
  };
}

export async function importMockData(prisma: PrismaClient, bundle: MockDataBundle) {
  // Hash outside the transaction. Only newly created users receive these hashes.
  const passwordHashes = new Map(await Promise.all(bundle.users.map(async (user) =>
    [user.seedKey, await hashSeedPassword(user.password)] as const,
  )));
  return prisma.$transaction(async (tx) => {
    // Serialize importers, including runs from different machines.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19260817, 20261029)`;
    const counts = bundleCounts(bundle);
    const created = Object.fromEntries(Object.keys(counts).map((key) => [key, 0])) as Record<keyof typeof counts, number>;
    const parents = new Map<string, number>();
    const categories = new Map<string, number>();
    const users = new Map<string, number>();
    const books = new Map<string, number>();

    // Never silently pair an unrelated existing account with a demo user.
    for (const user of bundle.users) {
      const sameEmail = await tx.user.findUnique({ where: { email: user.email } });
      if (sameEmail && sameEmail.seedKey !== user.seedKey) throw new Error(`Email ${user.email} already belongs to another account; no data was imported.`);
    }

    for (const source of bundle.documents) {
      const existing = await tx.seedDocument.findUnique({ where: { filename: source.filename } });
      if (existing && existing.checksum !== source.checksum) throw new Error(`${source.filename} has changed since its first import. Existing data is preserved; use a reviewed data migration to update it.`);
    }

    for (const input of bundle.parents) {
      let row = await tx.categoryParent.findUnique({ where: { seedKey: input.seedKey } });
      if (!row) { row = await tx.categoryParent.create({ data: input }); created.Category_Parents++; }
      parents.set(input.seedKey, row.id);
    }
    for (const { parentSeedKey, ...input } of bundle.categories) {
      let row = await tx.category.findUnique({ where: { seedKey: input.seedKey } });
      if (!row) { row = await tx.category.create({ data: { ...input, parentId: parents.get(parentSeedKey)! } }); created.Categories++; }
      categories.set(input.seedKey, row.id);
    }
    for (const input of bundle.users) {
      let row = await tx.user.findUnique({ where: { seedKey: input.seedKey } });
      if (!row) {
        row = await tx.user.create({ data: {
          seedKey: input.seedKey, fullName: input.fullName, email: input.email,
          avatarUrl: input.avatarUrl, role: input.role, createdAt: input.createdAt, updatedAt: input.updatedAt,
          passwordHash: passwordHashes.get(input.seedKey)!,
        } });
        created.Users++;
      }
      users.set(input.seedKey, row.id);
    }
    for (const { categorySeedKey, ...input } of bundle.books) {
      let row = await tx.book.findUnique({ where: { seedKey: input.seedKey } });
      if (!row) { row = await tx.book.create({ data: { ...input, categoryId: categories.get(categorySeedKey)! } }); created.Books++; }
      books.set(input.seedKey, row.id);
    }
    for (const { userSeedKey, items, ...input } of bundle.orders) {
      let row = await tx.order.findUnique({ where: { seedKey: input.seedKey } });
      if (!row) { row = await tx.order.create({ data: { ...input, userId: users.get(userSeedKey)! } }); created.Orders++; }
      for (const { bookSeedKey, ...item } of items) {
        if (!await tx.orderItem.findUnique({ where: { seedKey: item.seedKey } })) {
          await tx.orderItem.create({ data: { ...item, bookImage: bundle.books.find((book) => book.seedKey === bookSeedKey)?.coverImage, orderId: row.id, bookId: books.get(bookSeedKey)! } });
          created.Order_Items++;
        }
      }
    }
    for (const { userSeedKey, bookSeedKey, ...input } of bundle.reviews) {
      if (!await tx.review.findUnique({ where: { seedKey: input.seedKey } })) {
        await tx.review.create({ data: { ...input, userId: users.get(userSeedKey)!, bookId: books.get(bookSeedKey)! } });
        created.Reviews++;
      }
    }
    for (const source of bundle.documents) {
      if (!await tx.seedDocument.findUnique({ where: { filename: source.filename } })) {
        await tx.seedDocument.create({ data: source });
        created.Seed_Documents++;
      }
    }
    for (const { bookSeedKey, ...input } of bundle.consultations) {
      const bookId = books.get(bookSeedKey)!;
      if (!await tx.consultationProfile.findUnique({ where: { bookId } })) {
        await tx.consultationProfile.create({ data: { ...input, bookId } });
        created.Consultation_Profiles++;
      }
    }
    return Object.fromEntries(Object.entries(counts).map(([table, expected]) => [table, {
      source: expected, created: created[table as keyof typeof counts], existing: expected - created[table as keyof typeof counts],
    }]));
  }, { maxWait: 15_000, timeout: 60_000 });
}
