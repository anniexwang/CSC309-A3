import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { registerRegularUser } from "../../api/users";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { TextField } from "../../components/auth/TextField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthLinks } from "../../components/auth/AuthLinks";
import { savePendingActivation } from "../../utils/pendingActivation";

export function RegisterRegularPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "",
    phone_number: "", postal_address: "", birthday: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validate() {
    const next = {};
    if (!form.first_name.trim()) next.first_name = "First name is required.";
    if (!form.last_name.trim()) next.last_name = "Last name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8 || form.password.length > 20)
      next.password = "Password must be 8-20 characters.";
    if (form.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthday))
      next.birthday = "Use YYYY-MM-DD format.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    setApiError("");
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = { first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password };
    if (form.phone_number) payload.phone_number = form.phone_number;
    if (form.postal_address) payload.postal_address = form.postal_address;
    if (form.birthday) payload.birthday = form.birthday;

    setLoading(true);
    try {
      const res = await registerRegularUser(payload);
      savePendingActivation({ resetToken: res.resetToken, expiresAt: res.expiresAt, email: res.email, role: "regular" });
      navigate("/activate", { replace: true });
    } catch (err) {
      if (err.status === 409) setApiError("An account with that email already exists.");
      else setApiError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCard title="Sign Up" wide>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="First Name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Last Name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} required />
            </Grid>
          </Grid>

          <TextField label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} required placeholder="you@example.com" />
          <PasswordField value={form.password} onChange={set("password")} error={errors.password} required placeholder="8-20 characters" />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Phone Number" value={form.phone_number} onChange={set("phone_number")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Postal Address" value={form.postal_address} onChange={set("postal_address")} />
            </Grid>
          </Grid>

          <TextField label="Birthday" type="date" value={form.birthday} onChange={set("birthday")} error={errors.birthday} slotProps={{ inputLabel: { shrink: true } }} />

          <Box sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Signing Up..." : "Sign Up"}
            </Button>
          </Box>
        </Box>

        <AuthLinks inline prefixText="Already have an account?" items={[{ to: "/login", label: "Log In" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
