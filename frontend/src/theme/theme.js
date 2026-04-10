import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#05A39A", contrastText: "#fff" },
    secondary: { main: "#D9D9D9" },
    error: { main: "#E53E3E" },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
    text: { primary: "#1E1E1E", secondary: "#A1A1A1" },
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    h4: { fontWeight: 500, color: "#05A39A" },
    body2: { color: "#7B7B7B" },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            "& fieldset": { borderColor: "#D9D9D9" },
            "&:hover fieldset": { borderColor: "#05A39A" },
            "&.Mui-focused fieldset": { borderColor: "#05A39A" },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 500 },
        containedPrimary: {
          "&:hover": { backgroundColor: "#05A39A" },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: { backgroundColor: "#F6FBFB", color: "#335E5B", border: "1px solid #BFE0DE" },
        standardError: { backgroundColor: "#FFF7F7", color: "#C53030", border: "1px solid #FEB2B2" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: "1px solid #D9D9D9" } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowY: "scroll",
          scrollbarGutter: "stable",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        body: {
          backgroundColor: "#FFFFFF",
          minHeight: "100vh",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        "#root": {
          minHeight: "100vh",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      },
    },
  },
});

export default theme;
