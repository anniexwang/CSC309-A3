import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import { Navbar } from "./Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../api/client";

export function DashboardLayout() {
  const { token, role } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      if (role === "regular") {
        const data = await apiRequest("/users/me", { token });
        setDisplayName(`${data.first_name} ${data.last_name}`);
        setAvatarUrl(data.avatar || null);
      } else if (role === "business") {
        const data = await apiRequest("/businesses/me", { token });
        setDisplayName(data.business_name || data.owner_name);
        setAvatarUrl(data.avatar || null);
      } else if (role === "admin") {
        setDisplayName("Admin");
        setAvatarUrl(null);
      }
    } catch {
      setDisplayName("User");
    }
  }, [token, role]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar displayName={displayName} avatarUrl={avatarUrl} />
      <Box component="main">
        <Outlet context={{ refreshProfile, displayName, avatarUrl }} />
      </Box>
    </Box>
  );
}
