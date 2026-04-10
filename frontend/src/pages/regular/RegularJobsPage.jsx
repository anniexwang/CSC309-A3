import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { useAuth } from "../../contexts/AuthContext";
import { getMyProfile } from "../../api/profile";
import { geocodeAddress } from "../../api/system";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusChip } from "../../components/ui/StatusChip";
import {
  getJobs,
  getPositionTypes,
  getBusinesses,
  getMyQualifications,
  getMyInterests,
  setJobInterest,
} from "../../api/jobs";
import { JobDetailDialog } from "./JobDetailDialog";

const SORT_OPTIONS = [
  { value: "start_time", label: "Start Time" },
  { value: "salary_min", label: "Min Salary" },
  { value: "salary_max", label: "Max Salary" },
  { value: "updatedAt", label: "Recently Updated" },
];

const LIMIT = 10;
const GEOCODE_ERROR_MESSAGE = "We could not determine your location from your saved address, so office distance is unavailable.";

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

async function geocodePostalAddress(token, postalAddress, signal) {
  const trimmedAddress = postalAddress.trim();
  if (!trimmedAddress) {
    throw new Error("Postal address is not available for distance lookup.");
  }

  if (signal?.aborted) {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    throw abortError;
  }

  const result = await geocodeAddress(token, trimmedAddress);
  return { lat: Number(result.lat), lon: Number(result.lon) };
}

export function RegularJobsPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("start_time");
  const [order, setOrder] = useState("asc");
  const [positionTypeId, setPositionTypeId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [qualifiedOnly, setQualifiedOnly] = useState(true);

  const [positionTypes, setPositionTypes] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [qualifiedPtIds, setQualifiedPtIds] = useState(new Set());
  const [qualificationsLoaded, setQualificationsLoaded] = useState(false);
  const [interestedJobIds, setInterestedJobIds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationResolved, setLocationResolved] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState(null);
  const selectedJobIdParam = searchParams.get("jobId");

  useEffect(() => {
    Promise.all([
      getPositionTypes(token).catch(() => ({ results: [] })),
      getBusinesses(token).catch(() => ({ results: [] })),
      getMyQualifications(token).catch(() => ({ results: [] })),
    ]).then(([ptData, bizData, qualData]) => {
      setPositionTypes(ptData.results || []);
      setBusinesses(bizData.results || []);
      const approved = (qualData.results || [])
        .filter((q) => q.status === "approved")
        .map((q) => q.position_type_id);
      setQualifiedPtIds(new Set(approved));
      setQualificationsLoaded(true);
    });
  }, [token]);

  const loadInterests = useCallback(async () => {
    try {
      const data = await getMyInterests(token);
      const ids = new Set((data.results || []).map((r) => r.job?.id ?? r.job_id));
      setInterestedJobIds(ids);
    } catch {
      /* non-critical */
    }
  }, [token]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  useEffect(() => {
    const controller = new AbortController();
    setLocationResolved(false);

    async function loadUserLocation() {
      try {
        const profile = await getMyProfile(token);
        const nextLocation = await geocodePostalAddress(token, profile.postal_address || "", controller.signal);
        setUserLocation(nextLocation);
        setLocationError("");
      } catch (err) {
        if (err.name === "AbortError") return;
        setUserLocation(null);
        setLocationError(err.message || GEOCODE_ERROR_MESSAGE);
      } finally {
        if (!controller.signal.aborted) {
          setLocationResolved(true);
        }
      }
    }

    loadUserLocation();
    return () => controller.abort();
  }, [token]);

  const loadJobs = useCallback(async () => {
    if (!qualificationsLoaded || !locationResolved) {
      return;
    }

    if (qualifiedOnly && qualificationsLoaded && qualifiedPtIds.size === 0) {
      setJobs([]);
      setTotalCount(0);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, sort, order };
      if (positionTypeId) params.position_type_id = positionTypeId;
      if (businessId) params.business_id = businessId;
      if (qualifiedOnly) params.qualified_only = true;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lon = userLocation.lon;
      }
      const data = await getJobs(token, params);
      setJobs(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [token, page, sort, order, positionTypeId, businessId, userLocation, qualifiedOnly, qualificationsLoaded, qualifiedPtIds, locationResolved]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobIdParam) {
      setSelectedJobId(null);
      return;
    }

    const parsedJobId = Number.parseInt(selectedJobIdParam, 10);
    if (Number.isNaN(parsedJobId)) {
      setSelectedJobId(null);
      return;
    }

    setSelectedJobId(parsedJobId);
  }, [selectedJobIdParam]);

  const displayedJobs = useMemo(() => {
    return jobs;
  }, [jobs]);

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  async function handleQuickInterest(e, jobId, interested) {
    e.stopPropagation();
    setError("");
    try {
      await setJobInterest(token, jobId, interested);
      await loadInterests();
      await loadJobs();
    } catch (err) {
      setError(err.message || "Failed to update interest.");
    }
  }

  function handleInterestChanged() {
    loadJobs();
    loadInterests();
  }

  function openJobDialog(jobId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("jobId", String(jobId));
    setSearchParams(nextParams);
  }

  function closeJobDialog() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("jobId");
    setSearchParams(nextParams);
  }

  const handleReset = () => {
    setPositionTypeId("");
    setBusinessId("");
    setSort("start_time");
    setOrder("asc");
    setQualifiedOnly(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        Browse Jobs
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              select
              fullWidth
              label="Position Type"
              value={positionTypeId}
              onChange={handleFilterChange(setPositionTypeId)}
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
          <Grid item xs={6} sm={4} md={3}>
            <TextField
              select
              fullWidth
              label="Business"
              value={businessId}
              onChange={handleFilterChange(setBusinessId)}
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
              <MenuItem value="">All Businesses</MenuItem>
              {businesses.map((biz) => (
                <MenuItem key={biz.id} value={String(biz.id)}>
                  {biz.business_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              select
              label="Sort By"
              value={sort}
              onChange={handleFilterChange(setSort)}
              size="small"
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              select
              label="Order"
              value={order}
              onChange={handleFilterChange(setOrder)}
              size="small"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={qualifiedOnly}
                  onChange={(_, checked) => { setQualifiedOnly(checked); setPage(1); }}
                  size="small"
                />
              }
              label={<Typography variant="body2">Qualified only</Typography>}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
          </Grid>
        </Grid>
        {locationError && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {locationError}
          </Alert>
        )}
      </Paper>

      {/* Results */}
      {loading || !qualificationsLoaded || !locationResolved ? (
        <LoadingState message="Loading jobs..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : displayedJobs.length === 0 ? (
        <EmptyState message={qualifiedOnly ? "No qualified jobs found. Try turning off the 'Qualified only' filter." : "No open jobs found matching your filters."} />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {qualifiedOnly
              ? `${displayedJobs.length} qualified job${displayedJobs.length !== 1 ? "s" : ""} (${totalCount} total)`
              : `${totalCount} job${totalCount !== 1 ? "s" : ""} found`}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {displayedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isQualified={qualifiedPtIds.has(job.position_type?.id)}
                isInterested={interestedJobIds.has(job.id)}
                onViewDetails={() => openJobDialog(job.id)}
                onQuickInterest={handleQuickInterest}
              />
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

      <JobDetailDialog
        open={selectedJobId !== null}
        jobId={selectedJobId}
        isInterested={interestedJobIds.has(selectedJobId)}
        onClose={closeJobDialog}
        onInterestChanged={handleInterestChanged}
        userLocation={userLocation}
      />
    </PageContainer>
  );
}

function JobCard({ job, isQualified, isInterested, onViewDetails, onQuickInterest }) {
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
          {isQualified && job.status === "open" ? (
            isInterested ? (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<FavoriteIcon sx={{ fontSize: 16 }} />}
                onClick={(e) => onQuickInterest(e, job.id, false)}
                sx={{ whiteSpace: "nowrap" }}
              >
                Withdraw
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<FavoriteBorderIcon sx={{ fontSize: 16 }} />}
                onClick={(e) => onQuickInterest(e, job.id, true)}
                sx={{ whiteSpace: "nowrap" }}
              >
                Interested
              </Button>
            )
          ) : !isQualified ? (
            <Chip
              icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Not Qualified"
              size="small"
              variant="outlined"
              color="default"
            />
          ) : null}
          <StatusChip status={job.status} />
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

      {job.distance != null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Office is {job.distance.toFixed(1)} km away &middot; ~{(job.eta * 60).toFixed(0)} min
        </Typography>
      )}
    </Paper>
  );
}
