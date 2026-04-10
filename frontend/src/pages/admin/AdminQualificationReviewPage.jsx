import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Divider from "@mui/material/Divider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";

import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../api/client";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusChipColor(status) {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "submitted":
      return "warning";
    default:
      return "default";
  }
}

function isReviewable(status) {
  return status === "created" || status === "submitted" || status === "revised";
}

function getReviewPriorityLabel(status) {
  return isReviewable(status) ? "Needs review" : "Review completed";
}

export function AdminQualificationReviewPage() {
  const { token } = useAuth();
  const { qualificationId } = useParams();

  const [qualification, setQualification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const loadQualification = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/qualifications/${qualificationId}`, { token });
      setQualification(data);
    } catch (err) {
      setError(err.message || "Failed to load qualification.");
    } finally {
      setLoading(false);
    }
  }, [qualificationId, token]);

  useEffect(() => {
    loadQualification();
  }, [loadQualification]);

  const handleStatusChange = async (status) => {
    setError("");
    setActionLoading(status);
    try {
      const updated = await apiRequest(`/qualifications/${qualificationId}`, {
        method: "PATCH",
        token,
        data: { status },
      });
      setQualification((prev) => ({ ...prev, ...updated }));
      setSnackbar({
        open: true,
        severity: "success",
        message: status === "approved" ? "Qualification approved." : "Qualification rejected.",
      });
    } catch (err) {
      setError(err.message || "Failed to update qualification.");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading qualification..." />
      </PageContainer>
    );
  }

  if (error && !qualification) {
    return (
      <PageContainer maxWidth="md">
        <ErrorAlert message={error} />
      </PageContainer>
    );
  }

  const avatarSrc = qualification?.user?.avatar ? `${API_BASE}${qualification.user.avatar}` : undefined;
  const documentUrl = qualification?.document ? `${API_BASE}${encodeURI(qualification.document)}` : null;
  const documentName = qualification?.document
    ? decodeURIComponent(qualification.document.split("/").pop())
    : null;
  const resumeUrl = qualification?.user?.resume ? `${API_BASE}${encodeURI(qualification.user.resume)}` : null;
  const resumeName = qualification?.user?.resume
    ? decodeURIComponent(qualification.user.resume.split("/").pop())
    : null;
  const reviewable = isReviewable(qualification?.status);

  const renderReviewActions = (compact = false) => (
    <Box sx={{ display: "flex", justifyContent: compact ? "flex-end" : "center", gap: 1.5, flexWrap: "wrap" }}>
      <Button
        variant="contained"
        onClick={() => handleStatusChange("approved")}
        disabled={Boolean(actionLoading)}
      >
        {actionLoading === "approved" ? "Approving..." : "Approve"}
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={() => handleStatusChange("rejected")}
        disabled={Boolean(actionLoading)}
      >
        {actionLoading === "rejected" ? "Rejecting..." : "Reject"}
      </Button>
    </Box>
  );

  return (
    <PageContainer maxWidth="md">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/admin/qualifications" variant="text" startIcon={<ArrowBackIcon />} sx={{ px: 0 }}>
          Back to Qualifications
        </Button>
      </Box>

      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Avatar src={avatarSrc} sx={{ width: 72, height: 72 }}>
              {qualification?.user?.first_name?.[0]?.toUpperCase() || "U"}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                {qualification?.user?.first_name} {qualification?.user?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {qualification?.user?.email || "No email available"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Updated {formatDate(qualification?.updatedAt)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Chip
              label={qualification?.status || "unknown"}
              color={getStatusChipColor(qualification?.status)}
              sx={{ textTransform: "capitalize" }}
            />
            <Chip
              label={getReviewPriorityLabel(qualification?.status)}
              color={reviewable ? "warning" : "default"}
              variant="outlined"
              size="small"
            />
            {reviewable && renderReviewActions(true)}
          </Box>
        </Box>
      </SectionCard>

      <SectionCard title="User Information">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {qualification?.user?.id && (
            <Box>
              <Button
                component={RouterLink}
                to={`/admin/qualification-users/${qualification.user.id}`}
                variant="outlined"
                size="small"
              >
                View User
              </Button>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhoneIcon sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {qualification?.user?.phone_number || "No phone number available"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PlaceIcon sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {qualification?.user?.postal_address || "No postal address available"}
            </Typography>
          </Box>
          {resumeUrl ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DescriptionIcon color="action" />
              <Typography
                variant="body2"
                component="a"
                href={resumeUrl}
                target="_blank"
                rel="noopener"
                sx={{ color: "primary.main", textDecoration: "underline" }}
              >
                {resumeName}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No resume uploaded.
            </Typography>
          )}
          <Divider />
          {qualification?.user?.biography && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {qualification.user.biography}
            </Typography>
          )}
        </Box>
      </SectionCard>

      <SectionCard title="Qualification">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WorkOutlineIcon sx={{ color: "text.secondary" }} />
            <Typography variant="body1">{qualification?.position_type?.name}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ScheduleIcon sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Updated {formatDate(qualification?.updatedAt)}
            </Typography>
          </Box>
          {qualification?.note && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {qualification.note}
            </Typography>
          )}
          {documentUrl ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DescriptionIcon color="action" />
              <Typography
                variant="body2"
                component="a"
                href={documentUrl}
                target="_blank"
                rel="noopener"
                sx={{ color: "primary.main", textDecoration: "underline" }}
              >
                {documentName}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No document uploaded.
            </Typography>
          )}
        </Box>
      </SectionCard>

      {reviewable && (
        <SectionCard>
          {renderReviewActions()}
        </SectionCard>
      )}

      {reviewable && (
        <Box
          sx={{
            position: "sticky",
            bottom: 12,
            zIndex: 5,
            mt: 2,
            p: 1.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Quick review actions
          </Typography>
          {renderReviewActions()}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="standard"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
