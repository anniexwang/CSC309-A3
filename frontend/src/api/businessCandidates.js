import { apiRequest } from "./client";

export function getJobCandidates(token, jobId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/jobs/${jobId}/candidates${qs ? `?${qs}` : ""}`, { token });
}

export function getCandidateDetail(token, jobId, userId) {
  return apiRequest(`/jobs/${jobId}/candidates/${userId}`, { token });
}

export function setCandidateInterested(token, jobId, userId, interested) {
  return apiRequest(`/jobs/${jobId}/candidates/${userId}/interested`, {
    method: "PATCH",
    token,
    data: { interested },
  });
}

export function getJobInterests(token, jobId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/jobs/${jobId}/interests${qs ? `?${qs}` : ""}`, { token });
}

export function reportNoShow(token, jobId) {
  return apiRequest(`/jobs/${jobId}/no-show`, { method: "PATCH", token });
}
