import Alert from "@mui/material/Alert";

export function ErrorAlert({ message = "Something went wrong." }) {
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}
