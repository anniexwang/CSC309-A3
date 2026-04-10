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
import { StatusChip } from "../../components/ui/StatusChip";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { getMyQualifications } from "../../api/jobs";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const LIMIT = 10;

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

export function RegularQualificationsPage() {
  const { token } = useAuth();

  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const data = await getMyQualifications(token);
      console.log("My qualifications:", data);
      setQualificationRequest(data.results || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching my qualifications:", err);
    }
  }, [token]);


  
  useEffect(() => {
    loadMyQualifications();
  }, [loadMyQualifications]);

  function handleSearch(e) {
    e.preventDefault();
    const nextKeyword = searchInput.trim();
    if (nextKeyword === keyword) {
      loadMyQualifications();
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
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  return (
    <PageContainer maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
        My Qualification Requests
      </Typography>

      {loading ? (
        <LoadingState message="Loading businesses..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : qualificationRequests.length === 0 ? (
        <EmptyState message="No qualification requests found." />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {qualificationRequests.length} qualification request{qualificationRequests.length !== 1 ? "s" : ""} found
          </Typography>
            
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {qualificationRequests.map((q) => (
              <QualificationCard 
                key={q.id} 
                qualificationRequest={q}
              />)
            )}
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

function QualificationCard({ qualificationRequest }) {
  const navigate = useNavigate();
  const handleOpenQualification = () => {
    navigate(`/regular/qualifications/${qualificationRequest.id}`);
  };

  return (
    <Paper
      onClick={handleOpenQualification}
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
            {qualificationRequest.position_type_name || "Unknown Qualification"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1, flexShrink: 0 }}>
          <StatusChip status={qualificationRequest.status} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
          <Typography variant="body2">
            Last updated: {formatDateTime(qualificationRequest.updatedAt)}
          </Typography>

          <Button
            size="small"
            variant="outlined"
            color="primary"
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenQualification();
            }}
          >
            Edit/View Qualification Request
          </Button>
      </Box>
    </Paper>
  );
}
