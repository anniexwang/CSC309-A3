import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { useAuth } from "../../contexts/AuthContext";

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <PageContainer maxWidth="sm">
        <AuthCard title="404 — Page Not Found">
          <Typography variant="body2" sx={{ textAlign: "center", mb: 3 }}>
            The page you requested does not exist.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button component={RouterLink} to="/" variant="contained">
              Go Home
            </Button>
          </Box>
        </AuthCard>
      </PageContainer>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="404 — Page Not Found">
        <Typography variant="body2" sx={{ textAlign: "center", mb: 3 }}>
          The page you requested does not exist.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button component={RouterLink} to="/" variant="contained">
            Go Home
          </Button>
        </Box>
      </AuthCard>
    </AuthLayout>
  );
}
