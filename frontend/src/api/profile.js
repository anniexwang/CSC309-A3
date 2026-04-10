import { apiRequest } from "./client";

export function getMyProfile(token) {
  return apiRequest("/users/me", { token });
}

export function updateMyProfile(token, data) {
  return apiRequest("/users/me", { method: "PATCH", token, data });
}

export function uploadAvatar(token, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/users/me/avatar", { method: "PUT", token, data: formData, isFormData: true });
}

export function uploadResume(token, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/users/me/resume", { method: "PUT", token, data: formData, isFormData: true });
}

export function updateAvailability(token, available) {
  return apiRequest("/users/me/available", { method: "PATCH", token, data: { available } });
}
