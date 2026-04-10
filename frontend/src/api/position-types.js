import { apiRequest } from "./client";

export function listPositionTypes(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/position-types${qs ? `?${qs}` : ""}`, { token });
}