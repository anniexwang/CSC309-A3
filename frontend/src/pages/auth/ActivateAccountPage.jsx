import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { completeReset } from "../../api/auth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthLinks } from "../../components/auth/AuthLinks";
import { PasswordField } from "../../components/auth/PasswordField";
import { clearPendingActivation, loadPendingActivation } from "../../utils/pendingActivation";

export function ActivateAccountPage() {
  const navigate = useNavigate();
  const activation = useMemo(() => loadPendingActivation(), []);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!activation) return <Navigate to="/login" replace />;

  async function handleActivate() {
    setError("");
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await completeReset(activation.resetToken, activation.email, password);
      clearPendingActivation();
      setDone(true);
    } catch (err) {
      if (err.status === 401) setError("Activation details no longer match this account.");
      else if (err.status === 404) setError("This activation token is invalid or has already been used.");
      else if (err.status === 410) setError("This activation token has expired. Request a new reset token.");
      else if (err.status === 400) setError(err.message || "Password does not meet requirements.");
      else setError(err.message || "Activation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <AuthCard title="Account Activated">
          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>You're all set.</strong> Your account is now active and ready to use.
          </Alert>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button variant="contained" onClick={() => navigate("/login")}>Continue to Login</Button>
          </Box>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="Activate Account">
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="body2" sx={{ mb: 1 }}>
          Your account was created successfully. Complete one more step to activate it before logging in.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Account: <strong>{activation.email}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Token expires on {new Date(activation.expiresAt).toLocaleString()}.
        </Typography>

        <PasswordField
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8-20 chars, upper/lower/number/symbol"
          required
        />
        <PasswordField
          label="Confirm Password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter password"
          required
        />

        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Button variant="contained" onClick={handleActivate} disabled={loading}>
            {loading ? "Activating..." : "Continue"}
          </Button>
        </Box>

        <AuthLinks inline prefixText="Need to switch accounts?" items={[{ to: "/login", label: "Back to Login" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
