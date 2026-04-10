import { apiRequest } from "./client";

export function uploadQualificationDocument(token, file, qualificationId) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest(`/qualifications/${qualificationId}/document`, { method: "PUT", token, data: formData, isFormData: true });
}

export function createQualification(token, payload) {
  return apiRequest("/qualifications", {
    method: "POST",
    token,
    data: payload,
  });
}

export function updateQualification(token, payload, qualificationId) {
  return apiRequest(`/qualifications/${qualificationId}`, {
    method: "PATCH",
    token,
    data: payload,
  });
}

export function getQualificationById(token, qualificationId) {
  return apiRequest(`/qualifications/${qualificationId}`, { token });
}