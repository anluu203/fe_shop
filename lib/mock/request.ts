import type {
  Order,
  OrderItem,
  Page,
  Product,
  ProductBody,
  User,
  Category,
  CategoryParent,
  Store,
} from "../types";
import { ORDER_STATUS_FLOW } from "../types";
import { hydrateReview, newestReviews } from "./reviews";
import {
  borrowingBooks,
  changeLoanStatus,
  createLoan,
  filteredLoans,
  updateBorrowingInventory,
} from "./borrowing";
import type { CreateLoanBody, LoanStatus } from "../types/borrowing";
import {
  hydrateCategory,
  hydrateProduct,
  publicUser,
  readMockState,
  writeMockState,
  type MockState,
} from "./store";

type Params = Record<string, string | number | undefined>;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

function paginate<T>(items: T[], params: Params): Page<T> {
  const pageNumber = Math.max(1, Math.floor(Number(params.page) || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.floor(Number(params.pageSize) || 20)),
  );
  const totalPages = Math.ceil(items.length / pageSize);
  return {
    items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    totalCount: items.length,
    pageNumber,
    pageSize,
    totalPages,
    hasPreviousPage: pageNumber > 1,
    hasNextPage: pageNumber < totalPages,
  };
}

function requireUser(state: MockState, token: string | null): User {
  const user = state.users.find((u) => token === `bookstore-demo:${u.id}`);
  if (!user) throw new Error("Vui lòng đăng nhập để tiếp tục.");
  return publicUser(user);
}
function requireAdmin(state: MockState, token: string | null) {
  const user = requireUser(state, token);
  if (user.role !== "ADMIN") throw new Error("Bạn không có quyền quản trị.");
  return user;
}
function positiveQuantity(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 999
  )
    throw new Error("Số lượng phải từ 1 đến 999.");
  return value;
}
function validateBook(
  state: MockState,
  book: Pick<
    ProductBody,
    "name" | "price" | "categoryId" | "publicationYear" | "pageCount"
  >,
) {
  if (!book.name?.trim() || book.name.length > 200)
    throw new Error("Tên sách cần từ 1–200 ký tự.");
  if (!/^\d{1,12}$/.test(book.price) || BigInt(book.price) <= BigInt(0))
    throw new Error("Giá sách phải là số nguyên dương, tối đa 12 chữ số.");
  if (!state.categories.some((c) => c.id === book.categoryId))
    throw new Error("Danh mục không tồn tại.");
  for (const value of [book.publicationYear, book.pageCount])
    if (value != null && (!Number.isSafeInteger(value) || value < 1))
      throw new Error("Năm xuất bản và số trang phải là số nguyên dương.");
}
function total(order: Order) {
  order.totalPrice = order.items
    .reduce(
      (sum, item) => sum + BigInt(item.unitPrice) * BigInt(item.quantity),
      BigInt(0),
    )
    .toString();
  order.updatedAt = now();
  return order;
}
function cartFor(state: MockState, userId: string): Order {
  const cart = state.orders.find(
    (o) => o.userId === userId && o.status === "AddingItem",
  ) ?? { id: null, userId, status: "AddingItem", totalPrice: "0", items: [] };
  cart.items = cart.items.map((item) => {
    const book = state.products.find((p) => p.id === item.productId);
    return book
      ? {
          ...item,
          unitPrice: book.price,
          product: {
            id: book.id,
            name: book.name,
            price: book.price,
            imageUrl: book.imageUrl,
            isActive: book.isActive,
          },
        }
      : { ...item, product: { ...item.product, isActive: false } };
  });
  return total(cart);
}

// Same endpoint contract as lib/api/*; no HTTP server is required in mock mode.
export async function mockRequest<T>(
  path: string,
  method = "GET",
  rawBody?: BodyInit | null,
  params: Params = {},
  token: string | null = null,
): Promise<T> {
  const state = readMockState();
  const body = (
    typeof rawBody === "string" ? JSON.parse(rawBody) : {}
  ) as Record<string, any>;
  const parts = path.split("/").filter(Boolean);
  const [resource, entityId, action, itemId] = parts;
  const commit = (value: unknown): T => {
    writeMockState(state);
    return structuredClone(value) as T;
  };
  const result = (value: unknown): T => structuredClone(value) as T;

  if (resource === "products" && entityId && action === "reviews" && !itemId) {
    const book = state.products.find((item) => item.id === entityId);
    if (!book || !book.isActive) throw new Error("Không tìm thấy sách.");
    if (method === "GET")
      return result(newestReviews(state.reviews.filter((review) => review.BookID === entityId))
        .map((review) => hydrateReview(state, review)));
    if (method === "POST") {
      const user = requireUser(state, token);
      if (!Number.isInteger(body.Rating) || body.Rating < 1 || body.Rating > 5)
        throw new Error("Vui lòng chọn số sao từ 1 đến 5.");
      if (body.Comment != null && typeof body.Comment !== "string")
        throw new Error("Nội dung đánh giá không hợp lệ.");
      if (typeof body.Comment === "string" && body.Comment.length > 2000)
        throw new Error("Nội dung đánh giá tối đa 2.000 ký tự.");
      const review = {
        ReviewID: state.nextReviewId++,
        UserID: user.id,
        BookID: book.id,
        Rating: body.Rating as number,
        Comment: typeof body.Comment === "string" ? body.Comment.trim() || null : null,
        CreatedAt: now(),
      };
      state.reviews.push(review);
      return commit(hydrateReview(state, review));
    }
    throw new Error("Thao tác đánh giá không được hỗ trợ.");
  }
  if (resource === "admin" && entityId === "reviews") {
    requireAdmin(state, token);
    if (method === "GET" && !action)
      return result(newestReviews(state.reviews).map((review) => hydrateReview(state, review)));
    if (method === "DELETE" && action && !itemId) {
      const index = state.reviews.findIndex((review) => String(review.ReviewID) === action);
      if (index < 0) throw new Error("Đánh giá không còn tồn tại.");
      state.reviews.splice(index, 1);
      return commit(undefined);
    }
    throw new Error("Thao tác quản lý đánh giá không được hỗ trợ.");
  }

  if (resource === "borrowing") {
    if (entityId === "books" && method === "GET") {
      const search = normalize(String(params.search ?? ""));
      return result(
        borrowingBooks(state).filter(
          (book) =>
            !search ||
            normalize(`${book.name} ${book.author}`).includes(search),
        ),
      );
    }
    const user = requireUser(state, token);
    if (entityId === "loans" && method === "GET" && !action)
      return result(
        filteredLoans(
          state.borrowing.loans.filter((loan) => loan.userId === user.id),
          params,
        ),
      );
    if (entityId === "loans" && method === "POST" && !action)
      return commit(createLoan(state, user, body as unknown as CreateLoanBody));
    if (
      entityId === "loans" &&
      method === "PATCH" &&
      action &&
      itemId === "cancel"
    )
      return commit(
        changeLoanStatus(state, user, action, "cancelled", "", true),
      );
    throw new Error("Thao tác mượn sách không được hỗ trợ.");
  }
  if (resource === "admin" && entityId === "borrowing") {
    const user = requireAdmin(state, token);
    if (action === "loans" && method === "GET" && !itemId)
      return result(filteredLoans(state.borrowing.loans, params));
    if (action === "inventory" && method === "GET" && !itemId)
      return result(borrowingBooks(state, true));
    if (action === "loans" && method === "PATCH" && itemId)
      return commit(
        changeLoanStatus(
          state,
          user,
          itemId,
          body.status as LoanStatus,
          body.note,
        ),
      );
    if (action === "inventory" && method === "PATCH" && itemId)
      return commit(
        updateBorrowingInventory(
          state,
          itemId,
          body.totalCopies,
          body.borrowable,
        ),
      );
    throw new Error("Thao tác quản lý mượn sách không được hỗ trợ.");
  }

  if (
    resource === "auth" &&
    method === "POST" &&
    ["login", "register"].includes(entityId)
  ) {
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (entityId === "register") {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !body.username?.trim() ||
        typeof body.password !== "string" ||
        body.password.length < 6
      )
        throw new Error(
          "Vui lòng nhập tên, email hợp lệ và mật khẩu tối thiểu 6 ký tự.",
        );
      if (state.users.some((u) => u.email.toLowerCase() === email))
        throw new Error("Email này đã được đăng ký.");
      const user = {
        id: id("user"),
        username: body.username.trim(),
        email,
        password: body.password,
        role: "USER" as const,
        avatarUrl: null,
        createdAt: now(),
        updatedAt: now(),
      };
      state.users.push(user);
      return commit({
        accessToken: `bookstore-demo:${user.id}`,
        user: publicUser(user),
      });
    }
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email && u.password === body.password,
    );
    if (!user) throw new Error("Email hoặc mật khẩu không đúng.");
    return result({
      accessToken: `bookstore-demo:${user.id}`,
      user: publicUser(user),
    });
  }
  if (resource === "auth" && entityId === "me" && method === "GET")
    return result(requireUser(state, token));
  if (resource === "users" && entityId === "me" && method === "PATCH") {
    const user = requireUser(state, token);
    const stored = state.users.find((u) => u.id === user.id)!;
    if (body.username !== undefined) {
      if (!body.username.trim()) throw new Error("Tên không được để trống.");
      stored.username = body.username.trim();
    }
    if (body.avatarUrl !== undefined) stored.avatarUrl = body.avatarUrl;
    stored.updatedAt = now();
    return commit(publicUser(stored));
  }

  if (resource === "products") {
    const admin = state.users.some(
      (u) => u.role === "ADMIN" && token === `bookstore-demo:${u.id}`,
    );
    if (method === "GET") {
      const books = state.products
        .filter(
          (p) =>
            p.isActive ||
            (admin && (!!entityId || params.includeInactive === 1)),
        )
        .map((p) => hydrateProduct(state, p));
      if (entityId) {
        const book = books.find((p) => p.id === entityId);
        if (!book) throw new Error("Không tìm thấy sách.");
        return result(book);
      }
      const search = normalize(String(params.search ?? "").trim());
      return result(
        paginate(
          books.filter(
            (p) =>
              (!params.categoryId || p.categoryId === params.categoryId) &&
              (!params.parentId || p.category.parentId === params.parentId) &&
              (!search ||
                normalize(`${p.name} ${p.author ?? ""}`).includes(search)),
          ),
          params,
        ),
      );
    }
    requireAdmin(state, token);
    const index = state.products.findIndex((p) => p.id === entityId);
    if (method === "POST") {
      validateBook(state, body as ProductBody);
      const book = {
        ...body,
        id: id("book"),
        name: body.name.trim(),
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
      } as Product;
      state.products.unshift(book);
      return commit(hydrateProduct(state, book));
    }
    if (index < 0) throw new Error("Không tìm thấy sách.");
    if (method === "PATCH") {
      const allowed = [
        "name",
        "description",
        "imageUrl",
        "price",
        "categoryId",
        "author",
        "publisher",
        "publicationYear",
        "pageCount",
        "language",
        "coverType",
      ];
      const changes = Object.fromEntries(
        Object.entries(body).filter(([key]) => allowed.includes(key)),
      );
      const book = {
        ...state.products[index],
        ...changes,
        updatedAt: now(),
      } as Product;
      validateBook(state, book);
      state.products[index] = book;
      return commit(hydrateProduct(state, book));
    }
    if (method === "DELETE") {
      state.products[index].isActive = false;
      return commit(undefined);
    }
  }

  if (["category-parents", "categories", "stores"].includes(resource)) {
    const items =
      resource === "category-parents"
        ? state.parents
        : resource === "categories"
          ? state.categories
          : state.stores;
    const hydrate = (item: CategoryParent | Category | Store) =>
      resource === "categories"
        ? hydrateCategory(state, item as Category)
        : item;
    if (method === "GET") {
      if (entityId) {
        const item = items.find((i) => i.id === entityId);
        if (!item) throw new Error("Không tìm thấy dữ liệu.");
        return result(hydrate(item));
      }
      return result(
        items
          .filter(
            (i) =>
              resource !== "categories" ||
              !params.parentId ||
              (i as Category).parentId === params.parentId,
          )
          .map(hydrate),
      );
    }
    requireAdmin(state, token);
    const index = items.findIndex((i) => i.id === entityId);
    if (method !== "POST" && index < 0)
      throw new Error("Không tìm thấy dữ liệu.");
    if (method === "DELETE") {
      if (
        resource === "category-parents" &&
        state.categories.some((c) => c.parentId === entityId)
      )
        throw new Error("Hãy chuyển hoặc xóa các danh mục con trước.");
      if (
        resource === "categories" &&
        state.products.some((p) => p.categoryId === entityId)
      )
        throw new Error(
          "Danh mục còn sách. Hãy chuyển sách sang danh mục khác trước.",
        );
      items.splice(index, 1);
      return commit(undefined);
    }
    if (["POST", "PATCH"].includes(method)) {
      const allowed =
        resource === "categories"
          ? ["name", "description", "imageUrl", "parentId"]
          : resource === "stores"
            ? ["name", "description", "imageUrl", "address"]
            : ["name", "description", "imageUrl"];
      const changes = Object.fromEntries(
        Object.entries(body).filter(([key]) => allowed.includes(key)),
      );
      const item = {
        ...(method === "POST"
          ? {
              id: id(resource),
              createdAt: now(),
              description: "",
              imageUrl: null,
            }
          : items[index]),
        ...changes,
        updatedAt: now(),
      } as Category & Store;
      if (!item.name?.trim()) throw new Error("Tên không được để trống.");
      if (
        resource === "categories" &&
        !state.parents.some((p) => p.id === item.parentId)
      )
        throw new Error("Danh mục cha không tồn tại.");
      if (resource === "stores" && !item.address?.trim())
        throw new Error("Vui lòng nhập địa chỉ nhà sách.");
      if (method === "POST") items.push(item);
      else items[index] = item;
      return commit(hydrate(item));
    }
  }

  if (resource === "admin" && entityId === "orders") {
    requireAdmin(state, token);
    if (method === "GET")
      return result(
        paginate(
          state.orders
            .filter(
              (o) =>
                o.status !== "AddingItem" &&
                (!params.status || o.status === params.status),
            )
            .sort((a, b) =>
              (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
            )
            .map((o) => ({
              ...o,
              user: publicUser(state.users.find((u) => u.id === o.userId)!),
            })),
          params,
        ),
      );
    if (method === "PATCH" && itemId === "status") {
      const order = state.orders.find(
        (o) => o.id === action && o.status !== "AddingItem",
      );
      if (!order) throw new Error("Không tìm thấy đơn hàng.");
      const current = ORDER_STATUS_FLOW.indexOf(order.status);
      const next = ORDER_STATUS_FLOW.indexOf(body.status);
      if (next < current || next > current + 1 || next < 1)
        throw new Error(
          "Chỉ được giữ nguyên trạng thái hoặc chuyển sang bước tiếp theo.",
        );
      order.status = body.status;
      order.updatedAt = now();
      return commit({
        ...order,
        user: publicUser(state.users.find((u) => u.id === order.userId)!),
      });
    }
  }
  if (resource === "orders") {
    const user = requireUser(state, token);
    if (entityId === "cart" || entityId === "checkout") {
      const cart = cartFor(state, user.id);
      if (method === "GET") return result(cart);
      if (entityId === "checkout") {
        if (method !== "POST")
          throw new Error("Thao tác đặt hàng không hợp lệ.");
        if (!cart.items.length) throw new Error("Giỏ hàng đang trống.");
        if (cart.items.some((i) => !i.product.isActive))
          throw new Error(
            "Có sách ngừng bán trong giỏ hàng. Vui lòng xóa sách đó trước khi đặt hàng.",
          );
        cart.status = "Processing";
        cart.createdAt = now();
        total(cart);
        return commit(cart);
      }
      if (action === "items") {
        if (method === "POST") {
          const book = state.products.find(
            (p) => p.id === body.productId && p.isActive,
          );
          if (!book) throw new Error("Sách không tồn tại hoặc đã ngừng bán.");
          const quantity = positiveQuantity(body.quantity);
          if (!cart.id) {
            cart.id = id("cart");
            cart.createdAt = now();
            state.orders.push(cart);
          }
          const existing = cart.items.find((i) => i.productId === book.id);
          if (existing)
            existing.quantity = positiveQuantity(existing.quantity + quantity);
          else
            cart.items.push({
              id: id("item"),
              orderId: cart.id,
              productId: book.id,
              quantity,
              unitPrice: book.price,
              product: {
                id: book.id,
                name: book.name,
                price: book.price,
                imageUrl: book.imageUrl,
                isActive: book.isActive,
              },
              createdAt: now(),
              updatedAt: now(),
            } satisfies OrderItem);
        } else {
          const index = cart.items.findIndex((i) => i.id === itemId);
          if (index < 0) throw new Error("Không tìm thấy sách trong giỏ hàng.");
          if (method === "PATCH") {
            cart.items[index].quantity = positiveQuantity(body.quantity);
            cart.items[index].updatedAt = now();
          } else if (method === "DELETE") cart.items.splice(index, 1);
          else throw new Error("Thao tác không được hỗ trợ.");
        }
        return commit(total(cart));
      }
      if (method === "DELETE") {
        cart.items = [];
        return commit(total(cart));
      }
    }
    const orders = state.orders.filter(
      (o) =>
        o.status !== "AddingItem" &&
        (o.userId === user.id || user.role === "ADMIN"),
    );
    if (method === "GET") {
      if (!entityId)
        return result(
          orders
            .filter((o) => o.userId === user.id)
            .sort((a, b) =>
              (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
            ),
        );
      const order = orders.find((o) => o.id === entityId);
      if (!order) throw new Error("Không tìm thấy đơn hàng.");
      return result({
        ...order,
        ...(user.role === "ADMIN"
          ? {
              user: publicUser(state.users.find((u) => u.id === order.userId)!),
            }
          : {}),
      });
    }
  }
  throw new Error(`Mock chưa hỗ trợ ${method} ${path}.`);
}
