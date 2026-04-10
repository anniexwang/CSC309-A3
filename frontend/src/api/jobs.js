import { apiRequest } from "./client";

export function getJobs(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/jobs${qs ? `?${qs}` : ""}`, { token });
}

export function getJobById(token, jobId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/jobs/${jobId}${qs ? `?${qs}` : ""}`, { token });
}

export function setJobInterest(token, jobId, interested) {
  return apiRequest(`/jobs/${jobId}/interested`, {
    method: "PATCH",
    token,
    data: { interested },
  });
}

export function getPositionTypes(token) {
  return apiRequest("/position-types", { token });
}

export function getBusinesses(token) {
  return apiRequest("/businesses", { token });
}

export function getMyQualifications(token) {
  return apiRequest("/users/me/qualifications", { token });
}

export function getMyInvitations(token, params = { limit: 200 }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/users/me/invitations${qs ? `?${qs}` : ""}`, { token });
}

export function getMyJobHistory(
  token,
  params = { upcoming_page: 1, upcoming_limit: 10, history_page: 1, history_limit: 10 }
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/users/me/history${qs ? `?${qs}` : ""}`, { token });
}

export function getMyInterests(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/users/me/interests?${qs ? `${qs}` : "limit=200"}`, { token });
}
