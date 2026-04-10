import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useParams, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import CancelIcon from "@mui/icons-material/Cancel";

import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../api/client";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function AdminManageUserPage({ backTo: forcedBackTo, backLabel: forcedBackLabel }) {
  const { token } = useAuth();
  const { userId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [savingSuspended, setSavingSuspended] = useState(false);
  const [savingQualificationId, setSavingQualificationId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/users/${userId}`, { token });
      setProfile(data);
    } catch (err) {
      setError(err.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspendedToggle() {
    if (!profile) return;

    setSavingSuspended(true);
    setSaveMsg("");
    try {
      const updated = await apiRequest(`/users/${userId}/suspended`, {
        method: "PATCH",
        token,
        data: { suspended: !profile.suspended },
      });
      setProfile((prev) => ({
        ...prev,
        suspended: updated.suspended,
      }));
      setSaveMsg(updated.suspended ? "User suspended successfully." : "User unsuspended successfully.");
    } catch (err) {
      setSaveMsg(err.message || "Failed to update suspension status.");
    } finally {
      setSavingSuspended(false);
    }
  }

  async function handleQualificationStatusChange(qualificationId, status) {
    setSavingQualificationId(qualificationId);
    setSaveMsg("");
    try {
      const updated = await apiRequest(`/qualifications/${qualificationId}`, {
        method: "PATCH",
        token,
        data: { status },
      });

      setProfile((prev) => ({
        ...prev,
        qualifications: (prev.qualifications || []).map((qualification) =>
          qualification.id === qualificationId
            ? { ...qualification, status: updated.status, updatedAt: updated.updatedAt }
            : qualification
        ),
      }));

      setSaveMsg(
        updated.status === "approved"
          ? "Qualification approved successfully."
          : "Qualification rejected successfully."
      );
    } catch (err) {
      setSaveMsg(err.message || "Failed to update qualification.");
    } finally {
      setSavingQualificationId(null);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading user..." />
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

  const avatarSrc = profile.avatar ? `${API_BASE}${profile.avatar}` : undefined;
  const actionFailed = saveMsg.toLowerCase().includes("fail");
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed User";
  const isQualificationScoped = location.pathname.startsWith("/admin/qualifications/users/");
  const qualificationIdFromQuery = searchParams.get("fromQualification");
  const backTo =
    (isQualificationScoped ? "/admin/qualifications" : null) ||
    forcedBackTo ||
    location.state?.backTo ||
    (qualificationIdFromQuery ? `/admin/qualifications/${qualificationIdFromQuery}` : "/admin/users");
  const backLabel =
    (isQualificationScoped ? "Back to Qualifications" : null) ||
    forcedBackLabel ||
    location.state?.backLabel ||
    (qualificationIdFromQuery ? "Back to Qualification" : "Back to Manage Users");

  return (
    <PageContainer maxWidth="md">
      <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        {backLabel}
      </Button>

      <Snackbar
        open={Boolean(saveMsg)}
        autoHideDuration={3000}
        onClose={() => setSaveMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={actionFailed ? "error" : "success"} onClose={() => setSaveMsg("")} sx={{ width: "100%" }}>
          {saveMsg}
        </Alert>
      </Snackbar>

      <Box sx={{ position: "relative", mb: 4 }}>
        <Box sx={{ position: "absolute", top: 0, right: 0 }}>
          <Button
            variant="contained"
            color={profile.suspended ? "primary" : "error"}
            onClick={handleSuspendedToggle}
            disabled={savingSuspended}
            sx={{ minWidth: 180 }}
          >
            {savingSuspended ? "Saving..." : profile.suspended ? "Unsuspend User" : "Suspend User"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar src={avatarSrc} sx={{ width: 96, height: 96, fontSize: 40, mb: 2 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            {fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.email}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            {profile.activated ? (
              <Chip label="Activated" color="primary" size="small" variant="outlined" />
            ) : (
              <Chip label="Not Activated" color="default" size="small" variant="outlined" />
            )}
            {profile.suspended ? (
              <Chip icon={<CancelIcon />} label="Suspended" color="error" size="small" variant="outlined" />
            ) : (
              <Chip label="Active" color="success" size="small" variant="outlined" />
            )}
          </Box>
        </Box>
      </Box>

      <SectionCard title="User Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="First Name" value={profile.first_name || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Last Name" value={profile.last_name || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" value={profile.email || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Phone Number" value={profile.phone_number || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Postal Address" value={profile.postal_address || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Birthday" value={profile.birthday || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Created At" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString() : ""} InputProps={{ readOnly: true }} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Biography">
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {profile.biography || "No biography added yet."}
        </Typography>
      </SectionCard>

      <SectionCard title="Qualifications">
        {!profile.qualifications || profile.qualifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No qualifications found.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {profile.qualifications.map((qualification, index) => {
              const canReview = qualification.status === "submitted" || qualification.status === "revised";
              const isSaving = savingQualificationId === qualification.id;

              return (
                <Box key={qualification.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {qualification.position_type_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {qualification.status}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleQualificationStatusChange(qualification.id, "rejected")}
                        disabled={!canReview || isSaving}
                      >
                        {isSaving ? "Saving..." : "Reject"}
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleQualificationStatusChange(qualification.id, "approved")}
                        disabled={!canReview || isSaving}
                      >
                        {isSaving ? "Saving..." : "Approve"}
                      </Button>
                    </Box>
                  </Box>
                  {index < profile.qualifications.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>
    </PageContainer>
  );
}
