import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

const STORAGE_KEYS = {
    resetCooldown: "admin_system_reset_cooldown",
    negotiationWindow: "admin_system_negotiation_window",
    jobStartWindow: "admin_system_job_start_window",
    availabilityTimeout: "admin_system_availability_timeout",
};

function formatMinutes(seconds) {
    const rawValue = Number(seconds) / 60;
    const value = Math.ceil(rawValue * 10) / 10;
    if (!Number.isFinite(value)) return seconds;
    return `${value} minute${value === 1 ? "" : "s"}`;
}

function formatJobStartWindow(hours) {
    const rawValue = Number(hours);
    const value = Math.ceil(rawValue * 10) / 10;
    if (!Number.isFinite(value)) return hours;
    if (Number.isInteger(value) && value % 24 === 0) {
        const days = value / 24;
        return `${days} day${days === 1 ? "" : "s"}`;
    }
    return `${value} hour${value === 1 ? "" : "s"}`;
}

export function AdminSystemPage({ title }) {
    const { token } = useAuth();
    const [resetCooldown, setResetCooldown] = useState(() => localStorage.getItem(STORAGE_KEYS.resetCooldown));
    const [negotiationWindow, setNegotiationWindow] = useState(() => localStorage.getItem(STORAGE_KEYS.negotiationWindow));
    const [jobStartWindow, setJobStartWindow] = useState(() => localStorage.getItem(STORAGE_KEYS.jobStartWindow));
    const [availabilityTimeout, setAvailabilityTimeout] = useState(() => localStorage.getItem(STORAGE_KEYS.availabilityTimeout));
    const [form, setForm] = useState(
        { reset_cooldown: "", negotiation_window: "", job_start_window: "", availability_timeout: ""}
    );
    const [error, setError] = useState("");

    const validate = () => {
        const { reset_cooldown, negotiation_window, job_start_window, availability_timeout } = form;
        if (reset_cooldown.trim() === "" && negotiation_window.trim() === "" && job_start_window.trim() === "" && availability_timeout.trim() === "") {
            return "Enter at least one setting to update.";
        }
        return null;
    }

    const handleSave = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setError("");

        try {
            if (form.reset_cooldown.trim()) {
                const response = await apiRequest("/system/reset-cooldown", 
                    { method: "PATCH", token, data: { reset_cooldown: Number(form.reset_cooldown) }}
                );
                setResetCooldown(response.reset_cooldown);
                localStorage.setItem(STORAGE_KEYS.resetCooldown, String(response.reset_cooldown));
            }

            if (form.negotiation_window.trim()) {
                const response = await apiRequest("/system/negotiation-window", 
                    { method: "PATCH", token, data: { negotiation_window: Number(form.negotiation_window) }}
                );
                setNegotiationWindow(response.negotiation_window);
                localStorage.setItem(STORAGE_KEYS.negotiationWindow, String(response.negotiation_window));
            }

            if (form.job_start_window.trim()) {
                const response = await apiRequest("/system/job-start-window", 
                    { method: "PATCH", token, data: { job_start_window: Number(form.job_start_window) }}
                );
                setJobStartWindow(response.job_start_window);
                localStorage.setItem(STORAGE_KEYS.jobStartWindow, String(response.job_start_window));
            }

            if (form.availability_timeout.trim()) {
                const response = await apiRequest("/system/availability-timeout", 
                    { method: "PATCH", token, data: { availability_timeout: Number(form.availability_timeout) }}
                );
                setAvailabilityTimeout(response.availability_timeout);
                localStorage.setItem(STORAGE_KEYS.availabilityTimeout, String(response.availability_timeout));
            }

            setForm({ reset_cooldown: "", negotiation_window: "", job_start_window: "", availability_timeout: "" });
        } catch (err) {
            setError(err.message || "Failed to save settings");
        }
    };

    const updateForm = (new_value, field_name) => {
        setForm(prev => ({
            ...prev,
            [field_name]: new_value
        }));
    };

    useEffect(() => {
        const loadSystemSettings = async () => {
            try {
                if (resetCooldown && negotiationWindow && jobStartWindow && availabilityTimeout) return;

                const reset_response = await apiRequest("/system/reset-cooldown", { token });
                setResetCooldown(reset_response.reset_cooldown);
                localStorage.setItem(STORAGE_KEYS.resetCooldown, String(reset_response.reset_cooldown));

                const negotiation_response = await apiRequest("/system/negotiation-window", { token });
                setNegotiationWindow(negotiation_response.negotiation_window);
                localStorage.setItem(STORAGE_KEYS.negotiationWindow, String(negotiation_response.negotiation_window));

                const jobsw_response = await apiRequest("/system/job-start-window", { token });
                setJobStartWindow(jobsw_response.job_start_window);
                localStorage.setItem(STORAGE_KEYS.jobStartWindow, String(jobsw_response.job_start_window));

                const availability_response = await apiRequest("/system/availability-timeout", { token });
                setAvailabilityTimeout(availability_response.availability_timeout);
                localStorage.setItem(STORAGE_KEYS.availabilityTimeout, String(availability_response.availability_timeout));
            } catch (err) {
                console.log(err);
            }
        };

        loadSystemSettings();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <PageContainer>
            <Typography variant="h4" sx={{ mb: 3, color: "text.primary" }}>
                {title}
            </Typography>

            {/* <Box sx={{ maxWidth: 900, mx: "auto", mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={4}> */}
                <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
                        <SectionCard sx={{ minWidth: 0, textAlign: "center", }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: "primary.main" }}>
                                Reset Cooldown
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    fontWeight: 600,
                                }}
                            >
                                {formatMinutes(resetCooldown)}
                            </Typography>
                        </SectionCard>
                    {/* </Grid> */}
                    <Grid item xs={12} sm={6} md={4}>
                        <SectionCard sx={{ minWidth: 0, textAlign: "center" }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: "primary.main" }}>
                                Negotiation Window
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    fontWeight: 600,
                                }}
                            >
                                {formatMinutes(negotiationWindow)}
                            </Typography>
                        </SectionCard>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <SectionCard sx={{ minWidth: 0, textAlign: "center" }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: "primary.main" }}>
                                Job Start Window
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    fontWeight: 600,
                                }}
                            >
                                {formatJobStartWindow(jobStartWindow)}
                            </Typography>
                        </SectionCard>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <SectionCard sx={{ minWidth: 0, textAlign: "center" }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: "primary.main" }}>
                                Availability Timeout
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    fontWeight: 600,
                                }}
                            >
                                {formatMinutes(availabilityTimeout)}
                            </Typography>
                        </SectionCard>
                    {/* </Grid> */}
                </Grid>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 420, mx: "auto" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2">Update Reset Cooldown:</Typography>
                    <TextField onChange={(e) => updateForm(e.target.value, "reset_cooldown")} label="Reset Cooldown (seconds)" type="number" value={form.reset_cooldown} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2">Update Negotiation Window:</Typography>
                    <TextField onChange={(e) => updateForm(e.target.value, "negotiation_window")} label="Negotiation Window (seconds)" type="number" value={form.negotiation_window} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2">Update Job Start Window:</Typography>
                    <TextField onChange={(e) => updateForm(e.target.value, "job_start_window")} label="Job Start Window (hours)" type="number" value={form.job_start_window} />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2">Update Availbility Timeout:</Typography>
                    <TextField onChange={(e) => updateForm(e.target.value, "availability_timeout")} label="Availability Timeout (seconds)" type="number" value={form.availability_timeout} />
                </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Button variant="contained" onClick={handleSave}>
                    Save
                </Button>
            </Box>
        </PageContainer>
    )
}
