import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  uploadResume,
  updateAvailability,
} from "../../api/profile";

import {
  getMyQualifications,
} from "../../api/jobs";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const PERSONAL_FIELDS = ["first_name", "last_name", "phone_number", "postal_address", "birthday"];
const BIOGRAPHY_FIELDS = ["biography"];

export function RegularProfilePage() {
  const { token } = useAuth();
  const { refreshProfile } = useOutletContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingSection, setEditingSection] = useState("");
  const [form, setForm] = useState({});
  const [savingSection, setSavingSection] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  const [avatarHover, setAvatarHover] = useState(false);
  const avatarInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [qualificationRequests, setQualificationRequest] = useState([]);


  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyProfile(token);
      setProfile(data);
      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone_number: data.phone_number || "",
        postal_address: data.postal_address || "",
        birthday: data.birthday || "",
        biography: data.biography || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  const loadMyQualifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyQualifications(token);
      console.log("My qualifications:", data);
      setQualificationRequest(data.results || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching my qualifications:", err);
    }
  }, [token]);
    
  useEffect(() => {
    loadMyQualifications();
  }, [loadMyQualifications]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function resetFields(fields, source = profile) {
    if (!source) return;
    setForm((prev) => ({
      ...prev,
      ...Object.fromEntries(fields.map((field) => [field, source[field] ?? ""])),
    }));
  }

  function handleEdit(section) {
    const fields = section === "personal" ? PERSONAL_FIELDS : BIOGRAPHY_FIELDS;
    resetFields(fields);
    setSaveMsg("");
    setEditingSection(section);
  }

  function handleCancel(section) {
    const fields = section === "personal" ? PERSONAL_FIELDS : BIOGRAPHY_FIELDS;
    resetFields(fields);
    setSaveMsg("");
    setEditingSection("");
  }

  function buildPatch(fields) {
    const patch = {};

    fields.forEach((field) => {
      const nextValue = form[field] ?? "";
      const currentValue = profile?.[field] ?? "";
      if (nextValue !== currentValue) {
        patch[field] = nextValue;
      }
    });

    return patch;
  }

  async function handleSave(section) {
    const fields = section === "personal" ? PERSONAL_FIELDS : BIOGRAPHY_FIELDS;
    setSavingSection(section);
    setSaveMsg("");
    try {
      const patch = buildPatch(fields);

      if (Object.keys(patch).length === 0) {
        setEditingSection("");
        return;
      }

      await updateMyProfile(token, patch);
      await loadProfile();
      refreshProfile?.();
      setEditingSection("");
      setSaveMsg(section === "personal" ? "Personal information updated successfully." : "Biography updated successfully.");
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
      await uploadAvatar(token, file);
      await loadProfile();
      refreshProfile?.();
    } catch (err) {
      setSaveMsg(err.message || "Avatar upload failed");
    } finally {
      e.target.value = "";
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadResume(token, file);
      await loadProfile();
      setSaveMsg("Resume uploaded successfully.");
    } catch (err) {
      setSaveMsg(err.message || "Resume upload failed");
    } finally {
      e.target.value = "";
    }
  }

  async function handleAvailabilityToggle(_, checked) {
    try {
      await updateAvailability(token, checked);
      setProfile((prev) => ({ ...prev, available: checked }));
    } catch (err) {
      setSaveMsg(err.message || "Could not update availability");
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
  const resumeName = profile.resume ? decodeURIComponent(profile.resume.split("/").pop()) : null;
  const resumeUrl = profile.resume ? `${API_BASE}${encodeURI(profile.resume)}` : null;
  const isEditingPersonal = editingSection === "personal";
  const isEditingBiography = editingSection === "biography";

  return (
    <PageContainer maxWidth="md">
      {saveMsg && (
        <Alert severity={saveMsg.toLowerCase().includes("fail") || saveMsg.toLowerCase().includes("could not") ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setSaveMsg("")}>
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
            {profile.first_name?.[0]?.toUpperCase()}
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
          {profile.first_name} {profile.last_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">{profile.email}</Typography>

        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={Boolean(profile.available)}
              onChange={handleAvailabilityToggle}
              disabled={profile.suspended}
            />
          }
          label={profile.available ? "Available" : "Unavailable"}
        />
        {profile.suspended && (
          <Typography variant="caption" color="error">Account is suspended</Typography>
        )}
      </Box>

      {/* Personal Information */}
      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Personal Information</Typography>
          {!isEditingPersonal && (
            <Button
              startIcon={<EditIcon />}
              size="small"
              onClick={() => handleEdit("personal")}
              disabled={Boolean(editingSection)}
            >
              Edit
            </Button>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              value={isEditingPersonal ? form.first_name : profile.first_name || ""}
              onChange={handleChange("first_name")}
              InputProps={{ readOnly: !isEditingPersonal }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last Name"
              value={isEditingPersonal ? form.last_name : profile.last_name || ""}
              onChange={handleChange("last_name")}
              InputProps={{ readOnly: !isEditingPersonal }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" value={profile.email || ""} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone Number"
              value={isEditingPersonal ? form.phone_number : profile.phone_number || ""}
              onChange={handleChange("phone_number")}
              InputProps={{ readOnly: !isEditingPersonal }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Postal Address"
              value={isEditingPersonal ? form.postal_address : profile.postal_address || ""}
              onChange={handleChange("postal_address")}
              InputProps={{ readOnly: !isEditingPersonal }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Birthday"
              type={isEditingPersonal ? "date" : "text"}
              value={isEditingPersonal ? form.birthday : profile.birthday || ""}
              onChange={handleChange("birthday")}
              InputProps={{ readOnly: !isEditingPersonal }}
              InputLabelProps={isEditingPersonal ? { shrink: true } : undefined}
            />
          </Grid>
        </Grid>

        {isEditingPersonal && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={() => handleCancel("personal")}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => handleSave("personal")} disabled={savingSection === "personal"}>
              {savingSection === "personal" ? "Saving..." : "Save"}
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
            placeholder="Tell us about yourself..."
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

      {/* Resume */}
      <SectionCard title="Resume">
        {resumeName ? (
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
          <Typography variant="body2" color="text.secondary">No resume uploaded.</Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          sx={{ mt: 1 }}
          onClick={() => resumeInputRef.current?.click()}
        >
          {resumeName ? "Replace Resume" : "Upload Resume"}
        </Button>
        <input ref={resumeInputRef} type="file" accept="application/pdf" hidden onChange={handleResumeUpload} />
      </SectionCard>

      {/* Qualifications */}
      <SectionCard title="Qualifications">
        {qualificationRequests.length === 0 ? 
          <Typography variant="body2" color="text.secondary">
            Your qualifications will appear here. Visit the Qualifications page to manage them.
          </Typography>
        :
          <Box sx={{ columnCount: 3, columnGap: 3 }}>
            {qualificationRequests.map((qualification) => (
              qualification.status === "approved" && <Typography key={qualification.id} variant="body2" color="text.secondary">
                • {qualification.position_type_name}
              </Typography>
            ))}
          </Box>
        }
      </SectionCard>
    </PageContainer>
  );
}
