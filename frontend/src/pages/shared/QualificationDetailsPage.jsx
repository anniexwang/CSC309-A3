import { useState, useEffect, useRef } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import TextField from "@mui/material/TextField";
import { StatusChip } from "../../components/ui/StatusChip";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getQualificationById } from "../../api/qualifications";
import { uploadQualificationDocument } from "../../api/qualifications";
import { SectionCard } from "../../components/ui/SectionCard";
import DescriptionIcon from "@mui/icons-material/Description";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { updateQualification } from "../../api/qualifications"
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getNextRegularQualificationStatus(currentStatus) {
  return currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "revised"
    ? "revised"
    : "submitted";
}

export function QualificationDetailsPage() {
  const { qualificationId } = useParams();
  const { token } = useAuth();

  const [qualification, setQualification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documentName, setDocumentName] = useState(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [note, setNote] = useState("");
  const [originalNote, setOriginalNote] = useState("");

  const documentInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();
  

  useEffect(() => {
    setLoading(true);
    setError("");
    getQualificationById(token || undefined, qualificationId)
      .then((data) => {
        setQualification(data);
        setNote(data.note || "");
        setOriginalNote(data.note || "");
        setDocumentName(data.document ? decodeURIComponent(data.document.split("/").pop()) : null);
      })
      .catch((err) => setError(err.message || "Qualification not found"))
      .finally(() => setLoading(false));
  }, [token, qualificationId]);

  console.log("qualification ", qualification);
  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <LoadingState message="Loading qualification details..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="md">
        <ErrorAlert message={error} />
        <Button component={RouterLink} to="/regular/qualifications" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Back to My Qualifications
        </Button>
      </PageContainer>
    );
  }

  const documentUrl = qualification.document ? `${API_BASE}${encodeURI(qualification.document)}` : null;

  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentUploading(true);

    try {
      const res = await uploadQualificationDocument(token, file, qualificationId);
      setQualification((prev) => (prev ? { ...prev, document: res.document } : prev));
      setDocumentName(decodeURIComponent(res.document.split("/").pop()));
      setApiError("");
    } catch (err) {
      setApiError(err.message || "Document upload failed");
      setDocumentName(qualification.document ? decodeURIComponent(qualification.document.split("/").pop()) : "");
    } finally {
      setDocumentUploading(false);
      e.target.value = "";
    }
  }

  const handleChange = (e) => setNote(e.target.value);

  const handleCancel = () => {
    setNote(originalNote);
    setIsEditing(false);
    setApiError("");
  };

  async function handleSave(e) {
    e.preventDefault();
    const trimmedNote = note.trim();
    const trimmedOriginalNote = originalNote.trim();

    if (trimmedNote === trimmedOriginalNote) {
      setIsEditing(false);
      setApiError("");
      return;
    }

    if (!trimmedNote) {
      setApiError("Qualification note cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateQualification(token, { note: trimmedNote }, qualificationId);
      setQualification(res);
      setNote(res.note || "");
      setOriginalNote(res.note || "");
      setApiError("");
      setIsEditing(false);
    } catch (err) {
      setApiError(err.message || "Failed to save qualification note.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const nextStatus = getNextRegularQualificationStatus(qualification.status);
    const trimmedNote = note.trim();
    const payload = { status: nextStatus, note: trimmedNote };

    setLoading(true);
    try {
      const res = await updateQualification(token, payload, qualificationId);
      setQualification(res);
      navigate("/regular/qualifications");
    } catch (err) {
      setApiError(err.message || "Failed to submit qualification request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer maxWidth="md">
      <Button component={RouterLink} to="/regular/qualifications" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
        Back to My Qualifications
      </Button>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
          <Avatar src={""} sx={{ width: 96, height: 96, fontSize: 40, mb: 2 }}>
            <WorkOutlineIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            {qualification.position_type.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {qualification.position_type.description}
          </Typography>
          <Box sx={{ mt: 1 }}>
                <StatusChip status={qualification.status} />
            </Box>
        </Box>
      </Paper>
      {apiError && (
        <ErrorAlert message={apiError} />
      )}

      {/* Document */}
      <SectionCard title="Qualification Document">
        {documentName ? (
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
          <Typography variant="body2" color="text.secondary">No document uploaded.</Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          sx={{ mt: 1 }}
          onClick={() => documentInputRef.current?.click()}
        >
          {documentName ? "Replace Document" : "Upload Document"}
        </Button>
        <input ref={documentInputRef} type="file" accept="application/pdf" hidden onChange={handleDocumentUpload} />
      </SectionCard>

      {/* Note */}
      <SectionCard>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Qualification Note</Typography>
          {!isEditing && (
            <Button
              startIcon={<EditIcon />}
              size="small"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </Box>
        {isEditing ? (
          <TextField
            multiline
            minRows={3}
            value={note}
            onChange={handleChange}
            placeholder="Enter qualification note..."
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {qualification.note || "No qualification note added yet."}
          </Typography>
        )}
        {isEditing && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save Note
            </Button>
          </Box>
        )}
      </SectionCard>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
            size="small"
            variant="outlined"
            color="primary"
            sx={{ whiteSpace: "nowrap", flexShrink: 0}}
            onClick={handleSubmit}
        >
            {qualification.status === "approved" || qualification.status === "rejected" || qualification.status === "revised"
              ? "Re-submit"
              : "Submit"}
        </Button>
        </Box>
    </PageContainer>
  );
}
