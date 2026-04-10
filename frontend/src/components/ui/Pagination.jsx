import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export function Pagination({ page = 1, totalPages = 1, onPrev, onNext }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 2 }}>
      <Button size="small" variant="outlined" onClick={onPrev} disabled={page <= 1}>
        Prev
      </Button>
      <Typography variant="body2">
        Page {page} of {totalPages}
      </Typography>
      <Button size="small" variant="outlined" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </Box>
  );
}
