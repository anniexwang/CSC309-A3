import { Navigate, Link as RouterLink } from "react-router-dom";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { useAuth } from "../../contexts/AuthContext";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"

function getDashboardPath(role) {
  if (role === "admin") return "/admin";
  if (role === "business") return "/business";
  return "/regular";
}

export function HomePage() {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return <Navigate to={getDashboardPath(auth.role)} replace />;
  }

  return (
    <AuthLayout>
      <AuthCard title="Temporary Staffing Platform">
        <Typography variant="body2" sx={{ textAlign: "center", mb: 3 }}>
          Connect dental clinics with qualified dental professionals for short-term work opportunities.
        </Typography>
        <Stack spacing={1.5}>
          <Button component={RouterLink} to="/login" variant="contained" fullWidth>
            Log In
          </Button>
          <Button component={RouterLink} to="/register" variant="outlined" fullWidth>
            Sign Up
          </Button>
          <Button component={RouterLink} to="/businesses">
            Browse Businesses →
          </Button>
        </Stack>
      </AuthCard>
    </AuthLayout>
  );
}
