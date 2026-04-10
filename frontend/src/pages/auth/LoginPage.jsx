import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { useAuth } from "../../contexts/AuthContext";
import { login as loginApi } from "../../api/auth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { TextField } from "../../components/auth/TextField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthLinks } from "../../components/auth/AuthLinks";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    if (!password) next.password = "Password is required.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    setApiError("");
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await loginApi(email, password);
      auth.login(res.token);

      const payload = JSON.parse(atob(res.token.split(".")[1]));
      const role = payload?.role;

      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "business") navigate("/business", { replace: true });
      else navigate("/regular", { replace: true });
    } catch (err) {
      if (err.status === 401) setApiError("Invalid email or password.");
      else if (err.status === 403) setApiError("Account is not activated. Please activate your account first.");
      else setApiError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCard title="Log In">
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            placeholder="you@example.com"
          />
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
            placeholder="Enter your password"
          />

          <Box sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 3 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </Box>
        </Box>

        <AuthLinks items={[{ to: "/auth/resets", label: "Forgot password?" }]} />
        <AuthLinks inline prefixText="Need an account?" items={[{ to: "/register", label: "Sign Up" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
