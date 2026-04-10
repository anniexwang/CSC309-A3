import { useCallback, useEffect, useState } from "react";
import { Navigate, Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import { PageContainer } from "../../components/ui/PageContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../contexts/AuthContext";
import {
  NEGOTIATION_INBOX_UPDATED_EVENT,
  clearBusinessNegotiationThreadUnread,
  getBusinessNegotiationUnreadMap,
  markBusinessNegotiationInboxSeen,
} from "../../api/notifications";
import { getNegotiations } from "../../api/negotiations";
import { getSocket } from "../../lib/socket";
import { StatusChip } from "../../components/ui/StatusChip";

function formatTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

export function NegotiationsPage() {
  const { token, role, accountId, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [negotiations, setNegotiations] = useState([]);
  const [businessUnreadMessages, setBusinessUnreadMessages] = useState({});

  const loadNegotiations = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setNegotiations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getNegotiations(token, { status: "active", limit: 200 });
      setNegotiations(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to load negotiations");
      setNegotiations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void loadNegotiations();
  }, [loadNegotiations]);

  useEffect(() => {
    if (role !== "business" || !accountId) return;

    markBusinessNegotiationInboxSeen(accountId);
    setBusinessUnreadMessages(getBusinessNegotiationUnreadMap(accountId));
  }, [accountId, role]);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;

    const socket = getSocket(token);
    const refresh = () => {
      void loadNegotiations();
    };

    socket.on("negotiation:started", refresh);
    socket.on("negotiation:status", refresh);

    return () => {
      socket.off("negotiation:started", refresh);
      socket.off("negotiation:status", refresh);
    };
  }, [isAuthenticated, loadNegotiations, token]);

  useEffect(() => {
    if (role !== "business" || !accountId) return undefined;

    const handleInboxUpdate = (event) => {
      const detail = event.detail || {};
      if (detail.scope !== "business") return;
      if (String(detail.accountId) !== String(accountId)) return;

      setBusinessUnreadMessages(getBusinessNegotiationUnreadMap(accountId));
    };

    window.addEventListener(NEGOTIATION_INBOX_UPDATED_EVENT, handleInboxUpdate);
    return () => {
      window.removeEventListener(NEGOTIATION_INBOX_UPDATED_EVENT, handleInboxUpdate);
    };
  }, [accountId, role]);

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (role === "regular" && negotiations.length === 1) {
    return <Navigate to={`/negotiations/${negotiations[0].id}`} replace />;
  }

  return (
    <PageContainer maxWidth="md">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Active negotiations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {role === "business"
                ? "Manage and switch between your live candidate negotiations."
                : "Open your current negotiation."}
            </Typography>
          </Box>
          <Chip label={`${negotiations.length} active`} color="primary" variant="outlined" />
        </Box>

        {negotiations.length === 0 ? (
          <EmptyState message="You do not have any active negotiations right now." />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {negotiations.map((negotiation) => {
              const counterpartName = role === "business"
                ? `${negotiation.user?.first_name || ""} ${negotiation.user?.last_name || ""}`.trim()
                : negotiation.job?.business?.business_name;
              const unreadMessage = role === "business"
                ? businessUnreadMessages[String(negotiation.id)]
                : null;

              return (
                <Paper
                  key={negotiation.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                    borderColor: unreadMessage ? "primary.main" : undefined,
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {counterpartName || "Negotiation"}
                      </Typography>
                      <StatusChip status={negotiation.status} />
                      {unreadMessage && unreadMessage.unreadCount > 0 && (
                        <Badge color="error" badgeContent={unreadMessage.unreadCount}>
                          <ChatBubbleOutlineIcon fontSize="small" color="action" />
                        </Badge>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {negotiation.job?.position_type?.name} • {negotiation.job?.start_time ? new Date(negotiation.job.start_time).toLocaleString() : ""}
                    </Typography>
                    {unreadMessage && (
                      <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500 }}>
                        From {unreadMessage.counterpartName || counterpartName || "candidate"}: {unreadMessage.previewText || "New message"}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Expires {formatTimeLeft(negotiation.expiresAt)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    {/* <Chip label={negotiation.status.toUpperCase()} color="primary" size="small" /> */}
                    <Button
                      component={RouterLink}
                      to={`/negotiations/${negotiation.id}`}
                      variant="contained"
                      size="small"
                      onClick={() => {
                        if (role === "business" && accountId) {
                          clearBusinessNegotiationThreadUnread(accountId, negotiation.id);
                        }
                      }}
                    >
                      Open Negotiation
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>
    </PageContainer>
  );
}
