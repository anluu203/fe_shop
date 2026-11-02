import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { digest, HttpError, requireCondition } from "./http";
import { publicUser } from "./serializers";

const scrypt = promisify(scryptCallback);
function signingKey() {
  const secret = process.env.AUTH_SECRET;
  requireCondition(secret && Buffer.byteLength(secret) >= 32, 503, "Server chưa cấu hình AUTH_SECRET (tối thiểu 32 ký tự).");
  return new TextEncoder().encode(secret);
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export async function issueSession(user: User) {
  const key = signingKey();
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const accessToken = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setJti(jti).setIssuer("bookstore").setAudience("bookstore-web").setIssuedAt().setExpirationTime(Math.floor(expiresAt.getTime() / 1000)).sign(key);
  await prisma.session.create({ data: { id: digest(jti), userId: user.id, expiresAt } });
  return { accessToken, user: publicUser(user) };
}
export type Identity = { user: User; sessionId: string };
export async function authenticate(request: Request, optional = false): Promise<Identity | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization && optional) return null;
  requireCondition(authorization && authorization.startsWith("Bearer "), 401, "Vui lòng đăng nhập.");
  let claims;
  try { claims = (await jwtVerify(authorization.slice(7), signingKey(), { algorithms: ["HS256"], issuer: "bookstore", audience: "bookstore-web" })).payload; }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."); }
  requireCondition(claims.jti && claims.sub && /^[1-9]\d*$/.test(claims.sub), 401, "Token không hợp lệ.");
  const session = await prisma.session.findUnique({ where: { id: digest(claims.jti) }, include: { user: true } });
  requireCondition(session && !session.revokedAt && session.expiresAt.getTime() > Date.now() && String(session.userId) === claims.sub, 401, "Phiên đăng nhập đã kết thúc.");
  return { user: session.user, sessionId: session.id };
}
export async function requireUser(request: Request) { return (await authenticate(request))!; }
export async function requireAdmin(request: Request) {
  const identity = await requireUser(request);
  requireCondition(identity.user.role === 1, 403, "Bạn không có quyền quản trị.");
  return identity;
}
