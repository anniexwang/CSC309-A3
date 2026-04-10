import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import Typography from "@mui/material/Typography";
import { useAuth } from "../../contexts/AuthContext";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import MenuItem from "@mui/material/MenuItem";

import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

const LIMIT = 9;

const BOOLEAN_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export function AdminSearchUsersPage() {
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [query, setQuery] = useState({
        keyword: searchParams.get("keyword") || "",
        activated: "all",
        suspended: "all",
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: LIMIT,
    });
    const [searchInput, setSearchInput] = useState(searchParams.get("keyword") || "");

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page: query.page, limit: query.limit };
            if (query.keyword) params.keyword = query.keyword;
            if (query.activated) params.activated = query.activated;
            if (query.suspended) params.suspended = query.suspended;
            const search = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== "all" && value !== null && value !== "") {
                    search.set(key, String(value));
                }
            });
            const qs = search.toString();
            const data = await apiRequest(`/users${qs ? `?${qs}` : ""}`, { token: token || undefined });
            setUsers(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [token, query]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

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

    const handleActivatedChange = (e) => {
        setQuery((prev) => ({...prev, activated: e.target.value, page: 1}));
    };

    const handleSuspendedChange = (e) => {
        setQuery((prev) => ({...prev, suspended: e.target.value, page: 1}));
    };

    const handleReset = () => {
        setSearchInput("");
        setQuery({
            keyword: "",
            activated: "all",
            suspended: "all",
            page: 1,
            limit: LIMIT,
        });
    };

    return <PageContainer>
        <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
            Manage Users
        </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} md={4}>
                        <Box component="form" onSubmit={handleSearch}>
                            <TextField
                            placeholder="Search users..."
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
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                            sx={{ minWidth: 80 }}
                            select
                            fullWidth
                            label="Activated"
                            value={query.activated}
                            onChange={handleActivatedChange}
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
                            {BOOLEAN_FILTER_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                                </MenuItem>
                            ))}
                            </TextField>
                        </Grid>
                        
                    <Grid item xs={12} sm={6} md={3}>
                            <TextField
                            sx={{ minWidth: 100 }}
                            select
                            fullWidth
                            label="Suspended"
                            value={query.suspended}
                            onChange={handleSuspendedChange}
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
                            {BOOLEAN_FILTER_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={5} md={4}>
                        <Button variant="outlined" onClick={handleReset}>
                            Reset
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        
                {loading ? (
                <LoadingState message="Loading users..." />
                ) : error ? (
                <ErrorAlert message={error} />
                ) : users.length === 0 ? (
                <EmptyState message="No users found." />
                ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2}}>
                        {totalCount} user{totalCount !== 1 ? "s" : ""} found
                    </Typography>
                    {/* <Grid container spacing={2}> */}
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
                        {users.map((user) => (
                            // <Grid item xs={12} sm={6} md={4} key={user.id} sx={{ display: "flex", justifyContent: "center" }}>
                            <Paper
                                component={RouterLink}
                                to={`/admin/users/${user.id}`}
                                sx={{
                                    width: "100%",
                                    // maxWidth: 320,
                                    // minHeight: 210,
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
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Avatar
                                    src={user.avatar ? `${API_BASE}${user.avatar}` : undefined}
                                    sx={{ width: 48, height: 48 }}
                                >
                                    <PersonIcon />
                                </Avatar>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {[user.first_name, user.last_name].filter(Boolean).join(" ") || "No name"}
                                </Typography>
                                </Box>
            
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {user.email}
                                </Typography>
                                </Box>
            
                                {user.phone_number && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                    <Typography variant="body2" color="text.secondary">
                                    {user.phone_number}
                                    </Typography>
                                </Box>
                                )}
            
                                {user.postal_address && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <PlaceIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                    {user.postal_address}
                                    </Typography>
                                </Box>
                                )}
                            </Paper>
                            // </Grid>
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
    </PageContainer>
}
