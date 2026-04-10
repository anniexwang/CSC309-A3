import { apiRequest } from "./client";

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function createNegotiation(token, interestId) {
  return apiRequest("/negotiations", {
    method: "POST",
    token,
    data: { interest_id: interestId },
  });
}

export function getNegotiations(token, params = {}) {
  return apiRequest(`/negotiations${buildQuery(params)}`, { token });
}

export function getNegotiationById(token, negotiationId) {
  return apiRequest(`/negotiations/${negotiationId}`, { token });
}

export function getActiveNegotiation(token) {
  return apiRequest("/negotiations/me", { token });
}

export function submitNegotiationDecision(token, negotiationId, decision) {
  return apiRequest(`/negotiations/${negotiationId}/decision`, {
    method: "PATCH",
    token,
    data: { decision },
  });
}
