import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SearchIcon from "@mui/icons-material/Search";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusChip } from "../../components/ui/StatusChip";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

import { getMyJobs, deleteJob, updateJob } from "../../api/businessJobs";
import { reportNoShow } from "../../api/businessCandidates";
import { getMyBusiness } from "../../api/businessProfile";
import { JobFormDialog } from "./JobFormDialog";
import { DeleteJobDialog } from "./DeleteJobDialog";
import { JobCandidatesDialog } from "./JobCandidatesDialog";
import { JobInterestsDialog } from "./JobInterestsDialog";
import { getPositionTypes } from "../../api/jobs";

const TAB_UPCOMING = "upcoming";
const TAB_ONGOING = "ongoing";
const TAB_HISTORY = "history";

const LIMIT = 10;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "filled", label: "Filled" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "expired", label: "Expired" },
];
// const SORT_OPTIONS = [
//   { value: "section-default", label: "Section default" },
//   { value: "recent-update", label: "Recently updated" },
//   { value: "start-asc", label: "Start time (earliest)" },
//   { value: "start-desc", label: "Start time (latest)" },
//   { value: "salary-high", label: "Salary (high to low)" },
//   { value: "salary-low", label: "Salary (low to high)" },
// ];
const SORT_OPTIONS = [
  { value: "start_time", label: "Start Time" },
  { value: "salary_min", label: "Min Salary" },
  { value: "salary_max", label: "Max Salary" },
  { value: "updatedAt", label: "Recently Updated" },
];

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

function isJobEditable(job) {
  return job.status === "open" && new Date(job.start_time) > new Date();
}

function isJobDeletable(job) {
  return job.status === "open" || job.status === "expired";
}

function classifyJobBucket(job, now = new Date()) {
  const start = new Date(job.start_time);
  const end = new Date(job.end_time);

  if ((job.status === "open" || job.status === "filled") && start > now) {
    return TAB_UPCOMING;
  }

  if (job.status === "filled" && start <= now && now < end) {
    return TAB_ONGOING;
  }

  return TAB_HISTORY;
}

function sortJobs(jobs, sortMode, order, tab) {
  const list = [...jobs];
  if (sortMode === "start_time") {
    if (order === "asc") {
      if (tab === TAB_UPCOMING) return list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      if (tab === TAB_ONGOING) return list.sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
    }
    return list.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
  }
  if (sortMode === "updatedAt" && order === "asc") return list.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  if (sortMode === "updatedAt" && order === "desc") return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (sortMode === "start_time" && order === "asc") return list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  if (sortMode === "start_time" && order === "desc") return list.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  if (sortMode === "salary_max" && order === "asc") return list.sort((a, b) => Number(a.salary_max || 0) - Number(b.salary_max || 0));
  if (sortMode === "salary_max" && order === "desc") return list.sort((a, b) => Number(b.salary_max || 0) - Number(a.salary_max || 0));
  if (sortMode === "salary_min" && order === "asc") return list.sort((a, b) => Number(a.salary_min || 0) - Number(b.salary_min || 0));
  if (sortMode === "salary_min" && order === "desc") return list.sort((a, b) => Number(b.salary_min || 0) - Number(a.salary_min || 0));
  return list;
}

export function BusinessJobsPage() {
  const { token } = useAuth();

  const [allJobs, setAllJobs] = useState([]);
  const [positionTypes, setPositionTypes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeTab, setActiveTab] = useState(TAB_UPCOMING);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [ongoingPage, setOngoingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("start_time");
  const [order, setOrder] = useState("asc");
  const [positionTypeId, setPositionTypeId] = useState("");

  const [verified, setVerified] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [candidatesJob, setCandidatesJob] = useState(null);
  const [interestsJob, setInterestsJob] = useState(null);

  useEffect(() => {
    getMyBusiness(token)
      .then((data) => setVerified(data.verified ?? false))
      .catch(() => setVerified(false));
  }, [token]);

  useEffect(() => {
    getPositionTypes(token)
      .then((data) => setPositionTypes(data.results))
      .catch(() => setPositionTypes([]))
  }, [token]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyJobs(token, { page: 1, limit: 500 });
      setAllJobs(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to load job postings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function handleCreateClick() {
    setEditingJob(null);
    setFormOpen(true);
  }

  function handleEditClick(job) {
    setEditingJob(job);
    setFormOpen(true);
  }

  function handleFormSuccess(msg) {
    setFormOpen(false);
    setEditingJob(null);
    setSuccessMsg(msg);
    loadJobs();
  }

  function handleDeleteSuccess() {
    setDeleteTarget(null);
    setSuccessMsg("Job posting deleted.");
    loadJobs();
  }

  async function handleNoShow(job) {
    if (!confirm(`Report no-show for the worker on "${job.position_type?.name}"? This will cancel the job and suspend the worker.`)) return;
    try {
      await reportNoShow(token, job.id);
      setSuccessMsg("No-show reported. The job has been cancelled and the worker suspended.");
      loadJobs();
    } catch (err) {
      setError(err.message || "Failed to report no-show");
    }
  }

  async function handleMarkCompleted(job) {
    try {
      await updateJob(token, job.id, { status: "completed" });
      setSuccessMsg("Job marked as completed.");
      setCompleteTarget(null);
      loadJobs();
    } catch (err) {
      setError(err.message || "Failed to mark job as completed");
    }
  }

  const now = new Date();
  const filteredJobs = allJobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (positionTypeId && String(job.position_type?.id) !== String(positionTypeId)) return false;
    if (!searchQuery) return true;
    const normalized = searchQuery.toLowerCase();
    const haystack = [
      job.position_type?.name,
      job.status,
      job.worker ? `${job.worker.first_name} ${job.worker.last_name}` : "",
      job.note,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });

  const upcomingJobs = sortJobs(filteredJobs
    .filter((job) => classifyJobBucket(job, now) === TAB_UPCOMING)
  , sortMode, order, TAB_UPCOMING);
  const ongoingJobs = sortJobs(filteredJobs
    .filter((job) => classifyJobBucket(job, now) === TAB_ONGOING)
  , sortMode, order, TAB_ONGOING);
  const historyJobs = sortJobs(filteredJobs
    .filter((job) => classifyJobBucket(job, now) === TAB_HISTORY)
  , sortMode, order, TAB_HISTORY);

  const tabCounts = {
    [TAB_UPCOMING]: upcomingJobs.length,
    [TAB_ONGOING]: ongoingJobs.length,
    [TAB_HISTORY]: historyJobs.length,
  };

  const pagedUpcomingJobs = upcomingJobs.slice((upcomingPage - 1) * LIMIT, upcomingPage * LIMIT);
  const pagedOngoingJobs = ongoingJobs.slice((ongoingPage - 1) * LIMIT, ongoingPage * LIMIT);
  const pagedHistoryJobs = historyJobs.slice((historyPage - 1) * LIMIT, historyPage * LIMIT);

  const jobs = activeTab === TAB_UPCOMING
    ? pagedUpcomingJobs
    : activeTab === TAB_ONGOING
      ? pagedOngoingJobs
      : pagedHistoryJobs;

  const totalCount = tabCounts[activeTab];
  const activePage = activeTab === TAB_UPCOMING ? upcomingPage : activeTab === TAB_ONGOING ? ongoingPage : historyPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  function resetSectionPages() {
    setUpcomingPage(1);
    setOngoingPage(1);
    setHistoryPage(1);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    resetSectionPages();
  }

  function handleResetFilters() {
    setSearchInput("");
    setSearchQuery("");
    setPositionTypeId("");
    setStatusFilter("all");
    setSortMode("start_time");
    setOrder("asc");
    resetSectionPages();
  }

  return (
    <PageContainer maxWidth="lg">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ color: "text.primary" }}>
          My Job Postings
        </Typography>
        {verified === false ? (
          <Tooltip title="Your business must be verified before you can post jobs">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <WarningAmberIcon color="warning" fontSize="small" />
              <Typography variant="body2" color="warning.main">Not Verified</Typography>
            </Box>
          </Tooltip>
        ) : verified ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateClick}>
            Post New Job
          </Button>
        ) : null}
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search job postings..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearchSubmit(event);
                    }
                  }}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />,
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                select
                fullWidth
                label="Position Type"
                value={positionTypeId}
                onChange={(event) => {
                  setPositionTypeId(event.target.value);
                  resetSectionPages();
                }}
                size="small"
                slotProps={{
                  select: {
                    displayEmpty: true,
                  },
                  inputLabel: {
                    shrink: true,
                  },
                }}
              >
                <MenuItem value="">All Positions</MenuItem>
                {positionTypes.map((pt) => (
                  <MenuItem key={pt.id} value={String(pt.id)}>
                    {pt.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  resetSectionPages();
                }}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Sort"
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value);
                  resetSectionPages();
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Order"
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value);
                  resetSectionPages();
                }}
                size="small"
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handleResetFilters}>Reset</Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setActiveTab(value)}
          variant="fullWidth"
        >
          <Tab value={TAB_UPCOMING} label={`Upcoming (${tabCounts[TAB_UPCOMING]})`} />
          <Tab value={TAB_ONGOING} label={`Ongoing (${tabCounts[TAB_ONGOING]})`} />
          <Tab value={TAB_HISTORY} label={`History (${tabCounts[TAB_HISTORY]})`} />
        </Tabs>
      </Paper>

      {/* Results */}
      {loading ? (
        <LoadingState message="Loading job postings..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : jobs.length === 0 ? (
        <EmptyState
          message={
            activeTab === TAB_UPCOMING
              ? "No upcoming jobs found."
              : activeTab === TAB_ONGOING
                ? "No ongoing jobs right now."
                : "No job history found."
          }
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount} posting{totalCount !== 1 ? "s" : ""} in this section
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onEdit={() => handleEditClick(job)}
                onDelete={() => setDeleteTarget(job)}
                onCandidates={() => setCandidatesJob(job)}
                onInterests={() => setInterestsJob(job)}
                onNoShow={() => handleNoShow(job)}
                onMarkCompleted={() => setCompleteTarget(job)}
              />
            ))}
          </Box>

          {totalPages > 1 && (
            <Pagination
              page={activePage}
              totalPages={totalPages}
              onPrev={() => {
                if (activeTab === TAB_UPCOMING) setUpcomingPage((p) => Math.max(1, p - 1));
                else if (activeTab === TAB_ONGOING) setOngoingPage((p) => Math.max(1, p - 1));
                else setHistoryPage((p) => Math.max(1, p - 1));
              }}
              onNext={() => {
                if (activeTab === TAB_UPCOMING) setUpcomingPage((p) => Math.min(totalPages, p + 1));
                else if (activeTab === TAB_ONGOING) setOngoingPage((p) => Math.min(totalPages, p + 1));
                else setHistoryPage((p) => Math.min(totalPages, p + 1));
              }}
            />
          )}
        </>
      )}

      <JobFormDialog
        open={formOpen}
        job={editingJob}
        onClose={() => { setFormOpen(false); setEditingJob(null); }}
        onSuccess={handleFormSuccess}
      />

      <DeleteJobDialog
        open={deleteTarget !== null}
        job={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleteSuccess}
      />

      <Dialog
        open={completeTarget !== null}
        onClose={() => setCompleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Mark Job as Completed</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Mark "{completeTarget?.position_type?.name || "this job"}" as completed?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCompleteTarget(null)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => completeTarget && handleMarkCompleted(completeTarget)}
            variant="contained"
            color="success"
          >
            Mark Completed
          </Button>
        </DialogActions>
      </Dialog>

      <JobCandidatesDialog
        open={candidatesJob !== null}
        job={candidatesJob}
        onClose={() => setCandidatesJob(null)}
      />

      <JobInterestsDialog
        open={interestsJob !== null}
        job={interestsJob}
        onClose={() => setInterestsJob(null)}
      />
    </PageContainer>
  );
}

function isNoShowAllowed(job) {
  if (job.status !== "filled" || !job.worker) return false;
  const now = new Date();
  return now >= new Date(job.start_time) && now < new Date(job.end_time);
}

function canMarkCompleted(job) {
  if (job.status !== "filled") return false;
  return new Date() >= new Date(job.end_time);
}

function JobRow({ job, onEdit, onDelete, onCandidates, onInterests, onNoShow, onMarkCompleted }) {
  const editable = isJobEditable(job);
  const deletable = isJobDeletable(job);
  const canNoShow = isNoShowAllowed(job);
  const canComplete = canMarkCompleted(job);

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {job.position_type?.name || "Unknown Position"}
          </Typography>
          {job.worker && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {job.worker.first_name} {job.worker.last_name}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1, flexShrink: 0 }}>
          <StatusChip status={job.status} />
          {job.status === "open" && (
            <>
              <Tooltip title="View candidates">
                <IconButton size="small" onClick={onCandidates}>
                  <PeopleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="View interested users">
                <IconButton size="small" onClick={onInterests}>
                  <FavoriteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {canNoShow && (
            <Tooltip title="Report no-show">
              <IconButton size="small" color="error" onClick={onNoShow}>
                <ReportProblemIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canComplete && (
            <Tooltip title="Mark as completed">
              <IconButton size="small" color="success" onClick={onMarkCompleted}>
                <TaskAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={editable ? "Edit" : "Only open jobs can be edited"}>
            <span>
              <IconButton size="small" onClick={onEdit} disabled={!editable}>
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={deletable ? "Delete" : "Only open or expired jobs can be deleted"}>
            <span>
              <IconButton size="small" onClick={onDelete} disabled={!deletable}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2">
              {formatSalary(job.salary_min, job.salary_max)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">Start </Typography>
              {formatDateTime(job.start_time)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">End </Typography>
              {formatDateTime(job.end_time)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {job.note && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>
          {job.note}
        </Typography>
      )}
    </Paper>
  );
}
