import { Link as RouterLink } from "react-router-dom";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";

export function DashboardHomePage({ role }) {
  const isBusiness = role === "business";
  const profilePath = isBusiness ? "/business/profile" : "/regular/profile";
  const jobsPath = isBusiness ? "/business/jobs" : "/regular/jobs";

  return (
    <PageContainer maxWidth="md">
      <SectionCard>
        <Typography variant="h4" sx={{ mb: 1, color: "text.primary" }}>
          {isBusiness ? "Business Home" : "Welcome Back"}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Temporary Staffing Platform helps dental clinics and qualified professionals connect for short-term work opportunities.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button component={RouterLink} to={profilePath} variant="contained">
            Go to Profile
          </Button>
          <Button component={RouterLink} to={jobsPath} variant="outlined">
            {isBusiness ? "View Job Postings" : "Browse Jobs"}
          </Button>
        </Stack>
      </SectionCard>

      <SectionCard title="About the Platform">
        <Typography variant="body2">
          Use your profile to keep your information up to date, then explore the rest of the platform as more dashboard features are added.
        </Typography>
      </SectionCard>

      {/* <SectionCard title="More Coming Soon">
        <Typography variant="body2">
          This home page is intentionally lightweight for now so the profile experience stays in its own dedicated tab.
        </Typography>
      </SectionCard> */}
    </PageContainer>
  );
}
