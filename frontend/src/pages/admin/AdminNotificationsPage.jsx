import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";

import { useAuth } from "../../contexts/AuthContext";
import {
  clearAdminNotifications,
  countUnreadAdminNotifications,
  getAdminNotifications,
  getAdminNotificationsLastSeen,
  markAdminNotificationsSeen,
  shouldRefreshAdminNotificationsForEvent,
  storeAdminNotificationEvent,
} from "../../api/adminNotifications";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { getSocket } from "../../lib/socket";

function formatQualificationDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminNotificationsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [lastSeenAt, setLastSeenAt] = useState(
    () => getAdminNotificationsLastSeen()
  );
  const [clearing, setClearing] = useState(false);

  const loadNotifications = useCallback(async ({ markSeen = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const previousSeenAt = getAdminNotificationsLastSeen();
      setLastSeenAt(previousSeenAt);
      const results = await getAdminNotifications(token);
      setNotifications(results);
      if (markSeen) {
        const now = markAdminNotificationsSeen();
        setLastSeenAt(now);
      }
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications({ markSeen: true });
  }, [loadNotifications]);

  const unreadCount = useMemo(() => {
    return countUnreadAdminNotifications(notifications, lastSeenAt);
  }, [lastSeenAt, notifications]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = getSocket(token);
    const onAdminNotification = (event) => {
      if (!shouldRefreshAdminNotificationsForEvent(event)) return;
      storeAdminNotificationEvent(event);
      void loadNotifications({ markSeen: false });
    };

    socket.on("notification:event", onAdminNotification);
    return () => {
      socket.off("notification:event", onAdminNotification);
    };
  }, [loadNotifications, token]);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const nextSeenAt = clearAdminNotifications(notifications);
      setNotifications([]);
      setLastSeenAt(nextSeenAt);
    } finally {
      setClearing(false);
    }
  };

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
              ? `${unreadCount} new admin notification${unreadCount !== 1 ? "s" : ""}`
              : "No new admin notifications"}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/admin/qualifications" variant="outlined">
          Go to Qualifications
        </Button>
        {notifications.length > 0 && (
          <Button variant="outlined" color="inherit" onClick={handleClearAll} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear All"}
          </Button>
        )}
      </Box>

      {notifications.length === 0 ? (
        <EmptyState message="No admin notifications yet." />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {notifications.map((notification) => {
            const isNew =
              !lastSeenAt ||
              new Date(notification.updatedAt).getTime() > new Date(lastSeenAt).getTime();

            return (
              <Paper
                key={notification.id}
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <NotificationsIcon sx={{ fontSize: 18, color: "primary.main" }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
                        {notification.type === "qualification-needs-review"
                          ? "Qualification review needed"
                          : "Qualification status updated"}
                      </Typography>
                      {isNew && <Chip label="New" color="primary" size="small" />}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {notification.candidateName || "Candidate"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WorkOutlineIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {notification.positionTypeName || "Qualification"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        Updated {formatQualificationDate(notification.updatedAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {notification.message}
                    </Typography>
                  </Box>
                  <Chip label={notification.status} size="small" sx={{ textTransform: "capitalize" }} />
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </PageContainer>
  );
}
