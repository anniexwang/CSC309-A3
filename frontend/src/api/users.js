import { apiRequest } from "./client";

export function registerRegularUser(payload) {
  return apiRequest("/users", {
    method: "POST",
    data: payload,
  });
}

export function listUsers(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/users${qs ? `?${qs}` : ""}`, { token });
}