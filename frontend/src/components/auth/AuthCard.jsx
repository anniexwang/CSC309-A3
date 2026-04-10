import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function AuthCard({ title, wide = false, children }) {
  return (
    <Box sx={{ maxWidth: wide ? 480 : 380, mx: "auto" }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
