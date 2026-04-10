import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FavoriteIcon from "@mui/icons-material/Favorite";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";

import { useAuth } from "../../contexts/AuthContext";
import {
  countUnreadRegularNotifications,
  getRegularNotifications,
  getRegularNotificationsLastSeen,
  markRegularNotificationsSeen,
  shouldRefreshRegularNotificationsForEvent,
  storeRegularNotificationEvent,
} from "../../api/notifications";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { StatusChip } from "../../components/ui/StatusChip";
import { getSocket } from "../../lib/socket";

const TYPE_META = {
  "mutual-interest": {
    label: "Mutual Interest",
    icon: FavoriteIcon,
    color: "success",
  },
  negotiation: {
    label: "Negotiation",
    icon: ChatBubbleOutlineIcon,
    color: "primary",
  },
  "negotiation-status": {
    label: "Negotiation Update",
    icon: NotificationsActiveIcon,
    color: "primary",
  },
  qualification: {
    label: "Qualification",
    icon: FactCheckIcon,
    color: "info",
  },
  "job-status": {
    label: "Job Update",
    icon: WorkHistoryIcon,
    color: "warning",
  },
};

function formatDateTime(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function NotificationCard({ notification, isNew }) {
  const meta = TYPE_META[notification.type] || TYPE_META["negotiation-status"];
  const Icon = meta.icon;
  const timeRange = formatTimeRange(notification.startTime, notification.endTime);

  return (
    <Paper
      component={RouterLink}
      to={notification.href}
      sx={{
        p: 2.5,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Icon sx={{ fontSize: 18, color: `${meta.color}.main` }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              {notification.title}
            </Typography>
            <Chip label={meta.label} color={meta.color} size="small" variant="outlined" />
            {notification.status && <StatusChip status={notification.status} />}
            {isNew && <Chip label="New" color="primary" size="small" />}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {notification.message}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {(notification.businessName || notification.positionTypeName) && (
              <Typography variant="body2" color="text.secondary">
                {[notification.businessName, notification.positionTypeName].filter(Boolean).join(" • ")}
              </Typography>
            )}

            {timeRange && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {timeRange}
                </Typography>
              </Box>
            )}

            {notification.expiresAt && (
              <Typography variant="body2" color="text.secondary">
                Expires {formatDateTime(notification.expiresAt)}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary">
              Updated {formatDateTime(notification.updatedAt)}
            </Typography>
          </Box>
        </Box>

        {notification.actionLabel && (
          <Button component="span" variant="outlined" size="small" sx={{ alignSelf: "center", flexShrink: 0 }}>
            {notification.actionLabel}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export function RegularNotificationsPage() {
  const { token, accountId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [lastSeenBeforeOpen, setLastSeenBeforeOpen] = useState(() => getRegularNotificationsLastSeen(accountId));

  const loadNotifications = useCallback(async ({ treatIncomingAsSeen = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const previousLastSeen = treatIncomingAsSeen
        ? markRegularNotificationsSeen(accountId)
        : getRegularNotificationsLastSeen(accountId);
      setLastSeenBeforeOpen(previousLastSeen);
      const data = await getRegularNotifications(token, accountId);
      setNotifications(data);
      markRegularNotificationsSeen(accountId);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [accountId, token]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket(token);
    const refreshNotifications = (event) => {
      if (!shouldRefreshRegularNotificationsForEvent(event)) return;
      storeRegularNotificationEvent(accountId, event);
      void loadNotifications({ treatIncomingAsSeen: true });
    };

    socket.on("notification:event", refreshNotifications);

    return () => {
      socket.off("notification:event", refreshNotifications);
    };
  }, [accountId, loadNotifications, token]);

  const unreadCount = useMemo(
    () => countUnreadRegularNotifications(notifications, lastSeenBeforeOpen),
    [lastSeenBeforeOpen, notifications]
  );

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading notifications..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="md">
        <ErrorAlert message={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ color: "text.primary" }}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount > 0
              ? `${unreadCount} new notification${unreadCount !== 1 ? "s" : ""}`
              : "You are all caught up."}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/regular/jobs" variant="outlined">
          Browse Jobs
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        This feed shows non-invitation updates such as mutual interest, negotiation status changes, qualification changes, and job state changes. New chat messages appear on the chat icon.
      </Alert>

      {notifications.length === 0 ? (
        <EmptyState message="No notifications right now." />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {notifications.map((notification) => {
            const isNew =
              !lastSeenBeforeOpen ||
              new Date(notification.updatedAt).getTime() > new Date(lastSeenBeforeOpen).getTime();

            return (
              <NotificationCard
                key={notification.id}
                notification={notification}
                isNew={isNew}
              />
            );
          })}
        </Box>
      )}
    </PageContainer>
  );
}
