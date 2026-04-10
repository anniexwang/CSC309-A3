import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { registerBusiness } from "../../api/businesses";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { TextField } from "../../components/auth/TextField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthLinks } from "../../components/auth/AuthLinks";
import { savePendingActivation } from "../../utils/pendingActivation";

export function RegisterBusinessPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: "", owner_name: "", email: "", password: "",
    phone_number: "", postal_address: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validate() {
    const next = {};
    if (!form.business_name.trim()) next.business_name = "Business name is required.";
    if (!form.owner_name.trim()) next.owner_name = "Owner name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8 || form.password.length > 20) next.password = "Password must be 8-20 characters.";
    if (!form.phone_number.trim()) next.phone_number = "Phone number is required.";
    if (!form.postal_address.trim()) next.postal_address = "Postal address is required.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    setApiError("");
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = {
      business_name: form.business_name, owner_name: form.owner_name,
      email: form.email, password: form.password,
      phone_number: form.phone_number, postal_address: form.postal_address,
    };

    setLoading(true);
    try {
      const res = await registerBusiness(payload);
      savePendingActivation({ resetToken: res.resetToken, expiresAt: res.expiresAt, email: res.email, role: "business" });
      navigate("/activate", { replace: true });
    } catch (err) {
      if (err.status === 409) setApiError("An account with that email already exists.");
      else if (err.status === 400 && /postal address/i.test(err.message || "")) {
        setApiError("We couldn't locate that address. Please enter a more complete postal address.");
      }
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

          <TextField label="Business Name" value={form.business_name} onChange={set("business_name")} error={errors.business_name} required />
          <TextField label="Owner Name" value={form.owner_name} onChange={set("owner_name")} error={errors.owner_name} required />
          <TextField label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} required placeholder="business@example.com" />
          <PasswordField value={form.password} onChange={set("password")} error={errors.password} required placeholder="8-20 characters" />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Phone Number" value={form.phone_number} onChange={set("phone_number")} error={errors.phone_number} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Postal Address" value={form.postal_address} onChange={set("postal_address")} error={errors.postal_address} required />
            </Grid>
          </Grid>

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
