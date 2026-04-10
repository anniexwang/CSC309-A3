import { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import Typography from "@mui/material/Typography";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { StatusChip } from "../../components/ui/StatusChip";
import PersonIcon from "@mui/icons-material/Person";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

const LIMIT = 10;
const FETCH_LIMIT = 500;
const STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "created", label: "Created" },
    { value: "submitted", label: "Submitted" },
    { value: "revised", label: "Revised" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];
const SORT_OPTIONS = [
    { value: "needs-review", label: "Needs review first" },
    { value: "recent", label: "Most recently updated" },
];

function formatQualificationDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getStatusChipColor(status) {
    switch (status) {
        case "approved":
            return "success";
        case "rejected":
            return "error";
        case "submitted":
        case "revised":
            return "warning";
        case "created":
            return "info";
        default:
            return "default";
    }
}

function getQualificationPriority(status) {
    if (status === "created" || status === "submitted" || status === "revised") return 0;
    return 1;
}

function sortQualifications(results, sortMode) {
    return [...results].sort((a, b) => {
        if (sortMode === "needs-review") {
            const priorityDiff = getQualificationPriority(a.status) - getQualificationPriority(b.status);
            if (priorityDiff !== 0) return priorityDiff;
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

export function AdminSearchQualificationsPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

    const [qualifications, setQualifications] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [query, setQuery] = useState({
        keyword: searchParams.get("keyword") || "",
        status: searchParams.get("status") || "all",
        positionType: searchParams.get("position_type") || "all",
        sort: searchParams.get("sort") || "needs-review",
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: LIMIT
    });
    const [searchInput, setSearchInput] = useState(searchParams.get("keyword") || "");
    const [allResults, setAllResults] = useState([]);
    const positionOptions = useMemo(() => {
        const names = [...new Set(allResults.map((item) => item.position_type?.name).filter(Boolean))];
        return [{ value: "all", label: "All positions" }, ...names.map((name) => ({ value: name, label: name }))];
    }, [allResults]);

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    const loadQualifications = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page: 1, limit: FETCH_LIMIT };
            const search = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    search.set(key, String(value));
                }
            });
            const qs = search.toString();
            const data = await apiRequest(`/qualifications${qs ? `?${qs}` : ""}`, { token: token || undefined });
            setAllResults(data.results || []);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadQualifications();
    }, [loadQualifications]);

    useEffect(() => {
        const keyword = query.keyword.trim().toLowerCase();
        const keywordFiltered = keyword
            ? allResults.filter((item) => {
                const searchable = [
                    item.user?.first_name,
                    item.user?.last_name,
                    item.position_type?.name,
                    item.status,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return searchable.includes(keyword);
            })
            : allResults;
        const statusFiltered = query.status === "all"
            ? keywordFiltered
            : keywordFiltered.filter((item) => item.status === query.status);
        const positionFiltered = query.positionType === "all"
            ? statusFiltered
            : statusFiltered.filter((item) => item.position_type?.name === query.positionType);
        const sorted = sortQualifications(positionFiltered, query.sort);
        setTotalCount(sorted.length);
        setQualifications(sorted.slice((query.page - 1) * query.limit, query.page * query.limit));
    }, [allResults, query.keyword, query.limit, query.page, query.positionType, query.sort, query.status]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (query.keyword) nextParams.set("keyword", query.keyword);
        if (query.status !== "all") nextParams.set("status", query.status);
        if (query.positionType !== "all") nextParams.set("position_type", query.positionType);
        if (query.sort !== "needs-review") nextParams.set("sort", query.sort);
        if (query.page > 1) nextParams.set("page", String(query.page));
        setSearchParams(nextParams, { replace: true });
    }, [query.keyword, query.page, query.positionType, query.sort, query.status, setSearchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        setQuery((prev) => ({ ...prev, keyword: searchInput, page: 1 }));
    };

    const handleReset = () => {
        setSearchInput("");
        setQuery({
            keyword: "",
            status: "all",
            positionType: "all",
            sort: "needs-review",
            page: 1,
            limit: LIMIT,
        });
    };

    const handleQualificationAction = async (qualificationId, status) => {
        setError("");
        setActionLoadingId(qualificationId);
        const previous = allResults;
        const optimistic = previous.map((qualification) => (
            qualification.id === qualificationId
                ? {
                    ...qualification,
                    status,
                    updatedAt: new Date().toISOString(),
                }
                : qualification
        ));
        setAllResults(optimistic);
        try {
            const updatedQualification = await apiRequest(`/qualifications/${qualificationId}`, {
                method: "PATCH",
                token,
                data: { status },
            });
            setAllResults((prev) => prev.map((qualification) => (
                qualification.id === qualificationId ? updatedQualification : qualification
            )));
            setSnackbar({
                open: true,
                severity: "success",
                message: status === "approved" ? "Qualification approved." : "Qualification rejected.",
            });
        } catch (err) {
            setAllResults(previous);
            setError(err.message || "Failed to update qualification.");
        } finally {
            setActionLoadingId(null);
        }
    };

    return <PageContainer>
                {/* <Box sx={{ width: "100%", mb: 5 }}> */}
                <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
                    Manage Qualifications
                </Typography>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5} md={4}>
                            <Box component="form" onSubmit={handleSearch}>
                                <TextField
                                    placeholder="Search qualifications..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    fullWidth
                                    size="small"
                                    // sx={{ "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {/* <Button type="submit" variant="contained" sx={{ minWidth: 96 }}>
                                    Search
                                </Button> */}
                            </Box>
                        </Grid>
                        {/* <Grid container spacing={2}> */}
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                size="small"
                                value={query.status}
                                onChange={(event) => setQuery((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Sort"
                                size="small"
                                value={query.sort}
                                onChange={(event) => setQuery((prev) => ({ ...prev, sort: event.target.value, page: 1 }))}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                select
                                fullWidth
                                label="Position"
                                size="small"
                                value={query.positionType}
                                onChange={(event) => setQuery((prev) => ({ ...prev, positionType: event.target.value, page: 1 }))}
                            >
                                {positionOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                                <Button variant="outlined" onClick={handleReset}>
                                    Reset
                                </Button>
                                {/* {(query.status !== "all" || query.positionType !== "all" || query.keyword || query.sort !== "needs-review") && (
                                    <Chip
                                        label="Filters active"
                                        color="primary"
                                        variant="outlined"
                                    />
                                )} */}
                            </Stack>
                        </Grid>
                    </Grid>
                {/* </Box> */}
                </Paper>
        
                {loading ? (
                <LoadingState message="Loading qualifications..." />
                ) : error ? (
                <ErrorAlert message={error} />
                ) : qualifications.length === 0 ? (
                <EmptyState message="No qualifications found." />
                ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2}}>
                        {totalCount} qualification{totalCount !== 1 ? "s" : ""} found
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                    {qualifications.map((qualification) => (
                        <Paper
                            key={qualification.id}
                            onClick={() => navigate(`/admin/qualifications/${qualification.id}`)}
                            sx={{
                            width: "100%",
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.25,
                            textDecoration: "none",
                            color: "inherit",
                            cursor: "pointer",
                            transition: "border-color 0.15s",
                            "&:hover": { borderColor: "primary.main" },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <>
                                            <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 600}}
                                            >
                                                {`${qualification.user.first_name} ${qualification.user.last_name}`}
                                            </Typography>
                                        </>
                                        {(qualification.status === "created" || qualification.status === "submitted" || qualification.status === "revised") && (
                                            <Chip
                                                label="Needs review"
                                                color="error"
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <WorkOutlineIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        <Typography variant="body2">
                                            {qualification.position_type.name}
                                        </Typography>
                                    </Box>
                                </Box>
                                {/* <Chip 
                                    label={qualification.status}
                                    color={getStatusChipColor(qualification.status)}
                                    size="small"
                                    sx={{ textTransform: "capitalize" }}
                                /> */}
                                <StatusChip
                                    status={qualification.status}
                                />
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Typography variant="body2">
                                    {`Updated ${formatQualificationDate(qualification.updatedAt)}`}
                                </Typography>
                            </Box>

                            {(qualification.status === "created" || qualification.status === "submitted" || qualification.status === "revised") && (
                                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", pt: 0.5 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQualificationAction(qualification.id, "approved");
                                        }}
                                        disabled={actionLoadingId === qualification.id}
                                    >
                                        {actionLoadingId === qualification.id ? "Saving..." : "Approve"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleQualificationAction(qualification.id, "rejected");
                                        }}
                                        disabled={actionLoadingId === qualification.id}
                                    >
                                        {actionLoadingId === qualification.id ? "Saving..." : "Reject"}
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    ))}
                    </Box>
        
                    {totalPages > 1 && (
                    <Pagination
                        page={query.page}
                        totalPages={totalPages}
                        onPrev={() => setQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        onNext={() => setQuery((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                    />
                    )}
                </>
                )}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                        severity={snackbar.severity}
                        variant="standard"
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
    </PageContainer>
}
