import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function EmptyState({ message = "No results found." }) {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
