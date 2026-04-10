import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";

import { PageContainer } from "../../components/ui/PageContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../contexts/AuthContext";
import { getNegotiations } from "../../api/negotiations";

export function NegotiationRedirectPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [hasNegotiations, setHasNegotiations] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveDestination() {
      setLoading(true);
      setError("");

      try {
        const data = await getNegotiations(token, { status: "active", limit: 200 });
        const results = data.results || [];

        if (cancelled) return;

        if (results.length === 0) {
          setHasNegotiations(false);
          setDestination("");
        } else if (results.length === 1) {
          setHasNegotiations(true);
          setDestination(`/negotiations/${results[0].id}`);
        } else {
          setHasNegotiations(true);
          setDestination("/negotiations");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load negotiations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  return (
    <PageContainer maxWidth="sm">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Paper sx={{ p: 3 }}>
        <EmptyState
          message={
            hasNegotiations
              ? "Unable to open your negotiations right now."
              : "You are not currently in an active negotiation."
          }
        />
      </Paper>
    </PageContainer>
  );
}
