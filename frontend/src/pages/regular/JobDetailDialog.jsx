import { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockIcon from "@mui/icons-material/Lock";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import { useAuth } from "../../contexts/AuthContext";
import { StatusChip } from "../../components/ui/StatusChip";
import { getJobById, setJobInterest } from "../../api/jobs";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSalary(min, max) {
  const fmt = (v) => `$${Number(v).toFixed(2)}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return "Not specified";
}

function DetailRow({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1 }}>
      {icon}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  );
}

export function JobDetailDialog({ open, jobId, isInterested: initialInterested, onClose, onInterestChanged, userLocation, isInvitation, onInvitationChanged }) {
  const { token } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notQualified, setNotQualified] = useState(false);

  const [interested, setInterested] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestMsg, setInterestMsg] = useState({ type: "", text: "" });

  const [invitationLoading, setInvitationLoading] = useState(false);

  const locationParams = useMemo(() => {
    if (!userLocation) return {};
    return { lat: userLocation.lat, lon: userLocation.lon };
  }, [userLocation]);

  useEffect(() => {
    if (!open || !jobId) return;
    setJob(null);
    setError("");
    setNotQualified(false);
    setInterested(initialInterested ?? false);
    setInterestMsg({ type: "", text: "" });
    loadJob();
  }, [open, jobId, locationParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadJob() {
    setLoading(true);
    try {
      const data = await getJobById(token, jobId, locationParams);
      setJob(data);
    } catch (err) {
      if (err.status === 403) {
        setNotQualified(true);
      } else {
        setError(err.message || "Failed to load job details");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleInterest(wantInterested) {
    setInterestLoading(true);
    setInterestMsg({ type: "", text: "" });
    try {
      const res = await setJobInterest(token, jobId, wantInterested);
      // console.log("res ", res);
      // console.log("res.id ", res.id);
      const newState = res?.candidate?.interested ?? wantInterested;
      setInterested(newState);
      setInterestMsg({
        type: "success",
        text: newState
          ? "You have expressed interest in this job."
          : "You have withdrawn your interest.",
      });
      onInterestChanged?.();
    } catch (err) {
      if (err.status === 403) {
        setInterestMsg({ type: "error", text: "You are not qualified for this position." });
      } else if (err.status === 409) {
        setInterestMsg({ type: "warning", text: err.message || "This job is no longer available." });
      } else if (err.status === 400) {
        setInterestMsg({ type: "info", text: err.message || "Could not update interest." });
      } else {
        setInterestMsg({ type: "error", text: err.message || "Something went wrong." });
      }
    } finally {
      setInterestLoading(false);
    }
  }

  const canExpressInterest =
    job &&
    job.status === "open" &&
    new Date(job.start_time) > new Date();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        Job Details
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {notQualified && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <LockIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Qualification Required
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 340, mx: "auto" }}>
              You need an approved qualification for this position type before you can view its details or express interest.
            </Typography>
            <Button variant="outlined" size="small" href="/regular/qualifications">
              Go to Qualifications
            </Button>
          </Box>
        )}

        {error && !notQualified && (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        )}

        {job && !loading && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {job.position_type?.name}
              </Typography>
              <StatusChip status={job.status} />
            </Box>

            <DetailRow
              icon={<BusinessIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="Business"
              value={job.business?.business_name}
            />
            <DetailRow
              icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="Salary Range"
              value={formatSalary(job.salary_min, job.salary_max)}
            />
            <DetailRow
              icon={<AccessTimeIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="Start"
              value={formatDateTime(job.start_time)}
            />
            <DetailRow
              icon={<AccessTimeIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="End"
              value={formatDateTime(job.end_time)}
            />
            {job.distance != null && (
              <DetailRow
                icon={<PlaceOutlinedIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                label="Distance To Office"
                value={`${job.distance.toFixed(1)} km away · ~${(job.eta * 60).toFixed(0)} min`}
              />
            )}

            {job.note && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <DetailRow
                  icon={<InfoOutlinedIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                  label="Note"
                  value={job.note}
                />
              </>
            )}

            {job.worker && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <DetailRow
                  icon={<WorkIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
                  label="Assigned Worker"
                  value={`${job.worker.first_name} ${job.worker.last_name}`}
                />
              </>
            )}

            {interestMsg.text && (
              <Alert severity={interestMsg.type} sx={{ mt: 2 }} onClose={() => setInterestMsg({ type: "", text: "" })}>
                {interestMsg.text}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      {job && canExpressInterest && !loading && !isInvitation && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          {interested ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<FavoriteIcon />}
              onClick={() => handleInterest(false)}
              disabled={interestLoading}
            >
              {interestLoading ? "Updating..." : "Withdraw Interest"}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<FavoriteBorderIcon />}
              onClick={() => handleInterest(true)}
              disabled={interestLoading}
            >
              {interestLoading ? "Updating..." : "I'm Interested"}
            </Button>
          )}
        </DialogActions>
      )}
      {isInvitation && (
        <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              variant="contained"
              // startIcon={<FavoriteBorderIcon />}
              onClick={async () => {
                setInvitationLoading(true);
                try {
                  await onInvitationChanged?.();
                }
                finally {
                  setInvitationLoading(false);
                }
              }}
              disabled={invitationLoading}
            >
              {invitationLoading ? "Loading..." : "Accept Invitation"}
            </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
