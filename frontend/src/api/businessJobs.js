import { apiRequest } from "./client";

export function getMyJobs(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, String(v)));
      } else {
        query.set(key, String(value));
      }
    }
  });
  const qs = query.toString();
  return apiRequest(`/businesses/me/jobs${qs ? `?${qs}` : ""}`, { token });
}

export function createJob(token, data) {
  return apiRequest("/businesses/me/jobs", { method: "POST", token, data });
}

export function updateJob(token, jobId, data) {
  return apiRequest(`/businesses/me/jobs/${jobId}`, { method: "PATCH", token, data });
}

export function deleteJob(token, jobId) {
  return apiRequest(`/businesses/me/jobs/${jobId}`, { method: "DELETE", token });
}

export function getPositionTypes(token) {
  return apiRequest("/position-types", { token });
}
