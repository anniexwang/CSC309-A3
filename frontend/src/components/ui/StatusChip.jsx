import Chip from "@mui/material/Chip";

const colorMap = {
  open: "primary",
  filled: "success",
  expired: "error",
  canceled: "error",
  completed: "success",
  created: "default",
  submitted: "info",
  revised: "warning",
  approved: "success",
  rejected: "error",
  active: "primary",
  failed: "error",
  success: "success",
  mutual: "success",
  interested: "info",
};

export function StatusChip({ status, ...rest }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  const color = colorMap[status] || "default";

  return <Chip label={label} color={color} size="small" variant="outlined" {...rest} />;
}
