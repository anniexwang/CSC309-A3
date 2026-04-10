import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import SettingsIcon from "@mui/icons-material/Settings";

import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";

const sections = [
  {
    title: "Manage Users",
    description: "View, search, and suspend regular user accounts.",
    icon: <PeopleIcon sx={{ fontSize: 40, color: "primary.main" }} />,
    path: "/admin/users",
  },
  {
    title: "Manage Businesses",
    description: "View, search, and verify business accounts.",
    icon: <BusinessIcon sx={{ fontSize: 40, color: "primary.main" }} />,
    path: "/admin/businesses",
  },
  {
    title: "Position Types",
    description: "Create, edit, and manage position type categories.",
    icon: <WorkIcon sx={{ fontSize: 40, color: "primary.main" }} />,
    path: "/admin/positions",
  },
  {
    title: "Qualifications Review",
    description: "Review and approve or reject user qualifications.",
    icon: <FactCheckIcon sx={{ fontSize: 40, color: "primary.main" }} />,
    path: "/admin/qualifications",
  },
  {
    title: "System Configuration",
    description: "Adjust negotiation windows, cooldowns, and timeouts.",
    icon: <SettingsIcon sx={{ fontSize: 40, color: "primary.main" }} />,
    path: "/admin/system",
  },
];

export function AdminDashboardPage() {
  return (
    <PageContainer>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {sections.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.path} sx={{ display: "flex", justifyContent: "center" }}>
            <SectionCard sx={{ width: "100%", maxWidth: 320, minHeight: 235, display: "flex", flexDirection: "column" }}>
              <Box sx={{ mb: 2 }}>{s.icon}</Box>
              <Typography variant="h6" sx={{ mb: 1 }}>{s.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                {s.description}
              </Typography>
              <Button component={RouterLink} to={s.path} variant="outlined" fullWidth>
                Open
              </Button>
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </PageContainer>
  );
}
