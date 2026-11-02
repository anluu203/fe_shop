import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate, hashPassword, issueSession, requireAdmin, requireUser, verifyPassword } from "./auth";
import { assertImage, downloadImage, imageLimit, saveImage } from "./assets";
import { clientIdentifier, empty, errorResponse, HttpError, json, jsonBody, numericId, rateLimit, readBytes, requireCondition, transaction } from "./http";
import * as schema from "./validators";
import * as catalog from "./services/catalog";
import * as orders from "./services/orders";
import * as customer from "./services/customer-services";
import * as support from "./services/support";
import { publicCategory, publicParent, publicUser } from "./serializers";

type Handler = (request: Request, match: RegExpMatchArray, query: URLSearchParams) => Promise<Response>;
type Endpoint = { method: string; pattern: RegExp; handle: Handler };
const endpoints: Endpoint[] = [];
function route(method: string, path: RegExp, handle: Handler) { endpoints.push({ method, pattern: path, handle }); }
route("GET", /^health$/, async () => json({ status: "ok", service: "bookstore" }));
route("GET", /^ready$/, async () => { await prisma.$queryRaw`SELECT 1`; return json({ status: "ready", database: "connected" }); });
route("POST", /^auth\/register$/, async (request) => {
  await rateLimit("register", clientIdentifier(request), 20, 3600);
  const input = await jsonBody(request, schema.registerSchema);
  requireCondition(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32, 503, "Server chưa cấu hình AUTH_SECRET.");
  const user = await prisma.user.create({ data: { fullName: input.username, email: input.email, passwordHash: await hashPassword(input.password), role: 0 } });
  return json(await issueSession(user), 201);
});
route("POST", /^auth\/login$/, async (request) => {
  await rateLimit("login-global", clientIdentifier(request), 100);
  const input = await jsonBody(request, schema.loginSchema);
  await rateLimit("login-email", input.email, 10, 300);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`);
  requireCondition(user && valid, 401, "Email hoặc mật khẩu không đúng.");
  return json(await issueSession(user));
});
route("GET", /^auth\/me$/, async (request) => json(publicUser((await requireUser(request)).user)));
route("POST", /^auth\/logout$/, async (request) => { const identity = await requireUser(request); await prisma.session.update({ where: { id: identity.sessionId }, data: { revokedAt: new Date() } }); return empty(); });
route("PATCH", /^users\/me$/, async (request) => {
  const { user } = await requireUser(request);
  const { username, ...body } = await jsonBody(request, schema.profileSchema);
  return json(await transaction(async (tx) => { await assertImage(body.avatarUrl, user.id, "avatars", tx); return publicUser(await tx.user.update({ where: { id: user.id }, data: { ...body, fullName: username } })); }));
});

route("GET", /^category-parents$/, async () => json(await catalog.listParents()));
route("POST", /^category-parents$/, async (request) => { const { user } = await requireAdmin(request); return json(await catalog.saveParent(await jsonBody(request, schema.parentSchema), user.id), 201); });
route("GET", /^category-parents\/(\d+)$/, async (_request, match) => { const row = await prisma.categoryParent.findUnique({ where: { id: numericId(match[1]) } }); requireCondition(row, 404, "Không tìm thấy nhóm sách."); return json(publicParent(row)); });
route("PATCH", /^category-parents\/(\d+)$/, async (request, match) => { const { user } = await requireAdmin(request); return json(await catalog.saveParent(await jsonBody(request, schema.parentSchema.partial()), user.id, numericId(match[1]))); });
route("DELETE", /^category-parents\/(\d+)$/, async (request, match) => { await requireAdmin(request); await prisma.categoryParent.delete({ where: { id: numericId(match[1]) } }); return empty(); });
route("GET", /^categories$/, async (_request, _match, query) => json(await catalog.listCategories(query.get("parentId") ?? undefined)));
route("POST", /^categories$/, async (request) => { const { user } = await requireAdmin(request); return json(await catalog.saveCategory(await jsonBody(request, schema.categorySchema), user.id), 201); });
route("GET", /^categories\/(\d+)$/, async (_request, match) => { const row = await prisma.category.findUnique({ where: { id: numericId(match[1]) }, include: { parent: true } }); requireCondition(row, 404, "Không tìm thấy danh mục."); return json(publicCategory(row)); });
route("PATCH", /^categories\/(\d+)$/, async (request, match) => { const { user } = await requireAdmin(request); return json(await catalog.saveCategory(await jsonBody(request, schema.categorySchema.partial()), user.id, numericId(match[1]))); });
route("DELETE", /^categories\/(\d+)$/, async (request, match) => { await requireAdmin(request); await prisma.category.delete({ where: { id: numericId(match[1]) } }); return empty(); });
route("GET", /^products$/, async (request, _match, query) => json(await catalog.listBooks(query, (await authenticate(request, true))?.user.role === 1)));
route("POST", /^products$/, async (request) => { const { user } = await requireAdmin(request); return json(await catalog.saveBook(await jsonBody(request, schema.productSchema), user.id), 201); });
route("GET", /^products\/(\d+)$/, async (request, match) => json(await catalog.getBook(numericId(match[1]), (await authenticate(request, true))?.user.role === 1)));
route("PATCH", /^products\/(\d+)$/, async (request, match) => { const { user } = await requireAdmin(request); return json(await catalog.saveBook(await jsonBody(request, schema.productSchema.partial()), user.id, numericId(match[1]))); });
route("DELETE", /^products\/(\d+)$/, async (request, match) => { await requireAdmin(request); await catalog.hideBook(numericId(match[1])); return empty(); });
route("POST", /^admin\/products\/(\d+)\/stock-adjustments$/, async (request, match) => { const { user } = await requireAdmin(request); return json(await catalog.adjustStock(numericId(match[1]), user.id, await jsonBody(request, schema.stockSchema), request.headers.get("idempotency-key"))); });

route("POST", /^images\/(products|categories|avatars)$/, async (request, match) => {
  const { user } = match[1] === "avatars" ? await requireUser(request) : await requireAdmin(request);
  await rateLimit("upload", String(user.id), 20);
  requireCondition(request.headers.get("content-type")?.startsWith("multipart/form-data;"), 400, "Yêu cầu multipart/form-data.");
  const bytes = await readBytes(request, imageLimit + 16_384);
  let form: FormData;
  try { form = await new Response(bytes.buffer as ArrayBuffer, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new HttpError(400, "Dữ liệu upload không hợp lệ."); }
  const file = form.get("file");
  requireCondition(file instanceof File && [...form.keys()].length === 1, 400, "Chỉ nhận một file ở trường file.");
  return json(await saveImage(match[1], new Uint8Array(await file.arrayBuffer()), user.id), 201);
});
route("POST", /^images\/products\/import$/, async (request) => {
  const { user } = await requireAdmin(request);
  await rateLimit("image-import", String(user.id), 10);
  const { url } = await jsonBody(request, z.object({ url: z.url().max(2048) }).strict());
  return json(await saveImage("products", await downloadImage(url), user.id, url), 201);
});

route("GET", /^orders\/cart$/, async (request) => json(await orders.getCart((await requireUser(request)).user.id)));
route("DELETE", /^orders\/cart$/, async (request) => { await orders.changeCart((await requireUser(request)).user.id, "clear"); return empty(); });
route("POST", /^orders\/cart\/items$/, async (request) => json(await orders.changeCart((await requireUser(request)).user.id, "add", await jsonBody(request, schema.addCartSchema))));
route("PATCH", /^orders\/cart\/items\/(\d+)$/, async (request, match) => { const { quantity } = await jsonBody(request, schema.quantitySchema); return json(await orders.changeCart((await requireUser(request)).user.id, "update", { quantity, productId: "1" }, numericId(match[1]))); });
route("DELETE", /^orders\/cart\/items\/(\d+)$/, async (request, match) => json(await orders.changeCart((await requireUser(request)).user.id, "remove", undefined, numericId(match[1]))));
route("POST", /^orders\/checkout$/, async (request) => json(await orders.checkout((await requireUser(request)).user, await jsonBody(request, schema.checkoutSchema), request.headers.get("idempotency-key")), 201));
route("GET", /^orders$/, async (request) => json(await orders.orderHistory((await requireUser(request)).user.id)));
route("GET", /^orders\/(\d+)$/, async (request, match) => json(await orders.orderDetail(numericId(match[1]), (await requireUser(request)).user.id)));
route("POST", /^orders\/(\d+)\/cancel$/, async (request, match) => json(await orders.changeOrderStatus(numericId(match[1]), (await requireUser(request)).user, { status: "Cancelled" })));
route("GET", /^admin\/orders$/, async (request, _match, query) => { await requireAdmin(request); return json(await orders.adminOrders(query)); });
route("GET", /^admin\/orders\/(\d+)$/, async (request, match) => json(await orders.orderDetail(numericId(match[1]), (await requireAdmin(request)).user.id, true)));
route("PATCH", /^admin\/orders\/(\d+)\/status$/, async (request, match) => json(await orders.changeOrderStatus(numericId(match[1]), (await requireAdmin(request)).user, await jsonBody(request, schema.orderStatusSchema), true)));

route("GET", /^products\/(\d+)\/reviews$/, async (_request, match) => json(await support.bookReviews(numericId(match[1]))));
route("POST", /^products\/(\d+)\/reviews$/, async (request, match) => { const { user } = await requireUser(request); await rateLimit("review", String(user.id), 10); return json(await support.createReview(numericId(match[1]), user.id, await jsonBody(request, schema.reviewSchema)), 201); });
route("GET", /^admin\/reviews$/, async (request) => { await requireAdmin(request); return json(await support.adminReviews()); });
route("DELETE", /^admin\/reviews\/(\d+)$/, async (request, match) => { await requireAdmin(request); await prisma.review.delete({ where: { id: numericId(match[1]) } }); return empty(); });
route("GET", /^consultation\/options$/, async () => json(await customer.consultationOptions()));
route("GET", /^consultation\/recommendations$/, async (_request, _match, query) => json(await customer.recommend(query)));
route("GET", /^admin\/consultation\/products$/, async (request) => { await requireAdmin(request); return json(await customer.listConsultation()); });
route("POST", /^admin\/consultation\/products$/, async (request) => { await requireAdmin(request); return json(await customer.saveConsultation(await jsonBody(request, schema.consultationSchema)), 201); });
route("PATCH", /^admin\/consultation\/products\/(\d+)$/, async (request, match) => { await requireAdmin(request); return json(await customer.saveConsultation(await jsonBody(request, schema.consultationSchema.partial()), numericId(match[1]))); });
route("GET", /^returns\/eligible-items$/, async (request) => json(await customer.eligibleReturns((await requireUser(request)).user.id)));
route("GET", /^returns$/, async (request) => json(await customer.listReturns((await requireUser(request)).user.id)));
route("GET", /^returns\/(\d+)$/, async (request, match) => json(await customer.getReturn(numericId(match[1]), (await requireUser(request)).user.id)));
route("POST", /^returns$/, async (request) => { const { user } = await requireUser(request); await rateLimit("returns", String(user.id), 10); return json(await customer.createReturn(user.id, await jsonBody(request, schema.returnSchema)), 201); });
route("GET", /^admin\/returns$/, async (request) => { await requireAdmin(request); return json(await customer.listReturns()); });
route("GET", /^admin\/returns\/(\d+)$/, async (request, match) => { await requireAdmin(request); return json(await customer.getReturn(numericId(match[1]))); });
route("PATCH", /^admin\/returns\/(\d+)\/status$/, async (request, match) => json(await customer.updateReturn(numericId(match[1]), (await requireAdmin(request)).user.id, await jsonBody(request, schema.returnStatusSchema))));
route("GET", /^chatbot\/config$/, async () => json(await support.aiConfig(true)));
route("POST", /^chatbot\/messages$/, async (request) => {
  const identity = await authenticate(request, true);
  await rateLimit("chat", identity ? String(identity.user.id) : clientIdentifier(request), 20);
  const result = await support.sendChat(request, identity?.user ?? null, await jsonBody(request, schema.chatSchema));
  const response = json(result.reply); response.headers.set("Set-Cookie", result.cookie); return response;
});
route("GET", /^admin\/chatbot\/config$/, async (request) => { await requireAdmin(request); return json(await support.aiConfig()); });
route("PATCH", /^admin\/chatbot\/config$/, async (request) => { await requireAdmin(request); return json(await support.updateAiConfig(await jsonBody(request, schema.aiConfigSchema))); });
route("GET", /^admin\/chatbot\/logs$/, async (request) => { await requireAdmin(request); return json(await support.chatLogs()); });
route("PATCH", /^admin\/chatbot\/logs\/(\d+)$/, async (request, match) => { await requireAdmin(request); return json(await support.updateChatLog(numericId(match[1]), await jsonBody(request, schema.chatLogSchema))); });
route("GET", /^admin\/reports\/revenue$/, async (request, _match, query) => { await requireAdmin(request); return json(await support.revenueReport(query)); });

export const endpointInventory = endpoints.map(({ method, pattern }) => ({ method, pattern: pattern.source }));
export async function dispatch(request: Request, path: string[]) {
  try {
    requireCondition(path.every((part) => !/[\/\\\x00]/.test(part)), 400, "Đường dẫn không hợp lệ.");
    const resource = path.join("/");
    const matches = endpoints.filter((endpoint) => endpoint.pattern.test(resource));
    requireCondition(matches.length, 404, "Endpoint không tồn tại.");
    const endpoint = matches.find((entry) => entry.method === request.method);
    if (!endpoint) { const response = errorResponse(new HttpError(405, "Phương thức không được hỗ trợ.")); response.headers.set("Allow", matches.map((entry) => entry.method).join(", ")); return response; }
    return await endpoint.handle(request, resource.match(endpoint.pattern)!, new URL(request.url).searchParams);
  } catch (error) { return errorResponse(error); }
}
