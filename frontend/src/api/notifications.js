import { getMyInterests, getMyQualifications } from "./jobs";
import { getActiveNegotiation } from "./negotiations";

export const REGULAR_NOTIFICATIONS_LAST_SEEN_KEY = "regular_bell_notifications_last_seen";
export const NEGOTIATION_INBOX_UPDATED_EVENT = "negotiation-inbox:updated";
const REGULAR_NOTIFICATIONS_LAST_SEEN_KEY_PREFIX = "regular_bell_notifications_last_seen";
const REGULAR_LIVE_NOTIFICATIONS_KEY_PREFIX = "regular_bell_live_notifications";
const BUSINESS_NEGOTIATION_INBOX_KEY_PREFIX = "business_negotiation_inbox";
const REGULAR_NEGOTIATION_INBOX_KEY_PREFIX = "regular_negotiation_inbox";
const MAX_LIVE_NOTIFICATIONS = 50;
const LIVE_NOTIFICATION_TYPES = new Set(["negotiation-status"]);

const QUALIFICATION_NOTIFICATION_STATUSES = new Set(["approved", "rejected", "revised"]);
const JOB_STATUS_NOTIFICATIONS = new Set(["filled", "canceled", "completed", "expired"]);

function normalizeDate(value) {
  if (!value) return "";
  return typeof value === "string" ? value : new Date(value).toISOString();
}

function sortNotifications(notifications) {
  return [...notifications].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function dedupeNotifications(notifications) {
  const deduped = new Map();
  notifications.forEach((notification) => {
    deduped.set(notification.id, notification);
  });
  return sortNotifications([...deduped.values()]);
}

function buildJobHref(jobId) {
  return `/regular/jobs?jobId=${encodeURIComponent(jobId)}`;
}

function buildScopedStorageKey(prefix, accountId) {
  return `${prefix}:${accountId ?? "anonymous"}`;
}

function notifyNegotiationInboxUpdated(scope, accountId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NEGOTIATION_INBOX_UPDATED_EVENT, {
      detail: {
        scope,
        accountId: String(accountId ?? "anonymous"),
      },
    })
  );
}

function normalizeCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count);
}

function normalizeUnreadEntry(entry, type) {
  if (!entry || entry.negotiationId == null) return null;

  const baseEntry = {
    negotiationId: String(entry.negotiationId),
    unreadCount: normalizeCount(entry.unreadCount),
    previewText: entry.previewText || "",
    updatedAt: normalizeDate(entry.updatedAt),
  };

  if (type === "business") {
    return {
      ...baseEntry,
      counterpartName: entry.counterpartName || "",
    };
  }

  return {
    ...baseEntry,
    businessName: entry.businessName || "",
    positionTypeName: entry.positionTypeName || "",
  };
}

function pruneUnreadEntries(entries) {
  return sortNotifications(entries).slice(0, MAX_LIVE_NOTIFICATIONS);
}

function buildUnreadMap(entries, type) {
  return pruneUnreadEntries(entries)
    .map((entry) => normalizeUnreadEntry(entry, type))
    .filter(Boolean)
    .reduce((acc, entry) => {
      acc[String(entry.negotiationId)] = entry;
      return acc;
    }, {});
}

function sumUnreadCounts(byNegotiation) {
  return Object.values(byNegotiation).reduce(
    (total, entry) => total + normalizeCount(entry?.unreadCount),
    0
  );
}

function createBusinessNegotiationInboxState() {
  return {
    navLastSeenAt: "",
    navUnreadCount: 0,
    totalUnread: 0,
    byNegotiation: {},
  };
}

function createRegularNegotiationInboxState() {
  return {
    totalUnread: 0,
    byNegotiation: {},
  };
}

function normalizeBusinessNegotiationInboxState(value) {
  const entries = Object.values(value?.byNegotiation || {});
  const byNegotiation = buildUnreadMap(entries, "business");
  const totalUnread = sumUnreadCounts(byNegotiation);

  return {
    navLastSeenAt: typeof value?.navLastSeenAt === "string" ? value.navLastSeenAt : "",
    navUnreadCount: Math.min(normalizeCount(value?.navUnreadCount), totalUnread),
    totalUnread,
    byNegotiation,
  };
}

function normalizeRegularNegotiationInboxState(value) {
  const entries = Object.values(value?.byNegotiation || {});
  const byNegotiation = buildUnreadMap(entries, "regular");
  const totalUnread = sumUnreadCounts(byNegotiation);

  return {
    totalUnread,
    byNegotiation,
  };
}

function readStoredBusinessNegotiationInbox(accountId) {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(BUSINESS_NEGOTIATION_INBOX_KEY_PREFIX, accountId));
    if (!raw) return createBusinessNegotiationInboxState();
    return normalizeBusinessNegotiationInboxState(JSON.parse(raw));
  } catch {
    return createBusinessNegotiationInboxState();
  }
}

function writeStoredBusinessNegotiationInbox(accountId, state) {
  const normalized = normalizeBusinessNegotiationInboxState(state);
  try {
    localStorage.setItem(
      buildScopedStorageKey(BUSINESS_NEGOTIATION_INBOX_KEY_PREFIX, accountId),
      JSON.stringify(normalized)
    );
  } catch {
    // ignore storage failures
  }
  notifyNegotiationInboxUpdated("business", accountId);
  return normalized;
}

function readStoredRegularNegotiationInbox(accountId) {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(REGULAR_NEGOTIATION_INBOX_KEY_PREFIX, accountId));
    if (!raw) return createRegularNegotiationInboxState();
    return normalizeRegularNegotiationInboxState(JSON.parse(raw));
  } catch {
    return createRegularNegotiationInboxState();
  }
}

function writeStoredRegularNegotiationInbox(accountId, state) {
  const normalized = normalizeRegularNegotiationInboxState(state);
  try {
    localStorage.setItem(
      buildScopedStorageKey(REGULAR_NEGOTIATION_INBOX_KEY_PREFIX, accountId),
      JSON.stringify(normalized)
    );
  } catch {
    // ignore storage failures
  }
  notifyNegotiationInboxUpdated("regular", accountId);
  return normalized;
}

function readStoredLiveNotifications(accountId) {
  try {
    const raw = localStorage.getItem(buildScopedStorageKey(REGULAR_LIVE_NOTIFICATIONS_KEY_PREFIX, accountId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((item) => item && LIVE_NOTIFICATION_TYPES.has(item.type));
    if (filtered.length !== parsed.length) {
      writeStoredLiveNotifications(accountId, filtered);
    }
    return filtered;
  } catch {
    return [];
  }
}

function writeStoredLiveNotifications(accountId, notifications) {
  try {
    localStorage.setItem(
      buildScopedStorageKey(REGULAR_LIVE_NOTIFICATIONS_KEY_PREFIX, accountId),
      JSON.stringify(notifications.slice(0, MAX_LIVE_NOTIFICATIONS))
    );
  } catch {
    // ignore storage failures
  }
}

function buildStoredNegotiationStatusNotification(event) {
  return {
    id: event.id || `negotiation-status:${event.negotiationId}:${event.updatedAt}:${event.status || "update"}`,
    type: "negotiation-status",
    title: "Negotiation update",
    message: event.message || "Your negotiation has been updated.",
    businessName: event.businessName || "",
    positionTypeName: event.positionTypeName || "",
    status: event.status,
    updatedAt: normalizeDate(event.updatedAt),
    href: `/negotiations/${event.negotiationId}`,
    actionLabel: "Open negotiation",
  };
}

function normalizeLiveNotificationEvent(event) {
  if (!event || event.scope !== "regular-bell") return null;

  if (event.type === "negotiation-status") {
    return buildStoredNegotiationStatusNotification(event);
  }

  return null;
}

function buildMutualInterestNotifications(interests, activeNegotiationJobId) {
  return interests
    .filter((interest) => interest.mutual && interest.job.status === "open" && interest.job.id !== activeNegotiationJobId)
    .map((interest) => ({
      id: `mutual-${interest.interest_id}`,
      type: "mutual-interest",
      title: "Mutual interest reached",
      message: `${interest.job.business.business_name} is also interested in your ${interest.job.position_type.name} application.`,
      businessName: interest.job.business.business_name,
      positionTypeName: interest.job.position_type.name,
      status: "active",
      startTime: interest.job.start_time,
      endTime: interest.job.end_time,
      updatedAt: normalizeDate(interest.updatedAt || interest.job.updatedAt),
      href: buildJobHref(interest.job.id),
      actionLabel: "Open job",
    }));
}

function buildNegotiationNotification(negotiation) {
  if (!negotiation) return [];

  return [{
    id: `negotiation-${negotiation.id}`,
    type: "negotiation",
    title: "Active negotiation",
    message: `You have an active negotiation with ${negotiation.job.business.business_name} for ${negotiation.job.position_type.name}.`,
    businessName: negotiation.job.business.business_name,
    positionTypeName: negotiation.job.position_type.name,
    status: negotiation.status,
    startTime: negotiation.job.start_time,
    endTime: negotiation.job.end_time,
    expiresAt: negotiation.expiresAt,
    updatedAt: normalizeDate(negotiation.updatedAt || negotiation.createdAt),
    href: `/negotiations/${negotiation.id}`,
    actionLabel: "Open negotiation",
  }];
}

function buildQualificationNotifications(qualifications) {
  return qualifications
    .filter((qualification) => QUALIFICATION_NOTIFICATION_STATUSES.has(qualification.status))
    .map((qualification) => ({
      id: `qualification-${qualification.id}`,
      type: "qualification",
      title: `Qualification ${qualification.status}`,
      message: `Your ${qualification.position_type_name} qualification is now ${qualification.status}.`,
      positionTypeName: qualification.position_type_name,
      status: qualification.status,
      updatedAt: normalizeDate(qualification.updatedAt),
      href: `/regular/qualifications/${qualification.id}`,
      actionLabel: "View qualification",
    }));
}

function buildJobStatusNotifications(interests) {
  return interests
    .filter((interest) => JOB_STATUS_NOTIFICATIONS.has(interest.job.status))
    .map((interest) => ({
      id: `job-status-${interest.interest_id}`,
      type: "job-status",
      title: `Interested job ${interest.job.status}`,
      message: `${interest.job.business.business_name}'s ${interest.job.position_type.name} job is now ${interest.job.status}.`,
      businessName: interest.job.business.business_name,
      positionTypeName: interest.job.position_type.name,
      status: interest.job.status,
      startTime: interest.job.start_time,
      endTime: interest.job.end_time,
      updatedAt: normalizeDate(interest.job.updatedAt || interest.updatedAt),
      href: buildJobHref(interest.job.id),
      actionLabel: "Open job",
    }));
}

export function shouldRefreshRegularNotificationsForEvent(event) {
  return (
    !!event &&
    event.scope === "regular-bell" &&
    ["mutual-interest", "mutual-interest-cleared", "negotiation-started", "negotiation-status"].includes(event.type)
  );
}

export function storeRegularNotificationEvent(accountId, event) {
  const notification = normalizeLiveNotificationEvent(event);
  if (!notification) return null;

  const existing = readStoredLiveNotifications(accountId).filter((item) => item.id !== notification.id);
  writeStoredLiveNotifications(accountId, sortNotifications([notification, ...existing]));
  return notification;
}

export function markBusinessNegotiationInboxSeen(accountId, timestamp = new Date().toISOString()) {
  const current = readStoredBusinessNegotiationInbox(accountId);
  writeStoredBusinessNegotiationInbox(accountId, {
    ...current,
    navLastSeenAt: timestamp,
    navUnreadCount: 0,
  });
  return timestamp;
}

export function countUnreadBusinessNavbarMessages(accountId) {
  return readStoredBusinessNegotiationInbox(accountId).navUnreadCount;
}

export function getBusinessNegotiationUnreadMap(accountId) {
  return readStoredBusinessNegotiationInbox(accountId).byNegotiation;
}

export function getBusinessNegotiationMessageNotifications(accountId) {
  return Object.values(getBusinessNegotiationUnreadMap(accountId));
}

export function storeBusinessNegotiationMessageEvent(accountId, event, options = {}) {
  if (!event || event.scope !== "business-negotiations" || event.type !== "negotiation-message") {
    return null;
  }

  const incrementNav = options.incrementNav !== false;
  const current = readStoredBusinessNegotiationInbox(accountId);
  const negotiationKey = String(event.negotiationId);
  const existing = current.byNegotiation[negotiationKey];

  const nextEntry = {
    negotiationId: negotiationKey,
    unreadCount: normalizeCount(existing?.unreadCount) + 1,
    counterpartName: event.counterpartName || existing?.counterpartName || "",
    previewText: event.previewText || "",
    updatedAt: normalizeDate(event.updatedAt),
  };

  const nextByNegotiation = {
    ...current.byNegotiation,
    [negotiationKey]: nextEntry,
  };

  const normalized = writeStoredBusinessNegotiationInbox(accountId, {
    ...current,
    navUnreadCount: current.navUnreadCount + (incrementNav ? 1 : 0),
    byNegotiation: nextByNegotiation,
  });

  return normalized.byNegotiation[negotiationKey] || nextEntry;
}

export function clearBusinessNegotiationThreadUnread(accountId, negotiationId) {
  const current = readStoredBusinessNegotiationInbox(accountId);
  const negotiationKey = String(negotiationId);
  const existing = current.byNegotiation[negotiationKey];
  if (!existing) return 0;

  const removedCount = normalizeCount(existing.unreadCount);
  const nextByNegotiation = { ...current.byNegotiation };
  delete nextByNegotiation[negotiationKey];

  writeStoredBusinessNegotiationInbox(accountId, {
    ...current,
    navUnreadCount: Math.max(0, current.navUnreadCount - removedCount),
    byNegotiation: nextByNegotiation,
  });

  return removedCount;
}

export function countUnreadBusinessNegotiationMessages(accountId) {
  return readStoredBusinessNegotiationInbox(accountId).totalUnread;
}

export function getRegularNegotiationUnreadMap(accountId) {
  return readStoredRegularNegotiationInbox(accountId).byNegotiation;
}

export function countUnreadRegularNavbarMessages(accountId) {
  return readStoredRegularNegotiationInbox(accountId).totalUnread;
}

export function storeRegularChatMessageEvent(accountId, event) {
  if (!event || event.scope !== "regular-chat" || event.type !== "negotiation-message") {
    return null;
  }

  const current = readStoredRegularNegotiationInbox(accountId);
  const negotiationKey = String(event.negotiationId);
  const existing = current.byNegotiation[negotiationKey];

  const nextEntry = {
    negotiationId: negotiationKey,
    unreadCount: normalizeCount(existing?.unreadCount) + 1,
    businessName: event.businessName || existing?.businessName || "",
    positionTypeName: event.positionTypeName || existing?.positionTypeName || "",
    previewText: event.previewText || "",
    updatedAt: normalizeDate(event.updatedAt),
  };

  const normalized = writeStoredRegularNegotiationInbox(accountId, {
    ...current,
    byNegotiation: {
      ...current.byNegotiation,
      [negotiationKey]: nextEntry,
    },
  });

  return normalized.byNegotiation[negotiationKey] || nextEntry;
}

export function clearRegularNegotiationThreadUnread(accountId, negotiationId) {
  const current = readStoredRegularNegotiationInbox(accountId);
  const negotiationKey = String(negotiationId);
  const existing = current.byNegotiation[negotiationKey];
  if (!existing) return 0;

  const nextByNegotiation = { ...current.byNegotiation };
  delete nextByNegotiation[negotiationKey];

  writeStoredRegularNegotiationInbox(accountId, {
    ...current,
    byNegotiation: nextByNegotiation,
  });

  return normalizeCount(existing.unreadCount);
}

export function countUnreadRegularNegotiationMessages(accountId) {
  return countUnreadRegularNavbarMessages(accountId);
}

export function buildRegularNotifications({ interests, qualifications, negotiation, liveNotifications = [] }) {
  const activeNegotiationJobId = negotiation?.job?.id ?? null;

  return dedupeNotifications([
    ...buildMutualInterestNotifications(interests, activeNegotiationJobId),
    ...buildNegotiationNotification(negotiation),
    ...buildQualificationNotifications(qualifications),
    ...buildJobStatusNotifications(interests),
    ...liveNotifications,
  ]);
}

export async function getRegularNotifications(token, accountId) {
  const [interestsData, qualificationsData, negotiation] = await Promise.all([
    getMyInterests(token),
    getMyQualifications(token),
    getActiveNegotiation(token).catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    }),
  ]);

  return buildRegularNotifications({
    interests: interestsData.results || [],
    qualifications: qualificationsData.results || [],
    negotiation,
    liveNotifications: readStoredLiveNotifications(accountId),
  });
}

export function getRegularNotificationsLastSeen(accountId) {
  try {
    return (
      localStorage.getItem(
        buildScopedStorageKey(REGULAR_NOTIFICATIONS_LAST_SEEN_KEY_PREFIX, accountId)
      ) || ""
    );
  } catch {
    return "";
  }
}

export function markRegularNotificationsSeen(accountId, timestamp = new Date().toISOString()) {
  try {
    localStorage.setItem(
      buildScopedStorageKey(REGULAR_NOTIFICATIONS_LAST_SEEN_KEY_PREFIX, accountId),
      timestamp
    );
  } catch {
    // ignore storage failures
  }
  return timestamp;
}

export function countUnreadRegularNotifications(notifications, lastSeenAt) {
  if (!lastSeenAt) return notifications.length;

  const lastSeenTime = new Date(lastSeenAt).getTime();
  return notifications.filter(
    (notification) => new Date(notification.updatedAt).getTime() > lastSeenTime
  ).length;
}

