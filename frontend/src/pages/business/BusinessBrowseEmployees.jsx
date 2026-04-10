import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import Typography from "@mui/material/Typography";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import PersonIcon from "@mui/icons-material/Person";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { getMyJobs } from "../../api/businessJobs";
import { reportNoShow } from "../../api/businessCandidates";
import { CandidateDetailDialog } from "./CandidateDetailDialog";

const LIMIT = 10;

function formatDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getLatestShiftLabel(employee) {
    if (!employee?.latest_end_time) return "Last worked Unknown";
    const now = new Date();
    const latestEnd = new Date(employee.latest_end_time);
    if (latestEnd > now) {
        return `Next shift ${formatDate(employee.latest_end_time)}`;
    }
    return `Last worked ${formatDate(employee.latest_end_time)}`;
}

function shouldReplaceDisplayedShift(existing, candidate, now = new Date()) {
    if (!existing) return true;

    const nowTs = now.getTime();
    const existingStart = new Date(existing.latest_start_time).getTime();
    const existingEnd = new Date(existing.latest_end_time).getTime();
    const candidateStart = new Date(candidate.latest_start_time).getTime();
    const candidateEnd = new Date(candidate.latest_end_time).getTime();

    const existingIsUpcoming = existingEnd > nowTs;
    const candidateIsUpcoming = candidateEnd > nowTs;

    if (candidateIsUpcoming && !existingIsUpcoming) return true;
    if (!candidateIsUpcoming && existingIsUpcoming) return false;

    if (candidateIsUpcoming && existingIsUpcoming) {
        if (candidateStart !== existingStart) return candidateStart < existingStart;
        return candidateEnd < existingEnd;
    }

    return candidateEnd > existingEnd;
}

function isNoShowAllowed(employee) {
    if (employee.latest_job_status !== "filled" || !employee.latest_job_id) return false;
    const now = new Date();
    return now >= new Date(employee.latest_start_time) && now < new Date(employee.latest_end_time);
}

function getNoShowTooltip(employee, noShowAllowed) {
    if (noShowAllowed) return "Report no-show";
    if (employee.latest_job_status === "canceled") return "This employee has already been marked as no show for their latest job.";
    return "No-show can only be reported during an active filled job.";
}

export function BusinessBrowseEmployees() {
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [totalCount, setTotalCount] = useState(1);
    const [query, setQuery] = useState({
        keyword: searchParams.get("keyword") || "",
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: LIMIT
    });
    const [searchInput, setSearchInput] = useState(searchParams.get("keyword") || "");
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getMyJobs(token, {
                page: 1,
                limit: 200,
                status: ["filled", "completed", "canceled"],
            });

            const jobs = data.results || [];
            const employeesById = new Map();
            const now = new Date();

            jobs.forEach((job) => {
                if (!job.worker) return;

                const existing = employeesById.get(job.worker.id);
                const nextEmployee = {
                    id: job.worker.id,
                    first_name: job.worker.first_name,
                    last_name: job.worker.last_name,
                    latest_job_id: job.id,
                    latest_position_name: job.position_type?.name || "Employee",
                    latest_job_status: job.status,
                    latest_start_time: job.start_time,
                    latest_end_time: job.end_time,
                };

                if (shouldReplaceDisplayedShift(existing, nextEmployee, now)) {
                    employeesById.set(job.worker.id, nextEmployee);
                }
            });

            const keyword = query.keyword.trim().toLowerCase();
            const filteredEmployees = [...employeesById.values()]
                .filter((employee) => {
                    if (!keyword) return true;
                    const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase();
                    const latestPosition = (employee.latest_position_name || "").toLowerCase();
                    return fullName.includes(keyword) || latestPosition.includes(keyword);
                })
                .sort((a, b) => {
                    const nowTs = Date.now();
                    const aStart = new Date(a.latest_start_time).getTime();
                    const bStart = new Date(b.latest_start_time).getTime();
                    const aEnd = new Date(a.latest_end_time).getTime();
                    const bEnd = new Date(b.latest_end_time).getTime();
                    const aUpcoming = aEnd > nowTs;
                    const bUpcoming = bEnd > nowTs;

                    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
                    if (aUpcoming && bUpcoming) return aStart - bStart || aEnd - bEnd;
                    return bEnd - aEnd;
                });

            setTotalCount(filteredEmployees.length);
            setEmployees(
                filteredEmployees.slice((query.page - 1) * query.limit, query.page * query.limit)
            );
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [token, query]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (query.keyword) nextParams.set("keyword", query.keyword);
        if (query.page > 1) nextParams.set("page", String(query.page));
        setSearchParams(nextParams, { replace: true });
    }, [query.keyword, query.page, setSearchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        setQuery((prev) => ({ ...prev, keyword: searchInput, page: 1 }));
    };

    const handleReset = () => {
        setSearchInput("");
        setQuery({
            keyword: "",
            page: 1,
            limit: LIMIT,
        });
    };

    const handleNoShow = async (employee) => {
        if (!employee.latest_job_id) return;
        setError("");
        setSuccessMsg("");
        setActionLoadingId(employee.id);
        try {
            await reportNoShow(token, employee.latest_job_id);
            setSuccessMsg(`Reported no-show for ${employee.first_name} ${employee.last_name}.`);
            await loadEmployees();
        } catch (err) {
            setError(err.message || "Failed to report no-show.");
        } finally {
            setActionLoadingId(null);
        }
    };

    return <PageContainer>
                {successMsg && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg("")}>
                        {successMsg}
                    </Alert>
                )}

                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5} md={4}>
                            <Box component="form" onSubmit={handleSearch}>
                                <TextField
                                placeholder="Search employees..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                fullWidth
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
                        <Grid item xs={12} sm={5} md={4}>
                            <Button variant="outlined" onClick={handleReset}>
                                Reset
                            </Button>

                        </Grid>
                    </Grid>

                </Paper>
                
        
                {loading ? (
                <LoadingState message="Loading employees..." />
                ) : error ? (
                <ErrorAlert message={error} />
                ) : employees.length === 0 ? (
                <EmptyState message="No employees found." />
                ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {totalCount} employee{totalCount !== 1 ? "s" : ""} found
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                    {employees.map((employee) => {
                        const noShowAllowed = isNoShowAllowed(employee);
                        const noShowHandled = employee.latest_job_status === "canceled";

                        return (
                        <Paper
                            key={employee.id}
                            onClick={() => setSelectedEmployee(employee)}
                            sx={{
                            width: "100%",
                            minHeight: 120,
                            p: 2.5,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
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
                                        <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 600 }}
                                        >
                                            {`${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unnamed Employee"}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <WorkOutlineIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        <Typography variant="body2">
                                            {employee.latest_position_name}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                        <Typography variant="body2">
                                            {getLatestShiftLabel(employee)}
                                        </Typography>
                                    </Box>
                                </Box>
                                {noShowHandled ? (
                                    <Tooltip title={getNoShowTooltip(employee, noShowAllowed)}>
                                        <Chip
                                            icon={<ReportProblemIcon />}
                                            label="Marked as No Show"
                                            color="error"
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Tooltip>
                                ) : (
                                    <Tooltip title={getNoShowTooltip(employee, noShowAllowed)}>
                                        <span>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                startIcon={<ReportProblemIcon />}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleNoShow(employee);
                                                }}
                                                disabled={!noShowAllowed || actionLoadingId === employee.id}
                                            >
                                                No Show
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}
                            </Box>
                        </Paper>
                        );
                    })}
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
                <CandidateDetailDialog
                    open={!!selectedEmployee}
                    jobId={selectedEmployee?.latest_job_id}
                    userId={selectedEmployee?.id}
                    onClose={() => setSelectedEmployee(null)}
                />
    </PageContainer>
}
