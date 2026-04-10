import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthLinks } from "../../components/auth/AuthLinks";

export function RegisterChoicePage() {
  return (
    <AuthLayout>
      <AuthCard title="Sign Up">
        <Typography variant="body2" sx={{ mb: 3 }}>
          Choose the type of account you would like to create.
        </Typography>

        <Stack spacing={2}>
          <Button
            component={RouterLink}
            to="/register/regular"
            variant="contained"
            fullWidth
            startIcon={<PersonIcon />}
            sx={{ py: 1.5, justifyContent: "flex-start", textAlign: "left" }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500, color: "inherit" }}>
                Regular User
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Find temporary work opportunities
              </Typography>
            </Box>
          </Button>

          <Button
            component={RouterLink}
            to="/register/business"
            variant="outlined"
            fullWidth
            startIcon={<BusinessIcon />}
            sx={{ py: 1.5, justifyContent: "flex-start", textAlign: "left" }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Business
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Post jobs and find qualified staff
              </Typography>
            </Box>
          </Button>
        </Stack>

        <AuthLinks inline prefixText="Already have an account?" items={[{ to: "/login", label: "Log In" }]} />
      </AuthCard>
    </AuthLayout>
  );
}
