import { apiRequest } from "./client";

export function geocodeAddress(token, address) {
  const query = new URLSearchParams({ address: String(address || "") });
  return apiRequest(`/system/geocode?${query.toString()}`, { token });
}

export function getNegotiationWindow(token) {
  return apiRequest("/system/negotiation-window", { token });
}

export function updateNegotiationWindow(token, negotiationWindowSeconds) {
  return apiRequest("/system/negotiation-window", {
    method: "PATCH",
    token,
    data: { negotiation_window: Number(negotiationWindowSeconds) },
  });
}
