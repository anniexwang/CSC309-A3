import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusChip } from "../../components/ui/StatusChip";
import {
  getMyInterests,
  getPositionTypes,
  getBusinesses,
  getMyQualifications,
} from "../../api/jobs";
import { JobDetailDialog } from "./JobDetailDialog";
import { createNegotiation, getActiveNegotiation } from "../../api/negotiations";

const SORT_OPTIONS = [
  { value: "start_time", label: "Start Time" },
  { value: "salary_min", label: "Min Salary" },
  { value: "salary_max", label: "Max Salary" },
  { value: "updatedAt", label: "Recently Updated" },
  { value: "position_type_name", label: "Position Type Name" },
  { value: "business_name", label: "Business Name" },
];

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

export function RegularInterestsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [interestedJobs, setInterestedJobs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("start_time");
  const [order, setOrder] = useState("asc");
  const [positionTypeId, setPositionTypeId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [mutualOnly, setMutualOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const [positionTypes, setPositionTypes] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  const [selectedJobId, setSelectedJobId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
    
  const [startingNeg, setStartingNeg] = useState(null);
  const [negotiationExists, setNegotiationExists] = useState(null);
  const [negotiation, setNegotiation] = useState(null);

  useEffect(() => {
      Promise.all([
        getPositionTypes(token).catch(() => ({ results: [] })),
        getBusinesses(token).catch(() => ({ results: [] })),
        getMyQualifications(token).catch(() => ({ results: [] })),
      ]).then(([ptData, bizData]) => {
        setPositionTypes(ptData.results || []);
        setBusinesses(bizData.results || []);
      });
    }, [token]);

  const loadInterests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (keyword) params.keyword = keyword;
      if (mutualOnly) params.mutual = true;
      if (openOnly) params.open = true;
      if (positionTypeId) params.position_type_id = positionTypeId;
      if (businessId) params.business_id = businessId;
      if (sort) { params.sort = sort; params.order = order; }
      const data = await getMyInterests(token, params);
      console.log("My interests:", data);
      setInterestedJobs(data.results || []);
      setTotalCount(data.count || 0);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
    
  }, [token, page, sort, order, positionTypeId, businessId, keyword, mutualOnly, openOnly]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  function handleSearch(e) {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(1);
  }

  function handleSortChange(e) {
    setSort(e.target.value);
    setPage(1);
  }

  function handleOrderChange(e) {
    setOrder(e.target.value);
    setPage(1);
  }

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  const handleReset = () => {
    setSearchInput("");
    setKeyword("");
    setPositionTypeId("");
    setBusinessId("");
    setSort("start_time");
    setOrder("asc");
    setMutualOnly(false);
    setOpenOnly(false);
  };

  const loadNegotiation = useCallback(async () => {
    await getActiveNegotiation(token)
    .then((res) => {
      console.log("data ", res);
      setNegotiationExists(true); 
      setNegotiation(res);
    })
    .catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    })
  },[token]);
  
  useEffect(() => {
    void loadNegotiation();
  }, [loadNegotiation]);

  const initiateNegotiation = useCallback(async (interest) => {
      console.log("initiate negotiation interest ", interest);
      if (!interest) return;
  
      if (negotiationExists) {
        setError("You have an ongoing negotiation. Accept or reject the ongoing negotiation before initiating another negotiation.");
        return;
      }
  
      setStartingNeg(interest.interest_id);
      setError("");
      try {
        const negotiation = await createNegotiation(token, interest.interest_id);
        navigate(`/negotiations/${negotiation.id}`);
      } catch (err) {
        setError(err.message || "Failed to accept invitation");
        if (interest.interest_id) {
          await loadInterests();
        }
      } finally {
        setStartingNeg(null);
      }
    }, [loadInterests, navigate, token]);

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        My Job Interests
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} direction="column">
          <Grid container spacing={2} alignItems="center" direction="row">
            <Grid item xs={12} sm={6} md={4}>
              <Box component="form" onSubmit={handleSearch}>
                <TextField
                  fullWidth
                  placeholder="Search interests..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
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

            <Grid item xs={12} sm={6} md={2}>
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

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Sort By"
                value={sort}
                onChange={handleSortChange}
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
                {SORT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                label="Order"
                value={order}
                onChange={handleOrderChange}
                size="small"
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Grid container spacing={2} alignItems="center" direction="row">
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mutualOnly}
                    onChange={(_, checked) => { setMutualOnly(checked); setPage(1); }}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Mutual interest only</Typography>}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={openOnly}
                    onChange={(_, checked) => { setOpenOnly(checked); setPage(1); }}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Open jobs only</Typography>}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button variant="outlined" onClick={handleReset}>
                Reset
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {loading ? (
        <LoadingState message="Loading jobs..." />
      ) : interestedJobs.length === 0 ? (
        <EmptyState message={"You have not indicated interest in any jobs. Try expressing interest in a job in the \"Jobs\" tab."} />
      ) : (
        <>
          {error && <ErrorAlert message={error} />}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount} job interest{totalCount !== 1 ? "s" : ""} found
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {interestedJobs.map((interest) => {
              // console.log("Rendering interest:", interest);
              return (
                <JobCard
                  key={interest.interest_id}
                  interest={interest}
                  onViewDetails={() => {
                    setSelectedJobId(interest.job.id);
                    setOpenDialog(true);
                  }}
                // onQuickInterest={handleQuickInterest}
                  startingNeg={startingNeg}
                  initiateNegotiation={() => initiateNegotiation(interest)}
                  negotiation={negotiation}
              />
            )})}
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
        open={openDialog}
        jobId={selectedJobId}
        // isInterested={interestedJobIds.has(selectedJobId)}
        onClose={() => {
          setSelectedJobId(null);
          setOpenDialog(false);
        }}
        // onInterestChanged={handleInterestChanged}
      />
    </PageContainer>
  );
}

function JobCard({ interest, onViewDetails, initiateNegotiation, negotiation }) {
  // console.log("interest ", interest);
  // console.log("negotiation ", negotiation);

  const navigate = useNavigate();

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
          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1}}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {interest.job.position_type?.name || "Unknown Position"}
            </Typography>
            <StatusChip status={interest.mutual ? "mutual" : "interested"} />
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
            <BusinessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {interest.job.business?.business_name || "Unknown Business"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
          {interest.mutual && interest.job.status === "open" && (
            interest.interest_id !== negotiation?.interest_id ?
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  initiateNegotiation();
                }} // start negotiation
                sx={{ whiteSpace: "nowrap" }}
              >
                Initiate Negotiation
              </Button> 
            : 
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/negotiations/${negotiation.id}`);
                }} // start negotiation
                sx={{ whiteSpace: "nowrap" }}
              >
                Open Negotiation
              </Button>
          )}
          <StatusChip status={interest.job.status} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AttachMoneyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2">
              {formatSalary(interest.job.salary_min, interest.job.salary_max)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">Start </Typography>
              {formatDateTime(interest.job.start_time)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              <Typography component="span" variant="caption" color="text.secondary">End </Typography>
              {formatDateTime(interest.job.end_time)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {interest.job.distance != null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {interest.job.distance.toFixed(1)} km away &middot; ~{(interest.job.eta * 60).toFixed(0)} min
        </Typography>
      )}
    </Paper>
  );
}
