import { z } from "zod";
import { validISBN } from "@/lib/utils/books";

const name = z.string().trim().min(1).max(150);
const description = z.string().trim().max(10_000).nullable().optional();
export const idString = z.string().regex(/^[1-9]\d*$/).refine((value) => Number(value) <= 2_147_483_647);
export const moneyString = z.string().regex(/^[1-9]\d{0,11}$/);
export const phone = z.string().transform((value) => value.replace(/[\s.-]/g, "")).pipe(z.string().regex(/^(0\d{9}|\+84\d{9})$/));
export const imageString = z.string().trim().max(2048).nullable().optional();
const email = z.email().max(254).transform((value) => value.toLowerCase());
export const registerSchema = z.object({ username: name, email, password: z.string().min(8).max(128) }).strict();
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const profileSchema = z.object({ username: name.optional(), avatarUrl: imageString, phoneNumber: phone.nullable().optional(), address: z.string().trim().max(2000).nullable().optional() }).strict();
export const parentSchema = z.object({ name, description, imageUrl: imageString }).strict();
export const categorySchema = parentSchema.extend({ parentId: idString }).strict();
export const productSchema = z.object({
  name: z.string().trim().min(1).max(255), categoryId: idString,
  price: moneyString, originalPrice: moneyString.optional(), discount: z.number().min(0).lt(100).multipleOf(0.01).optional(),
  description, imageUrl: imageString, author: z.string().trim().min(1).max(255),
  publisher: z.string().trim().max(255).nullable().optional(),
  isbn: z.string().trim().transform((value) => value.replace(/[-\s]/g, "").toUpperCase()).refine((value) => value === "" || validISBN(value)).nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(), publicationYear: z.number().int().min(1).max(9999).nullable().optional(),
  language: z.string().trim().max(100).nullable().optional(), coverType: z.string().trim().max(100).nullable().optional(), isActive: z.boolean().optional(),
}).strict();
export const stockSchema = z.object({ delta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0), reason: z.string().trim().min(1).max(1000) }).strict();
export const quantitySchema = z.object({ quantity: z.number().int().min(1).max(999) }).strict();
export const addCartSchema = quantitySchema.extend({ productId: idString }).strict();
export const checkoutSchema = z.object({ shippingName: name, shippingPhone: phone, shippingAddress: z.string().trim().min(5).max(2000), paymentMethod: z.literal("COD") }).strict();
export const orderStatusSchema = z.object({ status: z.enum(["Processing", "Preparing", "Shipping", "Done", "Cancelled"]), paymentCollected: z.boolean().optional(), note: z.string().trim().max(2000).optional() }).strict();
export const reviewSchema = z.object({ Rating: z.number().int().min(1).max(5), Comment: z.string().trim().max(2000).nullable().optional() }).strict();
export const usages = z.enum(["learning", "relaxation", "discovery"]);
export const components = z.enum(["literature", "business", "selfhelp", "children", "manga", "education", "language", "history"]);
export const consultationSchema = z.object({ bookId: idString, component: components, usages: z.array(usages).min(1).max(3), specs: z.array(z.string().trim().min(1).max(300)).max(10), reasons: z.partialRecord(usages, z.string().trim().max(1000)), isActive: z.boolean() }).strict();
export const returnSchema = z.object({ productId: idString, quantity: z.number().int().min(1).max(999).default(1), contactName: name, phone, description: z.string().trim().min(5).max(3000) }).strict();
export const returnStatusSchema = z.object({ status: z.enum(["received", "checking", "repairing", "completed", "rejected"]), note: z.string().trim().min(1).max(2000), resolution: z.enum(["exchange", "refund"]).optional(), restockQuantity: z.number().int().min(0).max(999).optional(), replacementBookId: idString.optional(), refundConfirmed: z.boolean().optional() }).strict();
export const chatSchema = z.object({ sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/), message: z.string().trim().min(1).max(2000) }).strict();
export const aiConfigSchema = z.object({ enabled: z.boolean(), botName: z.string().trim().min(1).max(80), welcomeMessage: z.string().trim().min(1).max(1000), fallbackMessage: z.string().trim().min(1).max(1000), systemPrompt: z.string().trim().min(1).max(6000), model: z.string().trim().min(1).max(100), temperature: z.number().min(0).max(2), maxSuggestions: z.number().int().min(1).max(5), supportContact: z.string().trim().min(1).max(254) }).strict();
export const chatLogSchema = z.object({ resolved: z.boolean(), adminNote: z.string().trim().max(2000) }).strict();
