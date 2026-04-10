import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Chip from "@mui/material/Chip";
import VerifiedIcon from "@mui/icons-material/Verified";
import CancelIcon from "@mui/icons-material/Cancel";
import BusinessIcon from "@mui/icons-material/Business";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../api/client";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getBusinessById } from "../../api/businesses";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function AdminManageBusinessPage() {
  const { token } = useAuth();
  const { businessId } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [savingVerified, setSavingVerified] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await getBusinessById(token, businessId);
      setProfile(data);
    } catch (err) {
      setError(err.message || "Failed to load business");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifiedToggle() {
    if (!profile) return;

    setSavingVerified(true);
    setSaveMsg("");
    try {
      const updated = await apiRequest(`/businesses/${businessId}/verified`, {
        method: "PATCH",
        token,
        data: { verified: !profile.verified },
      });
      setProfile((prev) => ({
        ...prev,
        verified: updated.verified,
      }));
      setSaveMsg(updated.verified ? "Business verified successfully." : "Business verification removed.");
    } catch (err) {
      setSaveMsg(err.message || "Failed to update verification status.");
    } finally {
      setSavingVerified(false);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading business..." />
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

  return (
    <PageContainer maxWidth="md">
      <Button component={RouterLink} to="/admin/businesses" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Manage Businesses
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
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar src={avatarSrc} sx={{ width: 96, height: 96, fontSize: 40, mb: 2 }}>
            <BusinessIcon />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            {profile.business_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.email}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            {profile.verified ? (
              <Chip icon={<VerifiedIcon />} label="Verified" color="success" size="small" variant="outlined" />
            ) : (
              <Chip icon={<CancelIcon />} label="Not Verified" color="error" size="small" variant="outlined" />
            )}
            {profile.activated ? (
              <Chip label="Activated" color="primary" size="small" variant="outlined" />
            ) : (
              <Chip label="Not Activated" color="default" size="small" variant="outlined" />
            )}
          </Box>
        </Box>
      </Box>

      <SectionCard title="Business Information">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Business Name" value={profile.business_name || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Owner Name" value={profile.owner_name || ""} InputProps={{ readOnly: true }} />
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
            <TextField label="Latitude" value={profile.location?.lat ?? ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Longitude" value={profile.location?.lon ?? ""} InputProps={{ readOnly: true }} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Biography">
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {profile.biography || "No biography added yet."}
        </Typography>
      </SectionCard>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Button
          variant="contained"
          color={profile.verified ? "error" : "primary"}
          onClick={handleVerifiedToggle}
          disabled={savingVerified}
          sx={{ minWidth: 190 }}
        >
          {savingVerified ? "Saving..." : profile.verified ? "Remove Verification" : "Verify Business"}
        </Button>
      </Box>
    </PageContainer>
  );
}
