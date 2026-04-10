import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { Link as RouterLink } from "react-router-dom";

export function AuthLinks({ items, inline = false, prefixText = "" }) {
  return (
    <Stack
      direction={inline ? "row" : "column"}
      spacing={1}
      justifyContent="center"
      alignItems="center"
      sx={{ mt: 2 }}
    >
      {prefixText && (
        <Typography variant="body2" color="text.secondary">
          {prefixText}
        </Typography>
      )}
      {items.map(({ to, label }) => (
        <MuiLink
          key={`${to}-${label}`}
          component={RouterLink}
          to={to}
          underline="hover"
          variant="body2"
          color="primary"
        >
          {label}
        </MuiLink>
      ))}
    </Stack>
  );
}
