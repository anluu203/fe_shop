import type { Prisma, User, Category, CategoryParent, Book, Order, OrderItem, OrderEvent, Review } from "@/generated/prisma/client";

export const catalogInclude = { category: { include: { parent: true } } } as const;
export const orderInclude = { user: true, items: { include: { book: true } }, events: { orderBy: { createdAt: "asc" as const } } } as const;
export const reviewInclude = { user: true, book: true } as const;
export type CatalogBook = Prisma.BookGetPayload<{ include: typeof catalogInclude }>;
export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
export const money = (value: Prisma.Decimal) => value.toFixed(0);
export function publicUser(user: User) {
  return { id: String(user.id), username: user.fullName, email: user.email, role: user.role === 1 ? "ADMIN" as const : "USER" as const, avatarUrl: user.avatarUrl, phoneNumber: user.phoneNumber, address: user.address, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() };
}
export function publicParent(parent: CategoryParent) {
  return { id: String(parent.id), seedKey: parent.seedKey, name: parent.name, description: parent.description, imageUrl: parent.imageUrl, createdAt: parent.createdAt.toISOString(), updatedAt: parent.updatedAt.toISOString() };
}
export function publicCategory(category: Category & { parent: CategoryParent | null }) {
  const parent = category.parent ? publicParent(category.parent) : { id: "", name: "Chưa phân nhóm", description: null, imageUrl: null, seedKey: null, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() };
  return { id: String(category.id), seedKey: category.seedKey, name: category.name, description: category.description, imageUrl: category.imageUrl, parentId: parent.id, parent, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() };
}
export function publicBook(book: CatalogBook) {
  return {
    id: String(book.id), seedKey: book.seedKey, name: book.title, description: book.description, imageUrl: book.coverImage,
    price: money(book.sellingPrice), originalPrice: money(book.originalPrice), discount: Number(book.discount), stockQuantity: book.stockQuantity,
    categoryId: String(book.categoryId), category: publicCategory(book.category), isActive: book.isActive,
    author: book.author, publisher: book.publisher ?? "", isbn: book.isbn ?? "", pageCount: book.pageCount, publicationYear: book.publicationYear,
    language: book.language ?? "", coverType: book.coverType ?? "", createdAt: book.createdAt.toISOString(), updatedAt: book.updatedAt.toISOString(),
  };
}
export const statusToDto = { PENDING: "Processing", PREPARING: "Preparing", SHIPPING: "Shipping", DELIVERED: "Done", CANCELLED: "Cancelled" } as const;
export const statusToDb = { Processing: "PENDING", Preparing: "PREPARING", Shipping: "SHIPPING", Done: "DELIVERED", Cancelled: "CANCELLED" } as const;
export function publicOrder(order: Order & { items: (OrderItem & { book: Book })[]; user?: User; events?: OrderEvent[] }, admin = false) {
  return {
    id: String(order.id), userId: String(order.userId), status: statusToDto[order.status], totalPrice: money(order.totalAmount),
    shippingName: order.shippingName, shippingPhone: order.shippingPhone, shippingAddress: order.shippingAddress, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
    completedAt: order.completedAt?.toISOString(), createdAt: order.orderDate.toISOString(), updatedAt: order.updatedAt.toISOString(),
    ...(admin && order.user ? { user: publicUser(order.user) } : {}),
    items: order.items.map((item) => ({ id: String(item.id), orderId: String(order.id), productId: String(item.bookId), quantity: item.quantity, unitPrice: money(item.unitPrice), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), product: { id: String(item.bookId), name: item.bookTitle, price: money(item.unitPrice), imageUrl: item.bookImage ?? item.book.coverImage, isActive: item.book.isActive } })),
    events: order.events?.map((event) => ({ status: statusToDto[event.status], note: event.note, createdAt: event.createdAt.toISOString() })),
  };
}
export function publicReview(review: Review & { user: User; book: Book }) {
  return { ReviewID: review.id, UserID: String(review.userId), BookID: String(review.bookId), Rating: review.rating, Comment: review.comment, CreatedAt: review.createdAt.toISOString(), user: { id: String(review.userId), username: review.user.fullName }, book: { id: String(review.bookId), name: review.book.title, imageUrl: review.book.coverImage } };
}
