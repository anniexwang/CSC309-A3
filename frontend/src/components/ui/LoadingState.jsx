import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

export function LoadingState({ message = "Loading..." }) {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <CircularProgress size={32} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
