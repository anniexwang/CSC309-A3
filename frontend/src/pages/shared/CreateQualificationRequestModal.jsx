import { useState, useEffect, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DescriptionIcon from "@mui/icons-material/Description";

import { useAuth } from "../../contexts/AuthContext";
import { uploadQualificationDocument, createQualification, updateQualification } from "../../api/qualifications";
// import { upload } from "../../../../backend/src/middlewares/upload";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function CreateQualificationRequestModal({ open, positionTypeId, existingQualificationRequest, onClose, onSaved }) {
  const { token } = useAuth();
  // const navigate = useNavigate();

  const [note, setNote] = useState("");
  const [qualificationID, setQualificationID] = useState(null);
  const [qualificationStatus, setQualificationStatus] = useState("created");
  const [loading, setLoading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const documentInputRef = useRef(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [documentName, setDocumentName] = useState("");

  const documentUrl = existingQualificationRequest?.document ? `${API_BASE}${encodeURI(existingQualificationRequest.document)}` : null;

  useEffect(() => {
    if (!open) {
      setNote("");
      setQualificationID(null);
      setQualificationStatus("created");
      setSuccessMsg("");
      setApiError("");
      setDocumentName("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (existingQualificationRequest) {
      setQualificationID(existingQualificationRequest.id ?? null);
      setQualificationStatus(existingQualificationRequest.status ?? "created");
    } else {
      setQualificationID(null);
      setQualificationStatus("created");
    }
  }, [open, existingQualificationRequest]);

  async function handleCreate(e) {
    e.preventDefault();
    setApiError("");
    setSuccessMsg("");

    if (!positionTypeId) {
      setApiError("Position type is required.");
      return;
    }

    const payload = {
      position_type_id: positionTypeId,
      note: note.trim(),
    };

    setLoading(true);
    try {
      const res = await createQualification(token, payload);
      setQualificationID(res.id || res.qualification_id);
      setQualificationStatus(res.status || "created");
      setSuccessMsg("Qualification request created successfully!");
    } catch (err) {
      if (err.status === 409) setApiError("A qualification request for this position type already exists.");
      else setApiError(err.message || "Failed to create qualification request.");
    } finally {
      setLoading(false);
    }
  }
  

  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!qualificationID) {
      setApiError("Please create the qualification request first before uploading a document.");
      e.target.value = "";
      return;
    }

    setDocumentUploading(true);

    console.log("Uploading document for qualification ID:", qualificationID);
    try {
      await uploadQualificationDocument(token, file, qualificationID);
      setDocumentName(file.name);
      setSuccessMsg("Document uploaded successfully.");
      setApiError("");
    } catch (err) {
      setApiError(err.message || "Document upload failed");
      setDocumentName("");
    } finally {
      setDocumentUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError("");
    setSuccessMsg("");

    const nextStatus =
      qualificationStatus === "approved" || qualificationStatus === "rejected" || qualificationStatus === "revised"
        ? "revised"
        : "submitted";

    const payload = { status: nextStatus, note: note.trim() };

    setLoading(true);
    try {
      const res = await updateQualification(token, payload, qualificationID);
      setQualificationID(res.id || res.qualification_id);
      setQualificationStatus(res.status || nextStatus);
      setSuccessMsg("Qualification request updated successfully!");
      onSaved?.();
      onClose();
    } catch (err) {
      setApiError(err.message || "Failed to update qualification request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        {existingQualificationRequest ? "Edit Qualification Request" : "Create a Qualification Request"}
        <IconButton size="small" onClick={onClose} disabled={loading || documentUploading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError("")}>
            {apiError}
          </Alert>
        )}

        {successMsg && (
          <Alert severity="success" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }} onClose={() => setSuccessMsg("")}>
            {successMsg}
          </Alert>
        )}

        <Box component="form" onSubmit={handleCreate} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Note/Description Field */}
          {!qualificationID ? (<TextField
            label="Additional Notes"
            placeholder="Add any additional information about this qualification request"
            multiline
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading || qualificationID !== null}
            fullWidth
            variant="outlined"
          />) : (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                Supporting Document
              </Typography>
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
                sx={{ mt: 1, py: 6, flexDirection: "column", gap: 1 }}
                onClick={() => documentInputRef.current?.click()}
              >
                <UploadFileIcon />
                {documentName ? "Replace Document" : "Upload Document"}
              </Button>
              <input ref={documentInputRef} type="file" accept="application/pdf" hidden onChange={handleDocumentUpload} />
              {documentUploading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="textSecondary">
                    Uploading...
                  </Typography>
                </Box>
              )}
            </>
          )}

          {loading && (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Creating qualification request...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {qualificationID ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || documentUploading}
          >
            Submit
          </Button>
        ) : (
          <>
          <Button onClick={onClose} disabled={loading || documentUploading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={loading || documentUploading || !positionTypeId || (qualificationID === null && !note.trim())}
            >
              Create Request
            </Button>
          </>
        )}
          
        
      </DialogActions>
    </Dialog>
  );
}
