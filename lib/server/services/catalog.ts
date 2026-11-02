import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertImage } from "../assets";
import { catalogInclude, publicBook, publicCategory, publicParent } from "../serializers";
import { numericId, pageResult, pagination, requireCondition, transaction, digest } from "../http";
import { categorySchema, parentSchema, productSchema, stockSchema } from "../validators";
import { listPrice } from "@/lib/utils/books";

export const normalizeSearch = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
export async function listParents() { return (await prisma.categoryParent.findMany({ orderBy: { name: "asc" } })).map(publicParent); }
export async function listCategories(parentId?: string) {
  return (await prisma.category.findMany({ where: parentId ? { parentId: numericId(parentId) } : {}, include: { parent: true }, orderBy: { name: "asc" } })).map(publicCategory);
}
export async function listBooks(query: URLSearchParams, admin = false) {
  const { page, pageSize, skip } = pagination(query);
  const includeInactive = query.get("includeInactive");
  requireCondition(!includeInactive || includeInactive === "1" || includeInactive === "0", 400, "includeInactive phải là 0 hoặc 1.");
  requireCondition(includeInactive !== "1" || admin, 403, "Chỉ admin được xem sách ẩn.");
  const where: Prisma.BookWhereInput = {
    ...(includeInactive === "1" ? {} : { isActive: true }),
    ...(query.get("categoryId") ? { categoryId: numericId(query.get("categoryId")!) } : {}),
    ...(query.get("parentId") ? { category: { parentId: numericId(query.get("parentId")!) } } : {}),
  };
  const search = z.string().max(200).parse(query.get("search") ?? "").trim();
  if (search) {
    // PostgreSQL parameterized query keeps accent-insensitive search available without extensions.
    const pattern = `%${normalizeSearch(search).replace(/[\\%_]/g, "\\$&")}%`;
    const matches = await prisma.$queryRaw<{ id: number }[]>`
      SELECT "BookID" AS id FROM "Books"
      WHERE translate(lower("Title" || ' ' || "Author" || ' ' || COALESCE("Description", '') || ' ' || COALESCE("ISBN", '')),
      'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd') LIKE ${pattern}`;
    where.id = { in: matches.map((row) => row.id) };
  }
  const [books, count] = await prisma.$transaction([
    prisma.book.findMany({ where, include: catalogInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take: pageSize }),
    prisma.book.count({ where }),
  ]);
  return pageResult(books.map(publicBook), count, page, pageSize);
}
export async function getBook(id: number, admin = false) {
  const book = await prisma.book.findFirst({ where: { id, ...(admin ? {} : { isActive: true }) }, include: catalogInclude });
  requireCondition(book, 404, "Không tìm thấy sách.");
  return publicBook(book);
}
export async function saveParent(body: z.infer<typeof parentSchema> | z.infer<ReturnType<typeof parentSchema.partial>>, actorId: number, id?: number) {
  return transaction(async (tx) => {
    await assertImage(body.imageUrl, actorId, "categories", tx);
    const parent = id ? await tx.categoryParent.update({ where: { id }, data: body }) : await tx.categoryParent.create({ data: parentSchema.parse(body) });
    return publicParent(parent);
  });
}
export async function saveCategory(body: z.infer<ReturnType<typeof categorySchema.partial>>, actorId: number, id?: number) {
  const input = id ? body : categorySchema.parse(body);
  return transaction(async (tx) => {
    await assertImage(input.imageUrl, actorId, "categories", tx);
    const { parentId, ...fields } = input;
    const data = { ...fields, ...(parentId ? { parentId: numericId(parentId) } : {}) };
    if (parentId) requireCondition(await tx.categoryParent.findUnique({ where: { id: numericId(parentId) } }), 400, "Nhóm sách không tồn tại.");
    const category = id ? await tx.category.update({ where: { id }, data, include: { parent: true } }) : await tx.category.create({ data: { ...data, name: input.name! }, include: { parent: true } });
    return publicCategory(category);
  });
}
export async function saveBook(body: z.infer<ReturnType<typeof productSchema.partial>>, actorId: number, id?: number) {
  const input = id ? body : productSchema.parse(body);
  return transaction(async (tx) => {
    const existing = id ? await tx.book.findUnique({ where: { id } }) : null;
    if (id) requireCondition(existing, 404, "Không tìm thấy sách.");
    await assertImage(input.imageUrl, actorId, "products", tx);
    if (input.categoryId) requireCondition(await tx.category.findUnique({ where: { id: numericId(input.categoryId) } }), 400, "Danh mục không tồn tại.");
    const price = new Prisma.Decimal(input.price ?? existing!.sellingPrice);
    const original = new Prisma.Decimal(input.originalPrice ?? (input.discount !== undefined ? listPrice(price.toFixed(0), input.discount) ?? price : existing?.originalPrice ?? price));
    requireCondition(original.greaterThanOrEqualTo(price) && original.greaterThan(0), 400, "Giá gốc phải lớn hơn hoặc bằng giá bán.");
    const discount = original.sub(price).div(original).mul(100).toDecimalPlaces(2);
    const data = {
      title: input.name, description: input.description, author: input.author, publisher: input.publisher,
      isbn: input.isbn === "" ? null : input.isbn, pageCount: input.pageCount, publicationYear: input.publicationYear,
      language: input.language, coverType: input.coverType, coverImage: input.imageUrl === "" ? null : input.imageUrl, isActive: input.isActive,
      ...(input.categoryId ? { categoryId: numericId(input.categoryId) } : {}), sellingPrice: price, originalPrice: original, discount,
    };
    const book = id ? await tx.book.update({ where: { id }, data, include: catalogInclude }) : await tx.book.create({ data: { ...data, title: input.name!, author: input.author!, categoryId: numericId(input.categoryId!) }, include: catalogInclude });
    return publicBook(book);
  });
}
export async function adjustStock(id: number, actorId: number, body: z.infer<typeof stockSchema>, key: string | null) {
  requireCondition(key && /^[\w-]{8,100}$/.test(key), 400, "Yêu cầu Idempotency-Key (8–100 ký tự).");
  const referenceKey = `adjust:${id}:${actorId}:${digest(key)}`;
  await transaction(async (tx) => {
    await tx.$queryRaw`SELECT "BookID" FROM "Books" WHERE "BookID" = ${id} FOR UPDATE`;
    const previous = await tx.inventoryMovement.findUnique({ where: { referenceKey } });
    if (previous) { requireCondition(previous.delta === body.delta && previous.reason === body.reason, 409, "Idempotency-Key đã được dùng với nội dung khác."); return; }
    const changed = await tx.book.updateMany({ where: { id, stockQuantity: { gte: Math.max(0, -body.delta), lte: Math.min(2_147_483_647, 2_147_483_647 - body.delta) } }, data: { stockQuantity: { increment: body.delta } } });
    requireCondition(changed.count, 409, "Sách không tồn tại hoặc tồn kho không hợp lệ.");
    await tx.inventoryMovement.create({ data: { bookId: id, delta: body.delta, reason: body.reason, referenceKey, actorId } });
  });
  return getBook(id, true);
}
export async function hideBook(id: number) { await prisma.book.update({ where: { id }, data: { isActive: false } }); }
