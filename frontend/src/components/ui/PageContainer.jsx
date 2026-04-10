import Container from "@mui/material/Container";
import Box from "@mui/material/Box";

export function PageContainer({ maxWidth = "lg", children, sx = {} }) {
  return (
    <Container maxWidth={maxWidth}>
      <Box sx={{ py: 4, ...sx }}>{children}</Box>
    </Container>
  );
}
