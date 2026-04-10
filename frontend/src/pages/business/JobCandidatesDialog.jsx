import { useState, useEffect, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import UndoIcon from "@mui/icons-material/Undo";

import { useAuth } from "../../contexts/AuthContext";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState } from "../../components/ui/EmptyState";
import { getJobCandidates, setCandidateInterested } from "../../api/businessCandidates";
import { CandidateDetailDialog } from "./CandidateDetailDialog";

const LIMIT = 10;

export function JobCandidatesDialog({ open, job, onClose }) {
  const { token } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const [detailUserId, setDetailUserId] = useState(null);

  const loadCandidates = useCallback(async () => {
    if (!open || !job) return;
    setLoading(true);
    setError("");
    try {
      const data = await getJobCandidates(token, job.id, { page, limit: LIMIT });
      setCandidates(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [token, job, open, page]);

  useEffect(() => {
    if (open && job) {
      setPage(1);
      setCandidates([]);
    }
  }, [open, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  async function handleInvite(userId, interested) {
    setActionLoading(userId);
    try {
      await setCandidateInterested(token, job.id, userId, interested);
      await loadCandidates();
    } catch (err) {
      setError(err.message || "Failed to update invitation");
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <>
      <Dialog open={open && !detailUserId} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Candidates — {job?.position_type?.name}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={32} /></Box>
          ) : candidates.length === 0 ? (
            <EmptyState message="No discoverable candidates for this job." />
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {totalCount} discoverable candidate{totalCount !== 1 ? "s" : ""}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {candidates.map((c) => (
                  <Box
                    key={c.id}
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
                    onClick={() => setDetailUserId(c.id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {c.first_name} {c.last_name}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} onClick={(e) => e.stopPropagation()}>
                      {c.invited ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<UndoIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleInvite(c.id, false)}
                          disabled={actionLoading === c.id}
                        >
                          Withdraw
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleInvite(c.id, true)}
                          disabled={actionLoading === c.id}
                        >
                          Invite
                        </Button>
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
