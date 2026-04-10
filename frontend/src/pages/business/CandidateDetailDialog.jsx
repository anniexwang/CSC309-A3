import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import WorkIcon from "@mui/icons-material/Work";
import NoteIcon from "@mui/icons-material/Note";

import { useAuth } from "../../contexts/AuthContext";
import { getCandidateDetail } from "../../api/businessCandidates";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function InfoRow({ icon, label, value, isLink, linkText = "View Document" }) {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 0.75 }}>
      {icon}
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        {isLink ? (
          <Typography
            variant="body2"
            component="a"
            href={value.startsWith("http") ? value : `${API_BASE}${value}`}
            target="_blank"
            rel="noopener"
            sx={{ display: "block", color: "primary.main", textDecoration: "underline" }}
          >
            {linkText}
          </Typography>
        ) : (
          <Typography variant="body2">{value}</Typography>
        )}
      </Box>
    </Box>
  );
}

export function CandidateDetailDialog({ open, jobId, userId, onClose }) {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !jobId || !userId) return;
    setData(null);
    setError("");
    setLoading(true);
    getCandidateDetail(token, jobId, userId)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || "Failed to load candidate details"))
      .finally(() => setLoading(false));
  }, [open, jobId, userId, token]);

  const user = data?.user;
  const qual = user?.qualification;
  const avatarSrc = user?.avatar ? `${API_BASE}${user.avatar}` : undefined;
  const qualificationDocumentName = qual?.document
    ? decodeURIComponent(qual.document.split("/").pop())
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Candidate Details
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={32} /></Box>
        )}

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {user && !loading && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar src={avatarSrc} sx={{ width: 56, height: 56 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {user.first_name} {user.last_name}
                </Typography>
              </Box>
            </Box>

            {user.email && (
              <InfoRow
                icon={<EmailIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                label="Email"
                value={user.email}
              />
            )}
            {user.phone_number && (
              <InfoRow
                icon={<PhoneIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                label="Phone"
                value={user.phone_number}
              />
            )}

            {user.biography && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary">Biography</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                  {user.biography}
                </Typography>
              </>
            )}

            {user.resume && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <InfoRow
                  icon={<DescriptionIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                  label="Resume"
                  value={user.resume}
                  isLink
                />
              </>
            )}

            {qual && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Qualification</Typography>
                <InfoRow
                  icon={<WorkIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                  label="Position Type"
                  value={`${data.job?.position_type?.name || "Unknown"}`}
                />
                {qual.note && (
                  <InfoRow
                    icon={<NoteIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                    label="Note"
                    value={qual.note}
                  />
                )}
                {qual.document && (
                  <InfoRow
                    icon={<DescriptionIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                    label="Qualification Document"
                    value={qual.document}
                    isLink
                    linkText={qualificationDocumentName ? `View Qualification Document (${qualificationDocumentName})` : "View Qualification Document"}
                  />
                )}
                {!qual.document && (
                  <InfoRow
                    icon={<DescriptionIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                    label="Qualification Document"
                    value="No qualification document uploaded."
                  />
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
