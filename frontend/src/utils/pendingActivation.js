const STORAGE_KEY = "pending_activation";

export function savePendingActivation(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPendingActivation() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingActivation() {
  sessionStorage.removeItem(STORAGE_KEY);
}
