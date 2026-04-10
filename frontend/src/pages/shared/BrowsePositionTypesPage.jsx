import { useState, useEffect, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
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

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { listPositionTypes } from "../../api/position-types";
import { CreateQualificationRequestModal } from "./CreateQualificationRequestModal";
import { getMyQualifications } from "../../api/jobs";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const LIMIT = 10;

export function BrowsePositionTypesPage() {
  const { token } = useAuth();

  const [positionTypes, setPositionTypes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [order, setOrder] = useState("asc");

  const [searchInput, setSearchInput] = useState("");

  const [selectedPositionTypeId, setSelectedPositionTypeId] = useState(null);
  const [selectedQualificationRequest, setSelectedQualificationRequest] = useState(null);

  const [qualificationRequests, setQualificationRequest] = useState([]);

  const [openCreateModal, setOpenCreateModal] = useState(false);


  const loadMyQualifications = useCallback(async () => {
    try {
      const data = await getMyQualifications(token);
      console.log("My qualifications:", data);
      setQualificationRequest(data.results || []);
    } catch (err) {
      console.error("Error fetching my qualifications:", err);
    }
  }, [token]);


  const loadPositionTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { name: order, page, limit: LIMIT };
      if (keyword) params.keyword = keyword;
      const data = await listPositionTypes(token || undefined, params);
      setPositionTypes(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load position types");
    } finally {
      setLoading(false);
    }
  }, [token, page, keyword, order]);

  useEffect(() => {
    loadPositionTypes();
    loadMyQualifications();
  }, [loadPositionTypes, loadMyQualifications]);

  function handleSearch(e) {
    e.preventDefault();
    const nextKeyword = searchInput.trim();
    if (nextKeyword === keyword) {
      loadPositionTypes();
      return;
    }
    setKeyword(nextKeyword);
    setPage(1);
  }

  function handleOrderChange(e) {
    setOrder(e.target.value);
    setPage(1);
  }

  function handleModalClose() {
    setSelectedPositionTypeId(null);
    setSelectedQualificationRequest(null);
    setOpenCreateModal(false);
  }

  function handleQualificationSaved() {
    loadMyQualifications();
    loadPositionTypes();
  }

  const handleReset = () => {
    setSearchInput("");
    setKeyword("");
    setOrder("asc");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        Browse Position Types
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <Box component="form" onSubmit={handleSearch} sx={{ display: "flex", gap: 1 }}>
              <TextField
                placeholder="Search position types..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {/* <Button type="submit" variant="outlined" size="small">
                Search
              </Button> */}
            </Box>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              select
              label="Order By"
              value={order}
              onChange={handleOrderChange}
              size="small"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LoadingState message="Loading position types..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : positionTypes.length === 0 ? (
        <EmptyState message="No position types found." />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {totalCount} position type{totalCount !== 1 ? "s" : ""} found
          </Typography>
            
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {positionTypes.map((pt) => (
              (!pt.hidden && 
                <PositionTypeCard 
                  key={pt.id} 
                  positionType={pt}
                  setSelectedPositionTypeId={setSelectedPositionTypeId}
                  setSelectedQualificationRequest={setSelectedQualificationRequest}
                  setOpenCreateModal={setOpenCreateModal}
                  qualificationRequest={qualificationRequests.find((q) => String(q.position_type_id) === String(pt.id))}
                />)
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
      <CreateQualificationRequestModal
        open={openCreateModal}
        positionTypeId={selectedPositionTypeId}
        existingQualificationRequest={selectedQualificationRequest}
        onClose={handleModalClose}
        onSaved={handleQualificationSaved}
      />
    </PageContainer>
  );
}

function PositionTypeCard({ positionType, setSelectedPositionTypeId, setSelectedQualificationRequest, qualificationRequest, setOpenCreateModal }) {
  const navigate = useNavigate();
  
  return (
    <Paper
      sx={{
        p: 2.5,
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "primary.main" },
        cursor: "pointer",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {positionType.name || "Unknown Position"}
          </Typography>
        </Box>
        {/* <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
          <StatusChip status={positionType.status} />
        </Box> */}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
        <Typography variant="body2">
          {positionType.description}
        </Typography>
        {qualificationRequest ? (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={() => {
              navigate(`/regular/qualifications/${qualificationRequest.id}`);
            }}
          >
            Edit/View Qualification Request
          </Button>
        ): (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={() => {
              setSelectedPositionTypeId(positionType.id);
              setSelectedQualificationRequest(null);
              setOpenCreateModal(true);
            }}
          >
            Create Qualification Request
          </Button>
        )}
      </Box>
    </Paper>
  );
}
