import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import HandshakeIcon from "@mui/icons-material/Handshake";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import { useAuth } from "../../contexts/AuthContext";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState } from "../../components/ui/EmptyState";
import { getJobInterests } from "../../api/businessCandidates";
import { createNegotiation } from "../../api/negotiations";
import { CandidateDetailDialog } from "./CandidateDetailDialog";

const LIMIT = 10;

export function JobInterestsDialog({ open, job, onClose }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [interests, setInterests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [startingNeg, setStartingNeg] = useState(null);

  const [detailUserId, setDetailUserId] = useState(null);

  const handleStartNegotiation = async (e, interestId) => {
    e.stopPropagation();
    setStartingNeg(interestId);
    setError("");
    try {
      const negotiation = await createNegotiation(token, interestId);
      onClose();
      navigate(`/negotiations/${negotiation.id}`);
    } catch (err) {
      setError(err.message || "Failed to start negotiation");
    } finally {
      setStartingNeg(null);
    }
  };

  const loadInterests = useCallback(async () => {
    if (!open || !job) return;
    setLoading(true);
    setError("");
    try {
      const data = await getJobInterests(token, job.id, { page, limit: LIMIT });
      setInterests(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load interests");
    } finally {
      setLoading(false);
    }
  }, [token, job, open, page]);

  useEffect(() => {
    if (open && job) {
      setPage(1);
      setInterests([]);
    }
  }, [open, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <>
      <Dialog open={open && !detailUserId} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Interested Users — {job?.position_type?.name}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={32} /></Box>
          ) : interests.length === 0 ? (
            <EmptyState message="No users have expressed interest in this job yet." />
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {totalCount} interested user{totalCount !== 1 ? "s" : ""}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {interests.map((item) => (
                  <Box
                    key={item.interest_id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                    onClick={() => setDetailUserId(item.user?.id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36 }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.user?.first_name} {item.user?.last_name}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.mutual ? (
                        <>
                          <Chip
                            icon={<HandshakeIcon sx={{ fontSize: 16 }} />}
                            label="Mutual Interest"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => handleStartNegotiation(e, item.interest_id)}
                            disabled={startingNeg === item.interest_id}
                          >
                            {startingNeg === item.interest_id ? "Starting…" : "Negotiate"}
                          </Button>
                        </>
                      ) : (
                        <Chip label="Candidate Interested" size="small" variant="outlined" color="default" />
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <CandidateDetailDialog
        open={detailUserId !== null}
        jobId={job?.id}
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
      />
    </>
  );
}
