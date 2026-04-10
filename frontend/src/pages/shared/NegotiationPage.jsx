import { useState, useEffect, useRef, useCallback } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { StatusChip } from "../../components/ui/StatusChip";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import TimerIcon from "@mui/icons-material/Timer";

import { PageContainer } from "../../components/ui/PageContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../contexts/AuthContext";
import {
  clearBusinessNegotiationThreadUnread,
  clearRegularNegotiationThreadUnread,
} from "../../api/notifications";
import {
  getNegotiationById,
  submitNegotiationDecision,
} from "../../api/negotiations";
import { getSocket } from "../../lib/socket";

function formatTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return { label: "Expired", diffMs: 0 };
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return {
    label: `${days} days ${hours} hours ${minutes} minutes`,
    diffMs: diff,
  };
}

export function NegotiationPage() {
  const { negotiationId } = useParams();
  const { token, role, accountId } = useAuth();

  const [negotiation, setNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ label: "", diffMs: 0 });

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const appendSystemMessage = useCallback((eventKey, text, createdAt, targetNegotiationId) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg._eventKey === eventKey)) return prev;
      return [
        ...prev,
        {
          negotiation_id: targetNegotiationId,
          sender: { role: "system", id: null },
          text,
          createdAt: createdAt || new Date().toISOString(),
          _eventKey: eventKey,
        },
      ];
    });
  }, []);

  const mergeMessages = useCallback((prev, incoming) => {
    const seen = new Set(prev.map((m) => `${m.sender?.id ?? "system"}|${m.createdAt}|${m.text}`));
    const next = [...prev];
    for (const msg of incoming) {
      const key = `${msg.sender?.id ?? "system"}|${msg.createdAt}|${msg.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        next.push(msg);
      }
    }
    return next;
  }, []);

  const loadNegotiation = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getNegotiationById(token, negotiationId);
      setNegotiation(data);
    } catch (err) {
      if (err.status === 404) {
        setNegotiation(null);
      } else {
        setError(err.message || "Failed to load negotiation");
      }
    } finally {
      setLoading(false);
    }
  }, [negotiationId, token]);

  useEffect(() => {
    void loadNegotiation();
  }, [loadNegotiation]);

  useEffect(() => {
    if (!negotiationId || !accountId) return;

    if (role === "business") {
      clearBusinessNegotiationThreadUnread(accountId, negotiationId);
    } else if (role === "regular") {
      clearRegularNegotiationThreadUnread(accountId, negotiationId);
    }
  }, [accountId, negotiationId, role]);

  useEffect(() => {
    if (!negotiation || negotiation.status !== "active") return undefined;

    const sock = getSocket(token);
    socketRef.current = sock;

    const joinNegotiationRoom = () => {
      sock.emit("negotiation:join", { negotiation_id: negotiation.id }, (payload) => {
        if (!payload) return;
        if (payload.error) {
          setError(payload.message || payload.error || "Failed to join negotiation");
          return;
        }
        const history = Array.isArray(payload.messages) ? payload.messages : [];
        if (history.length > 0) {
          setMessages((prev) => mergeMessages(prev, history));
        }
      });
    };

    const handleIncomingMessage = (msg) => {
      if (msg.negotiation_id !== negotiation.id) return;
      if (msg.sender?.role && msg.sender.role !== role) {
        if (role === "business") {
          clearBusinessNegotiationThreadUnread(accountId, negotiation.id);
        } else if (role === "regular") {
          clearRegularNegotiationThreadUnread(accountId, negotiation.id);
        }
      }

      setMessages((prev) => {
        const isDuplicate =
          msg.sender?.id === accountId &&
          prev.some(
            (m) => m._local && m.text === msg.text && m.sender?.id === accountId
          );
        if (isDuplicate) {
          return prev.map((m) =>
            m._local && m.text === msg.text && m.sender?.id === accountId
              ? { ...msg }
              : m
          );
        }
        return [...prev, msg];
      });
    };

    const handleHistory = (payload) => {
      if (!payload || payload.negotiation_id !== negotiation.id) return;
      const history = Array.isArray(payload.messages) ? payload.messages : [];
      if (history.length === 0) return;
      setMessages((prev) => mergeMessages(prev, history));
    };

    const handleStarted = (data) => {
      if (data.negotiation_id !== negotiation.id) return;
      appendSystemMessage(
        `started:${negotiation.id}`,
        "Negotiation session started.",
        new Date().toISOString(),
        negotiation.id
      );
    };

    const handleStatus = (update) => {
      if (update.negotiation_id !== negotiation.id) return;

      setNegotiation((prev) =>
        prev
          ? {
              ...prev,
              status: update.status,
              updatedAt: update.updatedAt,
              decisions: update.decisions,
            }
          : prev
      );

      if (update.message) {
        appendSystemMessage(update.eventKey, update.message, update.updatedAt, negotiation.id);
      }
    };

    const handleSocketError = (err) => {
      setError(err.message || err.error || "Socket error");
    };

    joinNegotiationRoom();
    sock.on("connect", joinNegotiationRoom);
    sock.on("negotiation:message", handleIncomingMessage);
    sock.on("negotiation:history", handleHistory);
    sock.on("negotiation:started", handleStarted);
    sock.on("negotiation:status", handleStatus);
    sock.on("negotiation:error", handleSocketError);

    return () => {
      sock.off("connect", joinNegotiationRoom);
      sock.off("negotiation:message", handleIncomingMessage);
      sock.off("negotiation:history", handleHistory);
      sock.off("negotiation:started", handleStarted);
      sock.off("negotiation:status", handleStatus);
      sock.off("negotiation:error", handleSocketError);
    };
  }, [negotiation, token, accountId, role, appendSystemMessage, mergeMessages]);

  useEffect(() => {
    setMessages([]);
  }, [negotiation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!negotiation?.expiresAt || negotiation.status !== "active") return undefined;

    const tick = () => setTimeLeft(formatTimeLeft(negotiation.expiresAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [negotiation?.expiresAt, negotiation?.status]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !socketRef.current || !negotiation) return;

    const localMsg = {
      negotiation_id: negotiation.id,
      sender: { role, id: accountId },
      text,
      createdAt: new Date().toISOString(),
      _local: true,
    };
    setMessages((prev) => [...prev, localMsg]);

    socketRef.current.emit("negotiation:message", {
      negotiation_id: negotiation.id,
      text,
    });
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDecision = async (decision) => {
    setDeciding(true);
    setError("");
    try {
      const updated = await submitNegotiationDecision(
        token,
        negotiation.id,
        decision
      );
      setNegotiation(updated);
    } catch (err) {
      if (err.status === 409) {
        void loadNegotiation();
      }
      setError(err.message || "Failed to submit decision");
    } finally {
      setDeciding(false);
    }
  };

  const isActive = negotiation?.status === "active";
  const isFinished =
    negotiation?.status === "success" || negotiation?.status === "failed";
  const myDecision =
    role === "regular"
      ? negotiation?.decisions?.candidate
      : negotiation?.decisions?.business;
  const counterpartyName =
    role === "regular"
      ? negotiation?.job?.business?.business_name
      : `${negotiation?.user?.first_name || ""} ${negotiation?.user?.last_name || ""}`.trim();
  const counterpartyLabel = role === "regular" ? "Business" : "Candidate";
  const otherPartyDecision =
    role === "regular"
      ? negotiation?.decisions?.business
      : negotiation?.decisions?.candidate;

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (!negotiation) {
    return (
      <PageContainer maxWidth="md">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        <Paper sx={{ p: 3 }}>
          <EmptyState message="Negotiation not found or no longer available." />
          {role === "business" && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button component={RouterLink} to="/negotiations" variant="contained">
                Back to negotiations
              </Button>
            </Box>
          )}
        </Paper>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            {role === "business" && (
              <Button
                component={RouterLink}
                to="/negotiations"
                size="small"
                sx={{ px: 0, mb: 1 }}
              >
                Back to negotiations
              </Button>
            )}
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {counterpartyName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {counterpartyLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Position: {negotiation.job?.position_type?.name}
            </Typography>
            {negotiation.job?.salary_min != null && (
              <Typography variant="body2" color="text.secondary">
                Salary: ${negotiation.job.salary_min}
                {negotiation.job.salary_max
                  ? ` - $${negotiation.job.salary_max}`
                  : ""}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "stretch", sm: "flex-end" }, gap: 1, minWidth: 220 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
              {isActive && (
                <Chip
                  icon={<TimerIcon />}
                  label={timeLeft.label}
                  color={
                    timeLeft.label === "Expired"
                      ? "error"
                      : timeLeft.diffMs <= 5 * 60 * 1000
                        ? "warning"
                        : "default"
                  }
                  size="small"
                />
              )}
              {/* <Chip
                label={negotiation.status.toUpperCase()}
                color={
                  negotiation.status === "active"
                    ? "primary"
                    : negotiation.status === "success"
                      ? "success"
                      : "error"
                }
                size="small"
              /> */}
              <StatusChip 
                status="active"
              />
            </Box>

            {isActive && !myDecision && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  // startIcon={<CheckCircleOutlineIcon />}
                  onClick={() => handleDecision("accept")}
                  disabled={deciding}
                >
                  Accept
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  // startIcon={<CancelOutlinedIcon />}
                  onClick={() => handleDecision("decline")}
                  disabled={deciding}
                >
                  Decline
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {(isFinished || myDecision) && (
          <Alert
            severity={
              isFinished
                ? negotiation.status === "success"
                  ? "success"
                  : "warning"
                : "info"
            }
            sx={{ mt: 2 }}
          >
            {isFinished
              ? negotiation.status === "success"
                ? "Both parties accepted. The job has been filled!"
                : "Negotiation ended without agreement."
              : `You chose to ${myDecision}. ${
                  otherPartyDecision
                    ? `The other party chose to ${otherPartyDecision}.`
                    : "Waiting for the other party..."
                }`}
          </Alert>
        )}
      </Paper>

      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          height: 420,
          mb: 2,
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {messages.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 4 }}
            >
              No messages yet. Messages are session-only and not persisted.
            </Typography>
          )}

          {messages.map((msg, idx) => {
            const isSystem = msg.sender?.role === "system";
            const isMine = msg.sender?.id === accountId;

            if (isSystem) {
              return (
                <Typography
                  key={idx}
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 0.5 }}
                >
                  {msg.text}
                </Typography>
              );
            }

            return (
              <Box
                key={idx}
                sx={{
                  alignSelf: isMine ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: isMine ? "primary.main" : "grey.100",
                    color: isMine ? "common.white" : "text.primary",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: "inherit" }}>{msg.text}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      color: isMine ? "rgba(255,255,255,0.9)" : "text.secondary",
                    }}
                  >
                    {msg.sender?.role === "business" ? "Business" : "Candidate"}
                    {" · "}
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        <Box sx={{ display: "flex", gap: 1, p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              isActive ? "Type a message..." : "Negotiation has ended"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isActive}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!isActive || !draft.trim()}
            sx={{ minWidth: 0, px: 2 }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Paper>
    </PageContainer>
  );
}
