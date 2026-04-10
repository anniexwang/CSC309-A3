import { apiRequest } from "./client";

export function registerBusiness(payload) {
  return apiRequest("/businesses", {
    method: "POST",
    data: payload,
  });
}

export function listBusinesses(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/businesses${qs ? `?${qs}` : ""}`, { token });
}

export function getBusinessById(token, businessId) {
  return apiRequest(`/businesses/${businessId}`, { token });
}
