import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { requestReset } from "../../api/auth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { TextField } from "../../components/auth/TextField";
import { AuthLinks } from "../../components/auth/AuthLinks";

export function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }

    setLoading(true);
    try {
      const res = await requestReset(email);
      setSuccess(res);
    } catch (err) {
      if (err.status === 404) setError("No account found with that email.");
      else if (err.status === 429) setError("Too many requests. Please wait before trying again.");
      else setError(err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <AuthCard title="Reset Token Sent">
          <Alert severity="success" sx={{ mb: 2 }}>
            A reset token has been generated. Use the link below to complete the process.
          </Alert>
          <AuthLinks
            items={[
              { to: `/auth/resets/${success.resetToken}`, label: "Use this token now" },
              { to: "/login", label: "Back to login" },
            ]}
          />
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="Forgot Password">
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Requesting..." : "Request Reset Token"}
            </Button>
          </Box>
        </Box>
        <AuthLinks items={[{ to: "/login", label: "Back to login" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
