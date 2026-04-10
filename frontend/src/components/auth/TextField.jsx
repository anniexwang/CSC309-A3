import MuiTextField from "@mui/material/TextField";

export function TextField({ label, error, required, ...rest }) {
  return (
    <MuiTextField
      label={label}
      error={Boolean(error)}
      helperText={error || " "}
      required={required}
      sx={{ mb: 0.5 }}
      {...rest}
    />
  );
}
