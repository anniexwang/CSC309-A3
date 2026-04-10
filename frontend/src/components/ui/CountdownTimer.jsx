import { useEffect, useMemo, useState } from "react";
import Typography from "@mui/material/Typography";

function getRemainingSeconds(targetIsoTime) {
  return Math.max(0, Math.floor((new Date(targetIsoTime).getTime() - Date.now()) / 1000));
}

export function CountdownTimer({ targetIsoTime, expiredLabel = "Expired", ...rest }) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(targetIsoTime));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemainingSeconds(targetIsoTime)), 1000);
    return () => clearInterval(timer);
  }, [targetIsoTime]);

  const text = useMemo(() => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [remaining]);

  return (
    <Typography variant="body2" color={remaining > 0 ? "text.primary" : "error"} {...rest}>
      {remaining > 0 ? `Time left: ${text}` : expiredLabel}
    </Typography>
  );
}
