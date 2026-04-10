import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import Typography from "@mui/material/Typography";
import { useAuth } from "../../contexts/AuthContext";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import PersonIcon from "@mui/icons-material/Person";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";

const LIMIT = 5;

const SORT_OPTIONS = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" }, 
];

export function AdminSearchPositionsPage() {
    const { token } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", description: "", hidden: true });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ id: null, name: "", description: "" });
    const [qualifiedUsersOpen, setQualifiedUsersOpen] = useState(false);
    const [qualifiedUsersLoading, setQualifiedUsersLoading] = useState(false);
    const [qualifiedUsersPosition, setQualifiedUsersPosition] = useState(null);
    const [qualifiedUsers, setQualifiedUsers] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

    const [positions, setPositions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [query, setQuery] = useState({
        keyword: searchParams.get("keyword") || "",
        name: searchParams.get("name") || "asc",
        hidden: undefined,
        num_qualified: searchParams.get("num_qualified") || "asc",
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: LIMIT,
    });
    const [searchInput, setSearchInput] = useState(searchParams.get("keyword") || "");

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    const loadPositions = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { page: query.page, limit: query.limit };
            if (query.keyword) params.keyword = query.keyword;
            if (query.name) params.name = query.name;
            if (query.hidden) params.hidden = query.hidden;
            if (query.num_qualified) params.num_qualified = query.num_qualified;
            const search = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    search.set(key, String(value));
                }
            });
            const qs = search.toString();
            const data = await apiRequest(`/position-types${qs ? `?${qs}` : ""}`, { token: token || undefined });
            setPositions(data.results || []);
            setTotalCount(data.count || 0);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }, [token, query]);

    useEffect(() => {
        loadPositions();
    }, [loadPositions]);

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

    const handleNameChange = (e) => {
        setQuery((prev) => ({...prev, name: e.target.value, page: 1}));
    };

    const handleHiddenToggle = (_, checked) => {
        setQuery((prev) => ({ ...prev, hidden: checked ? "true" : undefined, page: 1 }));
    };

    const handleQualifiedChange = (e) => {
        setQuery((prev) => ({...prev, num_qualified: e.target.value, page: 1}));
    };

    const handleReset = () => {
        setSearchInput("");
        setQuery({
            keyword: "",
            name: "asc",
            hidden: undefined,
            num_qualified: "asc",
            page: 1,
            limit: LIMIT,
        });
    };

    const handleOpenCreate = () => {
        setCreateForm({ name: "", description: "", hidden: true });
        setCreateOpen(true);
    };

    const handleCloseCreate = () => {
        setCreateOpen(false);
        setCreateForm({ name: "", description: "", hidden: true });
    };

    const handleCreateChange = (field) => (e) => {
        setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleCreateHiddenToggle = (_, checked) => {
        setCreateForm((prev) => ({ ...prev, hidden: checked }));
    };

    const handleSaveCreate = async () => {
        const trimmedName = createForm.name.trim();
        const trimmedDescription = createForm.description.trim();

        if (!trimmedName || !trimmedDescription) {
            setError("Position name and description are required.");
            return;
        }

        setError("");
        setActionLoadingId("create");
        try {
            await apiRequest("/position-types", {
                method: "POST",
                token,
                data: {
                    name: trimmedName,
                    description: trimmedDescription,
                    hidden: createForm.hidden,
                },
            });
            await loadPositions();
            setSnackbar({
                open: true,
                severity: "success",
                message: "Position type created.",
            });
            handleCloseCreate();
        } catch (err) {
            setError(err.message || "Failed to create position type.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleHideToggle = async (position) => {
        setError("");
        setActionLoadingId(position.id);
        try {
            await apiRequest(`/position-types/${position.id}`, {
                method: "PATCH",
                token,
                data: { hidden: !position.hidden },
            });
            setPositions((prev) =>
                prev.map((item) =>
                    item.id === position.id ? { ...item, hidden: !item.hidden } : item
                )
            );
            setSnackbar({
                open: true,
                severity: "success",
                message: position.hidden ? "Position type is now visible." : "Position type hidden.",
            });
        } catch (err) {
            setError(err.message || "Failed to update position type.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenEdit = (position) => {
        setEditForm({
            id: position.id,
            name: position.name || "",
            description: position.description || "",
        });
        setEditOpen(true);
    };

    const handleCloseEdit = () => {
        setEditOpen(false);
        setEditForm({ id: null, name: "", description: "" });
    };

    const handleEditChange = (field) => (e) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSaveEdit = async () => {
        const trimmedName = editForm.name.trim();
        const trimmedDescription = editForm.description.trim();

        if (!trimmedName || !trimmedDescription) {
            setError("Position name and description are required.");
            return;
        }

        setError("");
        setActionLoadingId(editForm.id);
        try {
            const updated = await apiRequest(`/position-types/${editForm.id}`, {
                method: "PATCH",
                token,
                data: {
                    name: trimmedName,
                    description: trimmedDescription,
                },
            });
            setPositions((prev) =>
                prev.map((item) =>
                    item.id === editForm.id
                        ? {
                              ...item,
                              name: updated.name ?? trimmedName,
                              description: updated.description ?? trimmedDescription,
                          }
                        : item
                )
            );
            setSnackbar({
                open: true,
                severity: "success",
                message: "Position type updated.",
            });
            handleCloseEdit();
        } catch (err) {
            setError(err.message || "Failed to update position type.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenDelete = (position) => {
        setDeleteTarget(position);
    };

    const handleCloseDelete = () => {
        setDeleteTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setError("");
        setActionLoadingId(deleteTarget.id);
        try {
            await apiRequest(`/position-types/${deleteTarget.id}`, {
                method: "DELETE",
                token,
            });
            setPositions((prev) => prev.filter((item) => item.id !== deleteTarget.id));
            setTotalCount((prev) => Math.max(0, prev - 1));
            setSnackbar({
                open: true,
                severity: "success",
                message: "Position type deleted.",
            });
            handleCloseDelete();
        } catch (err) {
            setError(err.message || "Failed to delete position type.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenQualifiedUsers = async (position) => {
        setQualifiedUsersOpen(true);
        setQualifiedUsersPosition(position);
        setQualifiedUsers([]);
        setQualifiedUsersLoading(true);
        setError("");

        try {
            const data = await apiRequest("/qualifications?page=1&limit=500", { token });
            const matchingUsers = (data.results || [])
                .filter(
                    (qualification) =>
                        qualification.status === "approved" &&
                        String(qualification.position_type?.id) === String(position.id)
                )
                .map((qualification) => qualification.user)
                .filter((user) => user?.id)
                .filter(
                    (user, index, users) =>
                        users.findIndex((candidate) => String(candidate.id) === String(user.id)) === index
                );
            setQualifiedUsers(matchingUsers);
        } catch (err) {
            setError(err.message || "Failed to load qualified users.");
            setQualifiedUsers([]);
        } finally {
            setQualifiedUsersLoading(false);
        }
    };

    const handleCloseQualifiedUsers = () => {
        setQualifiedUsersOpen(false);
        setQualifiedUsersPosition(null);
        setQualifiedUsers([]);
    };

    return <PageContainer>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Typography variant="h4" sx={{ color: "text.primary" }}>
                        Manage Position Types
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                        Create Position Type
                    </Button>
                </Box>

                <Paper sx={{ p: 2, mb: 3 }}>

                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5} md={4}>
                            <Box component="form" onSubmit={handleSearch}>
                                <TextField
                                placeholder="Search users..."
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
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            {/* <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}> */}
                            <TextField
                                // sx={{ minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
                                select
                                fullWidth
                                label="Name"
                                value={query.name}
                                onChange={handleNameChange}
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
                        <Grid item xs={12} sm={6} md={3}>
                            {/* <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}> */}
                            <TextField
                                // sx={{ minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
                                select
                                fullWidth
                                label="Number of Users Qualified"
                                value={query.num_qualified}
                                onChange={handleQualifiedChange}
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
                            {/* </Box> */}
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControlLabel
                                // sx={{ mt: 1.5, ml: 0, alignItems: "center" }}
                                control={
                                    <Switch
                                        checked={query.hidden === "true"}
                                        onChange={handleHiddenToggle}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">Hidden</Typography>}
                            />
                            {/* </Box> */}
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <Button variant="outlined" fullWidth onClick={handleReset}>
                                Reset
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
        
                {loading ? (
                <LoadingState message="Loading positions..." />
                ) : error ? (
                <ErrorAlert message={error} />
                ) : positions.length === 0 ? (
                <EmptyState message="No positions found." />
                ) : (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2}}>
                        {totalCount} position{totalCount !== 1 ? "s" : ""} found
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                    {positions.map((position) => (
                        <Paper
                            key={position.id}
                            onClick={() => handleOpenQualifiedUsers(position)}
                            sx={{
                            width: "100%",
                            minHeight: 150,
                            p: 2.5,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            textDecoration: "none",
                            color: "inherit",
                            transition: "border-color 0.15s",
                            "&:hover": { borderColor: "primary.main" },
                            cursor: "pointer",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600 }}
                            >
                                {position.name || "No name found"}
                            </Typography>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="body2">
                                {position.description}
                            </Typography>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenQualifiedUsers(position);
                                    }}
                                    sx={{
                                        px: 0,
                                        minWidth: 0,
                                        justifyContent: "flex-start",
                                        color: "text.secondary",
                                        fontSize: "0.95rem",
                                        textTransform: "none",
                                    }}
                                >
                                    <Typography variant="body2">
                                        {`Users Qualified: ${position.num_qualified}`}
                                    </Typography>
                                </Button>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                {position.hidden ? (
                                    <VisibilityOffIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                ) : (
                                    <VisibilityIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                )}
                                <Typography variant="body2">
                                    {position.hidden ? "Hidden" : "Visible"}
                                </Typography>
                            </Box>

                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", pt: 0.5 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={position.hidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleHideToggle(position);
                                    }}
                                    disabled={actionLoadingId === position.id}
                                >
                                    {position.hidden ? "Unhide" : "Hide"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEdit(position);
                                    }}
                                    disabled={actionLoadingId === position.id}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDelete(position);
                                    }}
                                    disabled={actionLoadingId === position.id}
                                >
                                    Delete
                                </Button>
                            </Box>
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
                <Dialog open={createOpen} onClose={handleCloseCreate} fullWidth maxWidth="sm">
                    <DialogTitle>Create Position Type</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                            <TextField
                                label="Name"
                                value={createForm.name}
                                onChange={handleCreateChange("name")}
                            />
                            <TextField
                                label="Description"
                                value={createForm.description}
                                onChange={handleCreateChange("description")}
                                multiline
                                minRows={3}
                            />
                            <FormControlLabel
                                sx={{ ml: 0, alignItems: "center" }}
                                control={
                                    <Switch
                                        checked={createForm.hidden}
                                        onChange={handleCreateHiddenToggle}
                                        size="medium"
                                    />
                                }
                                label={<Typography variant="body2">Create as hidden</Typography>}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleCloseCreate}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveCreate}
                            disabled={actionLoadingId === "create"}
                        >
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={editOpen} onClose={handleCloseEdit} fullWidth maxWidth="sm">
                    <DialogTitle>Edit Position Type</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                            <TextField
                                label="Name"
                                value={editForm.name}
                                onChange={handleEditChange("name")}
                            />
                            <TextField
                                label="Description"
                                value={editForm.description}
                                onChange={handleEditChange("description")}
                                multiline
                                minRows={3}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleCloseEdit}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveEdit}
                            disabled={actionLoadingId === editForm.id}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={Boolean(deleteTarget)} onClose={handleCloseDelete} fullWidth maxWidth="xs">
                    <DialogTitle>Delete Position Type</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {deleteTarget
                                ? `Delete "${deleteTarget.name}"? This action cannot be undone.`
                                : ""}
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleCloseDelete}>Cancel</Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleDelete}
                            disabled={actionLoadingId === deleteTarget?.id}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={qualifiedUsersOpen} onClose={handleCloseQualifiedUsers} fullWidth maxWidth="sm">
                    <DialogTitle>
                        {qualifiedUsersPosition
                            ? qualifiedUsersPosition.name
                            : "Position Type"}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        {qualifiedUsersPosition && (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 3, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {qualifiedUsersPosition.description || "No description available."}
                                </Typography>
                            </Box>
                        )}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Qualified Users
                        </Typography>
                        {qualifiedUsersLoading ? (
                            <LoadingState message="Loading qualified users..." />
                        ) : qualifiedUsers.length === 0 ? (
                            <EmptyState message="No approved users found for this position type." />
                        ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                                {qualifiedUsers.map((user) => (
                                    <Button
                                        key={user.id}
                                        component={RouterLink}
                                        to={`/admin/qualification-users/${user.id}`}
                                        onClick={handleCloseQualifiedUsers}
                                        variant="outlined"
                                        sx={{
                                            justifyContent: "space-between",
                                            textTransform: "none",
                                            py: 1.25,
                                            px: 1.5,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <PersonIcon fontSize="small" />
                                            <Typography variant="body2">
                                                {`${user.first_name || ""} ${user.last_name || ""}`.trim() || `User ${user.id}`}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            View User
                                        </Typography>
                                    </Button>
                                ))}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleCloseQualifiedUsers}>Close</Button>
                    </DialogActions>
                </Dialog>
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
