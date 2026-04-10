import { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessIcon from "@mui/icons-material/Business";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedIcon from "@mui/icons-material/Verified";

import { useAuth } from "../../contexts/AuthContext";
import { PageContainer } from "../../components/ui/PageContainer";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { getBusinessById } from "../../api/businesses";
import { Navbar } from "../../components/layout/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 0.75 }}>
      {icon}
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  );
}

export function BusinessDetailPage() {
  const { businessId } = useParams();
  const { token } = useAuth();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getBusinessById(token || undefined, businessId)
      .then((data) => setBusiness(data))
      .catch((err) => setError(err.message || "Business not found"))
      .finally(() => setLoading(false));
  }, [token, businessId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <PageContainer maxWidth="md">
          <LoadingState message="Loading business..." />
        </PageContainer>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <PageContainer maxWidth="md">
          <ErrorAlert message={error} />
          <Button component={RouterLink} to="/businesses" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
            Back to Businesses
          </Button>
        </PageContainer>
      </>
      
    );
  }

  const avatarSrc = business.avatar ? `${API_BASE}${business.avatar}` : undefined;
  const location = business.location;
  const locationStr = location ? `${location.lat?.toFixed(4)}, ${location.lon?.toFixed(4)}` : null;

  return (
    <>
      <Navbar />
      <PageContainer maxWidth="md">
        <Button component={RouterLink} to="/businesses" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
          Back to Businesses
        </Button>

        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            <Avatar src={avatarSrc} sx={{ width: 96, height: 96, fontSize: 40, mb: 2 }}>
              <BusinessIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              {business.business_name}
            </Typography>
            {business.verified !== undefined && (
              <Box sx={{ mt: 1 }}>
                {business.verified ? (
                  <Chip icon={<VerifiedIcon />} label="Verified" color="success" size="small" variant="outlined" />
                ) : (
                  <Chip label="Not Verified" color="warning" size="small" variant="outlined" />
                )}
              </Box>
            )}
          </Box>

          <InfoRow
            icon={<EmailIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
            label="Email"
            value={business.email}
          />
          <InfoRow
            icon={<PhoneIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
            label="Phone"
            value={business.phone_number}
          />
          <InfoRow
            icon={<PlaceIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
            label="Address"
            value={business.postal_address}
          />
          {locationStr && (
            <InfoRow
              icon={<PlaceIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="Coordinates"
              value={locationStr}
            />
          )}
          {business.owner_name && (
            <InfoRow
              icon={<PersonIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.25 }} />}
              label="Owner"
              value={business.owner_name}
            />
          )}
        </Paper>

        {/* Biography */}
        {business.biography && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>About</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {business.biography}
            </Typography>
          </Paper>
        )}
      </PageContainer>
    </>
  );
}
