import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";

import { useAuth } from "../../contexts/AuthContext";
import { createJob, updateJob, getPositionTypes } from "../../api/businessJobs";

function toLocalDatetime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function JobFormDialog({ open, job, onClose, onSuccess }) {
  const { token } = useAuth();
  const isEdit = Boolean(job);

  const [positionTypes, setPositionTypes] = useState([]);
  const [form, setForm] = useState({
    position_type_id: "",
    salary_min: "",
    salary_max: "",
    start_time: "",
    end_time: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    getPositionTypes(token)
      .then((data) => setPositionTypes(data.results || []))
      .catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    if (job) {
      setForm({
        position_type_id: String(job.position_type?.id ?? ""),
        salary_min: String(job.salary_min ?? ""),
        salary_max: String(job.salary_max ?? ""),
        start_time: toLocalDatetime(job.start_time),
        end_time: toLocalDatetime(job.end_time),
        note: job.note || "",
      });
    } else {
      setForm({ position_type_id: "", salary_min: "", salary_max: "", start_time: "", end_time: "", note: "" });
    }
    setError("");
  }, [open, job]);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validate() {
    if (!isEdit && !form.position_type_id) return "Position type is required.";
    if (form.salary_min === "" || form.salary_max === "") return "Salary range is required.";
    const min = Number(form.salary_min);
    const max = Number(form.salary_max);
    if (isNaN(min) || isNaN(max)) return "Salary must be a number.";
    if (min < 0) return "Minimum salary cannot be negative.";
    if (max < min) return "Maximum salary must be at least the minimum.";
    if (!form.start_time || !form.end_time) return "Start and end times are required.";
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (start <= new Date()) return "Start time must be in the future.";
    if (end <= start) return "End time must be after start time.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      salary_min: Number(form.salary_min),
      salary_max: Number(form.salary_max),
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      note: form.note || undefined,
    };

    try {
      if (isEdit) {
        await updateJob(token, job.id, payload);
        onSuccess("Job posting updated.");
      } else {
        payload.position_type_id = Number(form.position_type_id);
        await createJob(token, payload);
        onSuccess("Job posting created.");
      }
    } catch (err) {
      if (err.status === 403) {
        setError("Your business must be verified before posting jobs.");
      } else if (err.status === 409) {
        setError(err.message || "This job can no longer be modified.");
      } else {
        setError(err.message || "Failed to save job posting.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? "Edit Job Posting" : "Post New Job"}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2.5 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Position Type */}
        <TextField
          select
          label="Position Type"
          value={form.position_type_id}
          onChange={set("position_type_id")}
          disabled={isEdit}
          required={!isEdit}
          helperText={isEdit ? "Cannot be changed after creation" : undefined}
        >
          <MenuItem value="" disabled>Select a position type</MenuItem>
          {positionTypes.map((pt) => (
            <MenuItem key={pt.id} value={String(pt.id)}>
              {pt.name}
            </MenuItem>
          ))}
        </TextField>

        <Divider />

        {/* Salary */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Salary Range
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Minimum ($)"
              type="number"
              value={form.salary_min}
              onChange={set("salary_min")}
              required
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Maximum ($)"
              type="number"
              value={form.salary_max}
              onChange={set("salary_max")}
              required
              inputProps={{ min: 0 }}
            />
          </Box>
        </Box>

        <Divider />

        {/* Schedule */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Schedule
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Start Time"
              type="datetime-local"
              value={form.start_time}
              onChange={set("start_time")}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Time"
              type="datetime-local"
              value={form.end_time}
              onChange={set("end_time")}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        <Divider />

        {/* Note */}
        <TextField
          label="Note (optional)"
          value={form.note}
          onChange={set("note")}
          multiline
          minRows={3}
          placeholder="Any additional details for candidates..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update" : "Post Job"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
