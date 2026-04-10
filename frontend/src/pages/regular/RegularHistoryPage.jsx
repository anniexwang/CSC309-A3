import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusChip } from "../../components/ui/StatusChip";
import { getMyJobHistory } from "../../api/jobs";
import { JobDetailDialog } from "./JobDetailDialog";

const LIMIT = 10;

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
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

export function RegularHistoryPage() {
  const { token } = useAuth();

  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyJobHistory(token, {
        upcoming_page: upcomingPage,
        upcoming_limit: LIMIT,
        history_page: historyPage,
        history_limit: LIMIT,
      });
      const upcomingSection = data.upcoming || {};
      const historySection = data.history || {};

      setUpcomingJobs(upcomingSection.results || []);
      setHistoryJobs(historySection.results || []);
      setUpcomingCount(upcomingSection.count || 0);
      setHistoryCount(historySection.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [historyPage, token, upcomingPage]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingCount / LIMIT));
  const historyTotalPages = Math.max(1, Math.ceil(historyCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        My Jobs
      </Typography>

      {loading ? (
        <LoadingState message="Loading history..." />
      ) : (
        <>
          {error && <ErrorAlert message={error} />}

          <SectionHeader title="Upcoming Jobs" count={upcomingCount} />
          {upcomingJobs.length === 0 ? (
            <EmptyState message="No upcoming shifts assigned yet." />
          ) : (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {upcomingJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewDetails={() => setSelectedJobId(job.id)}
                    timeLabel="Upcoming shift ends"
                  />
                ))}
              </Box>
              {upcomingTotalPages > 1 && (
                <Pagination
                  page={upcomingPage}
                  totalPages={upcomingTotalPages}
                  onPrev={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                  onNext={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}
                />
              )}
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <SectionHeader title="Work History" count={historyCount} />
          {historyJobs.length === 0 ? (
            <EmptyState message="No completed work history yet. Jobs you finish or past assignments will appear here." />
          ) : (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {historyJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewDetails={() => setSelectedJobId(job.id)}
                    timeLabel="Shift ended"
                  />
                ))}
              </Box>
              {historyTotalPages > 1 && (
                <Pagination
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onPrev={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  onNext={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                />
              )}
            </>
          )}
        </>
      )}

      <JobDetailDialog
        open={selectedJobId !== null}
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
      />
    </PageContainer>
  );
}

function SectionHeader({ title, count }) {
  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.75, color: "text.primary" }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {count} record{count !== 1 ? "s" : ""}
      </Typography>
    </>
  );
}

function JobCard({ job, onViewDetails, timeLabel }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
        cursor: "pointer",
      }}
      onClick={onViewDetails}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {job.position_type?.name || "Unknown Position"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
            <BusinessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {job.business?.business_name || "Unknown Business"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
          <StatusChip status={job.status} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2">{formatSalary(job.salary_min, job.salary_max)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">
                Start{" "}
              </Typography>
              {formatDateTime(job.start_time)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">
                {timeLabel}{" "}
              </Typography>
              {formatDateTime(job.end_time)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
