import { apiRequest } from "./client";

export function login(email, password) {
  return apiRequest("/auth/tokens", {
    method: "POST",
    data: { email, password },
  });
}

export function requestReset(email) {
  return apiRequest("/auth/resets", {
    method: "POST",
    data: { email },
  });
}

export function completeReset(resetToken, email, password) {
  return apiRequest(`/auth/resets/${resetToken}`, {
    method: "POST",
    data: { email, password },
  });
}
