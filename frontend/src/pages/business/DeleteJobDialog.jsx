import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

import { useAuth } from "../../contexts/AuthContext";
import { deleteJob } from "../../api/businessJobs";

export function DeleteJobDialog({ open, job, onClose, onDeleted }) {
  const { token } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!job) return;
    setDeleting(true);
    setError("");
    try {
      await deleteJob(token, job.id);
      onDeleted();
    } catch (err) {
      if (err.status === 409) {
        setError(err.message || "Cannot delete: this job has active negotiations.");
      } else {
        setError(err.message || "Failed to delete job posting.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle>Delete Job Posting</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2">
          Are you sure you want to delete the <strong>{job?.position_type?.name}</strong> posting? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={handleConfirm} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
