import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import EditIcon from "@mui/icons-material/Edit";
import VerifiedIcon from "@mui/icons-material/Verified";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getMyBusiness, updateMyBusiness, uploadBusinessAvatar } from "../../api/businessProfile";
import { geocodeAddress, getNegotiationWindow, updateNegotiationWindow } from "../../api/system";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const BUSINESS_INFO_FIELDS = ["business_name", "owner_name", "phone_number", "postal_address"];
const BUSINESS_BIOGRAPHY_FIELDS = ["biography"];

function secondsToDurationParts(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return { days, hours, minutes };
}

function durationPartsToSeconds(parts) {
  const days = Math.max(0, parseInt(parts.days, 10) || 0);
  const hours = Math.max(0, parseInt(parts.hours, 10) || 0);
  const minutes = Math.max(0, parseInt(parts.minutes, 10) || 0);
  return days * 86400 + hours * 3600 + minutes * 60;
}

function formatDuration(parts) {
  return `${parts.days} days ${parts.hours} hours ${parts.minutes} minutes`;
}

async function geocodeBusinessAddress(token, address) {
  const trimmedAddress = (address || "").trim();
  if (!trimmedAddress) return null;
  const result = await geocodeAddress(token, trimmedAddress);
  return { lat: Number(result.lat), lon: Number(result.lon) };
}

export function BusinessProfilePage() {
  const { token } = useAuth();
  const { refreshProfile } = useOutletContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingSection, setEditingSection] = useState("");
  const [form, setForm] = useState({});
  const [savingSection, setSavingSection] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [negotiationWindowSeconds, setNegotiationWindowSeconds] = useState(0);
  const [negotiationWindowInput, setNegotiationWindowInput] = useState({ days: "0", hours: "0", minutes: "0" });
  const [savingNegotiationWindow, setSavingNegotiationWindow] = useState(false);

  const [avatarHover, setAvatarHover] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyBusiness(token);
      const system = await getNegotiationWindow(token);
      setProfile(data);
      setForm({
        business_name: data.business_name || "",
        owner_name: data.owner_name || "",
        phone_number: data.phone_number || "",
        postal_address: data.postal_address || "",
        biography: data.biography || "",
      });
      const windowSeconds = Number(system.negotiation_window) || 0;
      const windowParts = secondsToDurationParts(windowSeconds);
      setNegotiationWindowSeconds(windowSeconds);
      setNegotiationWindowInput({
        days: String(windowParts.days),
        hours: String(windowParts.hours),
        minutes: String(windowParts.minutes),
      });
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function resetFields(fields, source = profile) {
    if (!source) return;

    const nextValues = {
      business_name: source.business_name || "",
      owner_name: source.owner_name || "",
      phone_number: source.phone_number || "",
      postal_address: source.postal_address || "",
      biography: source.biography || "",
    };

    setForm((prev) => ({
      ...prev,
      ...Object.fromEntries(fields.map((field) => [field, nextValues[field] ?? ""])),
    }));
  }

  function handleEdit(section) {
    const fields = section === "info" ? BUSINESS_INFO_FIELDS : BUSINESS_BIOGRAPHY_FIELDS;
    resetFields(fields);
    setSaveMsg("");
    setEditingSection(section);
  }

  function handleCancel(section) {
    const fields = section === "info" ? BUSINESS_INFO_FIELDS : BUSINESS_BIOGRAPHY_FIELDS;
    resetFields(fields);
    setSaveMsg("");
    setEditingSection("");
  }

  async function handleSave(section) {
    setSavingSection(section);
    setSaveMsg("");
    try {
      const patch = {};

      if (section === "info") {
        if (form.business_name !== profile.business_name) patch.business_name = form.business_name;
        if (form.owner_name !== profile.owner_name) patch.owner_name = form.owner_name;
        if (form.phone_number !== (profile.phone_number || "")) patch.phone_number = form.phone_number;
        if (form.postal_address !== (profile.postal_address || "")) {
          patch.postal_address = form.postal_address;
          const geocoded = await geocodeBusinessAddress(token, form.postal_address);
          if (geocoded) {
            patch.location = geocoded;
          }
        }
      } else if (form.biography !== (profile.biography || "")) {
        patch.biography = form.biography;
      }

      if (Object.keys(patch).length === 0) {
        setEditingSection("");
        return;
      }

      await updateMyBusiness(token, patch);
      await loadProfile();
      refreshProfile?.();
      setEditingSection("");
      setSaveMsg(section === "info" ? "Business information updated successfully." : "Biography updated successfully.");
    } catch (err) {
      setSaveMsg(err.message || "Failed to save");
    } finally {
      setSavingSection("");
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadBusinessAvatar(token, file);
      await loadProfile();
      refreshProfile?.();
    } catch (err) {
      setSaveMsg(err.message || "Avatar upload failed");
    } finally {
      e.target.value = "";
    }
  }

  async function handleNegotiationWindowSave() {
    const nextSeconds = durationPartsToSeconds(negotiationWindowInput);
    if (!Number.isFinite(nextSeconds) || nextSeconds <= 0) {
      setSaveMsg("Negotiation time limit must be at least 1 minute.");
      return;
    }

    setSavingNegotiationWindow(true);
    try {
      const res = await updateNegotiationWindow(token, nextSeconds);
      const savedSeconds = Number(res.negotiation_window) || 0;
      const savedParts = secondsToDurationParts(savedSeconds);
      setNegotiationWindowSeconds(savedSeconds);
      setNegotiationWindowInput({
        days: String(savedParts.days),
        hours: String(savedParts.hours),
        minutes: String(savedParts.minutes),
      });
      setSaveMsg("Negotiation time limit updated successfully.");
    } catch (err) {
      setSaveMsg(err.message || "Failed to update negotiation time limit");
    } finally {
      setSavingNegotiationWindow(false);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading profile..." />
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
  const isEditingInfo = editingSection === "info";
  const isEditingBiography = editingSection === "biography";

  return (
    <PageContainer maxWidth="md">
      {saveMsg && (
        <Alert severity={saveMsg.toLowerCase().includes("fail") ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setSaveMsg("")}>
          {saveMsg}
        </Alert>
      )}

      {/* Avatar + Name */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 4 }}>
        <Box
          sx={{ position: "relative", mb: 2 }}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
        >
          <Avatar src={avatarSrc} sx={{ width: 96, height: 96, fontSize: 40 }}>
            {profile.business_name?.[0]?.toUpperCase()}
          </Avatar>
          {avatarHover && (
            <IconButton
              sx={{
                position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.4)",
                color: "#fff", borderRadius: "50%", "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
              }}
              onClick={() => avatarInputRef.current?.click()}
            >
              <CameraAltIcon />
            </IconButton>
          )}
          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleAvatarUpload} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          {profile.business_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">{profile.email}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          {profile.verified ? (
            <Chip icon={<VerifiedIcon />} label="Verified" color="success" size="small" variant="outlined" />
          ) : (
            <Chip label="Not Verified" color="warning" size="small" variant="outlined" />
          )}
        </Box>
      </Box>

      {/* Business Information */}
      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Business Information</Typography>
          {!isEditingInfo && (
            <Button
              startIcon={<EditIcon />}
              size="small"
              onClick={() => handleEdit("info")}
              disabled={Boolean(editingSection)}
            >
              Edit
            </Button>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Business Name"
              value={isEditingInfo ? form.business_name : profile.business_name || ""}
              onChange={handleChange("business_name")}
              InputProps={{ readOnly: !isEditingInfo }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Owner Name"
              value={isEditingInfo ? form.owner_name : profile.owner_name || ""}
              onChange={handleChange("owner_name")}
              InputProps={{ readOnly: !isEditingInfo }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" value={profile.email || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={isEditingInfo ? form.phone_number : profile.phone_number || ""}
              onChange={handleChange("phone_number")}
              InputProps={{ readOnly: !isEditingInfo }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Postal Address"
              value={isEditingInfo ? form.postal_address : profile.postal_address || ""}
              onChange={handleChange("postal_address")}
              InputProps={{ readOnly: !isEditingInfo }}
            />
          </Grid>
        </Grid>

        {isEditingInfo && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={() => handleCancel("info")}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => handleSave("info")} disabled={savingSection === "info"}>
              {savingSection === "info" ? "Saving..." : "Save"}
            </Button>
          </Box>
        )}
      </SectionCard>

      {/* Biography */}
      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Biography</Typography>
          {!isEditingBiography && (
            <Button
              startIcon={<EditIcon />}
              size="small"
              onClick={() => handleEdit("biography")}
              disabled={Boolean(editingSection)}
            >
              Edit
            </Button>
          )}
        </Box>
        {isEditingBiography ? (
          <TextField
            multiline
            minRows={3}
            value={form.biography}
            onChange={handleChange("biography")}
            placeholder="Tell us about your business..."
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {profile.biography || "No biography added yet."}
          </Typography>
        )}
        {isEditingBiography && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={() => handleCancel("biography")}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => handleSave("biography")} disabled={savingSection === "biography"}>
              {savingSection === "biography" ? "Saving..." : "Save"}
            </Button>
          </Box>
        )}
      </SectionCard>

      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Negotiation Time Limit</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current value: {formatDuration(secondsToDurationParts(negotiationWindowSeconds))}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
          <TextField
            label="Days"
            type="number"
            size="small"
            value={negotiationWindowInput.days}
            onChange={(e) => setNegotiationWindowInput((prev) => ({ ...prev, days: e.target.value }))}
            inputProps={{ min: 0 }}
            sx={{ width: { xs: "100%", sm: 70 } }}
          />
          <TextField
            label="Hours"
            type="number"
            size="small"
            value={negotiationWindowInput.hours}
            onChange={(e) => setNegotiationWindowInput((prev) => ({ ...prev, hours: e.target.value }))}
            inputProps={{ min: 0 }}
            sx={{ width: { xs: "100%", sm: 70 } }}
          />
          <TextField
            label="Minutes"
            type="number"
            size="small"
            value={negotiationWindowInput.minutes}
            onChange={(e) => setNegotiationWindowInput((prev) => ({ ...prev, minutes: e.target.value }))}
            inputProps={{ min: 0 }}
            sx={{ width: { xs: "100%", sm: 70 } }}
          />
          <Button
            variant="contained"
            onClick={handleNegotiationWindowSave}
            disabled={savingNegotiationWindow || durationPartsToSeconds(negotiationWindowInput) === negotiationWindowSeconds}
            size="small"
            sx={{ height: 40, px: 1.5 }}
          >
            {savingNegotiationWindow ? "Saving..." : "Update Limit"}
          </Button>
        </Box>
      </SectionCard>
    </PageContainer>
  );
}
