import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { Navbar } from "../layout/Navbar";

export function AuthLayout({ children }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Box
        sx={{
          minHeight: { xs: "auto", sm: "calc(100vh - 64px)" },
          px: 2,
          py: 4,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container maxWidth="sm">{children}</Container>
      </Box>
    </Box>
  );
}
