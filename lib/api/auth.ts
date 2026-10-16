import { api } from "./client";
import type { AuthResponse, LoginBody, RegisterBody, UpdateUserBody, User } from "../types";

export const authApi = {
  register: (body: RegisterBody) =>
    api.post<AuthResponse>("/auth/register", body),

  login: (body: LoginBody) => api.post<AuthResponse>("/auth/login", body),

  me: () => api.get<User>("/auth/me"),

  updateMe: (body: UpdateUserBody) => api.patch<User>("/users/me", body),

  /** Cập nhật avatar — gọi PATCH /users/me với { avatarUrl } */
  updateAvatar: (avatarUrl: string | null) =>
    api.patch<User>("/users/me", { avatarUrl }),
};
