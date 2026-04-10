import { apiRequest } from "./client";

export const ADMIN_NOTIFICATIONS_LAST_SEEN_KEY = "admin_notifications_last_seen";
const ADMIN_LIVE_NOTIFICATIONS_KEY = "admin_live_notifications";
const ADMIN_DISMISSED_NOTIFICATIONS_KEY = "admin_dismissed_notifications";
const MAX_LIVE_NOTIFICATIONS = 50;
const REVIEWABLE_STATUSES = new Set(["created", "submitted", "revised"]);
const TRACKED_STATUSES = new Set(["created", "submitted", "revised", "approved", "rejected"]);
const LIVE_EVENT_TYPES = new Set(["qualification-needs-review", "qualification-updated"]);

function normalizeDate(value) {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : new Date(value).toISOString();
}

function sortByUpdatedAtDesc(items) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    map.set(item.id, item);
  });
  return sortByUpdatedAtDesc([...map.values()]);
}

function getStatusPriority(status) {
  return REVIEWABLE_STATUSES.has(status) ? 0 : 1;
}

function sortAdminNotifications(items) {
  return [...items].sort((a, b) => {
    const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function readStoredAdminLiveNotifications() {
  try {
    const raw = localStorage.getItem(ADMIN_LIVE_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && LIVE_EVENT_TYPES.has(item.type));
  } catch {
    return [];
  }
}

function writeStoredAdminLiveNotifications(notifications) {
  try {
    localStorage.setItem(
      ADMIN_LIVE_NOTIFICATIONS_KEY,
      JSON.stringify(sortByUpdatedAtDesc(notifications).slice(0, MAX_LIVE_NOTIFICATIONS))
    );
  } catch {
    // ignore storage failures
  }
}

function readDismissedAdminNotificationIds() {
  try {
    const raw = localStorage.getItem(ADMIN_DISMISSED_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeDismissedAdminNotificationIds(ids) {
  try {
    localStorage.setItem(
      ADMIN_DISMISSED_NOTIFICATIONS_KEY,
      JSON.stringify([...new Set(ids)].slice(-500))
    );
  } catch {
    // ignore storage failures
  }
}

function toAdminNotificationFromQualification(qualification) {
  const status = qualification?.status || "";
  if (!TRACKED_STATUSES.has(status)) return null;

  const candidateName = `${qualification?.user?.first_name || ""} ${qualification?.user?.last_name || ""}`.trim();
  const positionTypeName = qualification?.position_type?.name || "";
  const updatedAt = normalizeDate(qualification?.updatedAt);
  const reviewable = REVIEWABLE_STATUSES.has(status);

  return {
    id: `admin-qualification:${qualification.id}:${status}:${updatedAt}`,
    scope: "admin-bell",
    type: reviewable ? "qualification-needs-review" : "qualification-updated",
    qualificationId: qualification.id,
    candidateName,
    positionTypeName,
    status,
    message: reviewable
      ? `${candidateName || "A candidate"} has a ${positionTypeName || "qualification"} ready for review.`
      : `${candidateName || "A candidate"}'s ${positionTypeName || "qualification"} status is now ${status}.`,
    updatedAt,
    href: `/admin/qualifications/${qualification.id}`,
  };
}

function normalizeAdminEvent(event) {
  if (!shouldRefreshAdminNotificationsForEvent(event)) return null;

  const updatedAt = normalizeDate(event.updatedAt || event.createdAt);
  return {
    id:
      event.id ||
      `admin-event:${event.type}:${event.qualificationId || "unknown"}:${event.status || "update"}:${updatedAt}`,
    scope: "admin-bell",
    type: event.type,
    qualificationId: event.qualificationId,
    candidateName: event.candidateName || "",
    positionTypeName: event.positionTypeName || "",
    status: event.status || "",
    message: event.message || "Admin notification update.",
    updatedAt,
    href: event.qualificationId ? `/admin/qualifications/${event.qualificationId}` : "/admin/qualifications",
  };
}

export async function getAdminNotifications(token) {
  const data = await apiRequest("/qualifications?page=1&limit=500", { token });
  const serverNotifications = (data.results || [])
    .map((qualification) => toAdminNotificationFromQualification(qualification))
    .filter(Boolean);
  const liveNotifications = readStoredAdminLiveNotifications();
  const dismissedIds = new Set(readDismissedAdminNotificationIds());

  return sortAdminNotifications(
    dedupeById([...serverNotifications, ...liveNotifications]).filter(
      (notification) => !dismissedIds.has(notification.id)
    )
  );
}

export function shouldRefreshAdminNotificationsForEvent(event) {
  return (
    !!event &&
    event.scope === "admin-bell" &&
    LIVE_EVENT_TYPES.has(event.type)
  );
}

export function storeAdminNotificationEvent(event) {
  const normalized = normalizeAdminEvent(event);
  if (!normalized) return null;

  const next = dedupeById([normalized, ...readStoredAdminLiveNotifications()]);
  writeStoredAdminLiveNotifications(next);
  return normalized;
}

export function clearAdminNotifications(notifications = []) {
  const idsToDismiss = notifications
    .map((notification) => notification?.id)
    .filter(Boolean);

  if (idsToDismiss.length > 0) {
    writeDismissedAdminNotificationIds([
      ...readDismissedAdminNotificationIds(),
      ...idsToDismiss,
    ]);
  }

  writeStoredAdminLiveNotifications([]);
  return markAdminNotificationsSeen();
}

export function getAdminNotificationsLastSeen() {
  try {
    return localStorage.getItem(ADMIN_NOTIFICATIONS_LAST_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function markAdminNotificationsSeen(timestamp = new Date().toISOString()) {
  try {
    localStorage.setItem(ADMIN_NOTIFICATIONS_LAST_SEEN_KEY, timestamp);
  } catch {
    // ignore storage failures
  }
  return timestamp;
}

export function countUnreadAdminNotifications(notifications, lastSeenAt) {
  if (!lastSeenAt) return notifications.length;
  const lastSeen = new Date(lastSeenAt).getTime();
  return notifications.filter((item) => new Date(item.updatedAt).getTime() > lastSeen).length;
}
