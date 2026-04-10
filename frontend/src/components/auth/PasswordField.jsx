import { useState } from "react";
import MuiTextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export function PasswordField({ label = "Password", error, required, ...rest }) {
  const [show, setShow] = useState(false);

  return (
    <MuiTextField
      label={label}
      type={show ? "text" : "password"}
      error={Boolean(error)}
      helperText={error || " "}
      required={required}
      sx={{ mb: 0.5 }}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow((s) => !s)} edge="end" tabIndex={-1}>
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      {...rest}
    />
  );
}
