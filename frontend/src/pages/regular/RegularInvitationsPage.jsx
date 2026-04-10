import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusChip } from "../../components/ui/StatusChip";
import {
  getMyInvitations,
  setJobInterest,
  
} from "../../api/jobs";
import { createNegotiation, getActiveNegotiation } from "../../api/negotiations";
import { JobDetailDialog } from "./JobDetailDialog";

const LIMIT = 10;

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSalary(min, max) {
  const fmt = (v) => `$${Number(v).toFixed(2)}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "Not specified";
}

export function RegularInvitationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [startingNeg, setStartingNeg] = useState(null);

  const [negotiationExists, setNegotiationExists] = useState(null);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyInvitations(token, { page, limit: LIMIT });
      setInvitations(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const loadNegotiation = useCallback(async () => {
    getActiveNegotiation(token)
    .then(setNegotiationExists(true))
    .catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    })
  },[token]);

  useEffect(() => {
    void loadNegotiation();
  }, [loadNegotiation]);

  const acceptInvitation = useCallback(async (invitation) => {
    if (!invitation) return;

    if (negotiationExists) {
      setError("You have an ongoing negotiation. Accept or reject the ongoing negotiation before accepting another invitation.");
      return;
    }

    const invitationKey = invitation.interest_id || invitation.id;
    setStartingNeg(invitationKey);
    setError("");
    let interestId = null;

    try {
      const interest = await setJobInterest(token, invitation.id, true);
      interestId = interest?.id;

      if (!interestId) {
        throw new Error("Failed to accept invitation");
      }

      const negotiation = await createNegotiation(token, interestId);
      navigate(`/negotiations/${negotiation.id}`);
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
      if (interestId) {
        await loadInvitations();
      }
    } finally {
      setStartingNeg(null);
    }
  }, [loadInvitations, navigate, token]);

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        My Invitations
      </Typography>

      {/* Results */}
      {loading ? (
        <LoadingState message="Loading invitations..." />
      ) : (
        <>
          {error && <ErrorAlert message={error} />}

          {invitations.length === 0 ? (
            <EmptyState message={"You have not received any invitations. Invitations will show up here when businesses invite you."} />
          ) : (
            <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount} invitation{totalCount !== 1 ? "s" : ""}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {invitations.map((invitation) => (
              <JobCard
                key={invitation.interest_id}
                invitation={invitation}
                onViewDetails={() => {
                  setSelectedInvitation(invitation);
                  setSelectedJobId(invitation.id);
                }}
                startingNeg={startingNeg}
                onAcceptInvitation={() => acceptInvitation(invitation)}
              />
            ))}
          </Box>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
            </>
          )}
        </>
      )}

      <JobDetailDialog
        open={selectedJobId !== null}
        jobId={selectedJobId}
        // isInterested={interestedJobIds.has(selectedJobId)}
        onClose={() => {
          setSelectedJobId(null);
          setSelectedInvitation(null);
        }}
        isInvitation={true}
        onInvitationChanged={() => acceptInvitation(selectedInvitation)}
      />
    </PageContainer>
  );
}

function JobCard({ invitation, onViewDetails, startingNeg, onAcceptInvitation }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
        cursor: "pointer",
      }}
      onClick={onViewDetails}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {invitation.position_type?.name || "Unknown Position"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
            <BusinessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {invitation.business?.business_name || "Unknown Business"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
          {/* <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={async (e) => {
              e.stopPropagation();
              const interestId = await handleInterest(false, invitation.id);
              console.log("interestID after call ", interestId);
              loadInvitations();
            }}
            disabled={startingNeg === invitation.id}
            sx={{ whiteSpace: "nowrap" }}
          >
            Reject
          </Button> */}
          {invitation.status === "open" && <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptInvitation();
            }}
            disabled={startingNeg === invitation.interest_id}
            sx={{ whiteSpace: "nowrap" }}
          >
            {startingNeg === invitation.interest_id ? "Starting..." : "Accept Invitation"}
          </Button>}
          <StatusChip status={invitation.status} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2">
              {formatSalary(invitation.salary_min, invitation.salary_max)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">Start </Typography>
              {formatDateTime(invitation.start_time)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">End </Typography>
              {formatDateTime(invitation.end_time)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {invitation.distance != null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {invitation.distance.toFixed(1)} km away &middot; ~{(invitation.eta * 60).toFixed(0)} min
        </Typography>
      )}
    </Paper>
  );
}
