import { apiRequest } from "./client";

export function getMyBusiness(token) {
  return apiRequest("/businesses/me", { token });
}

export function updateMyBusiness(token, data) {
  return apiRequest("/businesses/me", { method: "PATCH", token, data });
}

export function uploadBusinessAvatar(token, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/businesses/me/avatar", { method: "PUT", token, data: formData, isFormData: true });
}
