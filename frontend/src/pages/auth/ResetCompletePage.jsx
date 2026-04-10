import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { completeReset } from "../../api/auth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { TextField } from "../../components/auth/TextField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthLinks } from "../../components/auth/AuthLinks";

export function ResetCompletePage() {
  const { resetToken } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("New password is required."); return; }

    setLoading(true);
    try {
      await completeReset(resetToken, email, password);
      setDone(true);
    } catch (err) {
      if (err.status === 401) setError("Email does not match this token.");
      else if (err.status === 404) setError("Token not found or already used.");
      else if (err.status === 410) setError("This token has expired.");
      else setError(err.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <AuthCard title="Account Activated">
          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Success!</strong> Your account has been activated and password updated. You can now log in.
          </Alert>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button variant="contained" onClick={() => navigate("/login")}>Go to Login</Button>
          </Box>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="Activate / Reset Password">
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
          <PasswordField
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
          />
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Processing..." : "Activate Account"}
            </Button>
          </Box>
        </Box>
        <AuthLinks items={[{ to: "/login", label: "Back to login" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
