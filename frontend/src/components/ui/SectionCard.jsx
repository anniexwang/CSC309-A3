import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export function SectionCard({ title, children, sx = {} }) {
  return (
    <Paper sx={{ p: 3, mb: 3, ...sx }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      {children}
    </Paper>
  );
}
