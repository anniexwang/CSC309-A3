import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import VerifiedIcon from "@mui/icons-material/Verified";
import CancelIcon from "@mui/icons-material/Cancel";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { listBusinesses } from "../../api/businesses";
import { apiRequest } from "../../api/client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "business_name", label: "Business Name" },
  { value: "email", label: "Email" },
];

const LIMIT = 9;

export function AdminSearchBusinessesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("asc");
  const [activatedOnly, setActivatedOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [searchInput, setSearchInput] = useState("");

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (keyword) params.keyword = keyword;
      if (activatedOnly) params.activated = true;
      if (verifiedOnly) params.verified = true;
      if (sort) { params.sort = sort; params.order = order; }
      const data = await listBusinesses(token || undefined, params);
      setBusinesses(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }, [token, page, keyword, sort, order, verifiedOnly, activatedOnly]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

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

  function handleReset() {
    setPage(1);
    setKeyword("");
    setSort("");
    setOrder("asc");
    setSearchInput("");
    setActivatedOnly(false);
    setVerifiedOnly(false);
  }

  async function handleVerifyToggle(e, businessId, verified) {
    e.stopPropagation();
    try {
      await apiRequest(`/businesses/${businessId}/verified`, {
        method: "PATCH",
        token,
        data: { verified: !verified },
      });
      setBusinesses((prev) =>
        prev.map((biz) => (biz.id === businessId ? { ...biz, verified: !verified } : biz))
      );
    } catch (err) {
      setError(err.message || "Failed to update business verification");
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        Manage Businesses
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <Box component="form" onSubmit={handleSearch}>
              <TextField
                placeholder="Search businesses..."
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
          <Grid item xs={6} sm={4} md={3}>
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
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              select
              label="Order"
              value={order}
              onChange={handleOrderChange}
              size="small"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={activatedOnly}
                  onChange={(_, checked) => { setActivatedOnly(checked); setPage(1); }}
                  size="small"
                />
              }
              label={<Typography variant="body2">Activated only</Typography>}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={verifiedOnly}
                  onChange={(_, checked) => { setVerifiedOnly(checked); setPage(1); }}
                  size="small"
                />
              }
              label={<Typography variant="body2">Verified only</Typography>}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <Button variant="outlined" fullWidth onClick={handleReset}>
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LoadingState message="Loading businesses..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : businesses.length === 0 ? (
        <EmptyState message="No businesses found." />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount} business{totalCount !== 1 ? "es" : ""} found
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
          {/* <Grid container spacing={2} justifyContent="center"> */}
            {businesses.map((biz) => (
              // <Grid item xs={12} sm={6} md={4} key={biz.id} sx={{ display: "flex", justifyContent: "center" }}>

                <Paper
                  onClick={() => navigate(`/admin/businesses/${biz.id}`)}
                  sx={{
                    position: "relative",
                    width: "100%",
                    // maxWidth: 320,
                    // minHeight: 210,
                    cursor: "pointer",
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.15s",
                    "&:hover": { borderColor: "primary.main" },
                    height: "100%",
                  }}
                >
                  <Box sx={{ position: "absolute", top: 12, right: 12, color: biz.verified ? "success.main" : "error.main" }}>
                    {biz.verified ? <VerifiedIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={biz.avatar ? `${API_BASE}${biz.avatar}` : undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      <BusinessIcon />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {biz.business_name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {biz.email}
                    </Typography>
                  </Box>

                  {biz.phone_number && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {biz.phone_number}
                      </Typography>
                    </Box>
                  )}

                  {biz.postal_address && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PlaceIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {biz.postal_address}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: "auto", pt: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      onClick={(e) => handleVerifyToggle(e, biz.id, biz.verified)}
                    >
                      {biz.verified ? "Remove Verification" : "Verify"}
                    </Button>
                  </Box>
                </Paper>
              // </Grid>
            ))}
          {/* </Grid> */}
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
    </PageContainer>
  );
}
