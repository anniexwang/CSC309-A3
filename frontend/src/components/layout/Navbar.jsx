import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MailIcon from "@mui/icons-material/Mail";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useAuth } from "../../contexts/AuthContext";
import {
  countUnreadAdminNotifications,
  getAdminNotifications,
  getAdminNotificationsLastSeen,
  markAdminNotificationsSeen,
  shouldRefreshAdminNotificationsForEvent as shouldRefreshAdminBellForEvent,
  storeAdminNotificationEvent,
} from "../../api/adminNotifications";
import {
  NEGOTIATION_INBOX_UPDATED_EVENT,
  countUnreadBusinessNavbarMessages,
  countUnreadRegularNavbarMessages,
  countUnreadRegularNotifications,
  getRegularNotifications,
  getRegularNotificationsLastSeen,
  markBusinessNegotiationInboxSeen,
  markRegularNotificationsSeen,
  shouldRefreshRegularNotificationsForEvent,
  storeBusinessNegotiationMessageEvent,
  storeRegularChatMessageEvent,
  storeRegularNotificationEvent,
} from "../../api/notifications";
import { getMyProfile } from "../../api/profile";
import { getMyBusiness } from "../../api/businessProfile";
import { getSocket } from "../../lib/socket";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getNavItems(role, isAuthenticated) {
  if (!isAuthenticated) {
    return [
      { label: "Home", path: "/" },
      { label: "Businesses", path: "/businesses" },
      // { label: "Log In", path: "/login" },
      // { label: "Sign Up", path: "/register" },
    ];
  }

  switch (role) {
    case "regular":
      return [
        { label: "Home", path: "/regular" },
        // { label: "Profile", path: "/regular/profile" },
        { label: "Businesses", path: "/businesses" },
        { label: "Jobs", path: "/regular/jobs" },
        { label: "Positions", path: "/positions" },
        { label: "Qualifications", path: "/regular/qualifications" },
      ];
    case "business":
      return [
        { label: "Home", path: "/business" },
        // { label: "Profile", path: "/business/profile" },
        // { label: "Businesses", path: "/businesses" },
        { label: "Job Postings", path: "/business/jobs" },
        // { label: "Positions", path: "/positions" },
      ];
    case "admin":
      return [
        { label: "Users", path: "/admin/users" },
        { label: "Businesses", path: "/admin/businesses" },
        { label: "Positions", path: "/admin/positions" },
        { label: "Qualifications", path: "/admin/qualifications" },
        // { label: "System", path: "/admin/system" },
      ];
    default:
      return [];
  }
}

function getHomePath(role, isAuthenticated) {
  if (!isAuthenticated) return "/";
  if (role === "business") return "/business";
  if (role === "admin") return "/admin";
  return "/regular";
}

function getProfilePath(role) {
  if (role === "business") return "/business/profile";
  if (role === "admin") return "/admin";
  return "/regular/profile";
}

function pathMatches(pathname, path) {
  if (path === "/") return pathname === "/";
  if (path === "/regular" || path === "/business" || path === "/admin") {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getCurrentNegotiationId(pathname) {
  const match = pathname.match(/^\/negotiations\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function getCurrentTab(pathname, navItems) {
  if (pathname.startsWith("/admin/qualification-users/")) {
    return navItems.findIndex((item) => item.path === "/admin/positions");
  }

  let bestMatch = false;

  navItems.forEach((item, index) => {
    if (!pathMatches(pathname, item.path)) return;
    if (bestMatch === false || item.path.length > navItems[bestMatch].path.length) {
      bestMatch = index;
    }
  });

  return bestMatch;
}

export function Navbar({ displayName, avatarUrl }) {
  const { isAuthenticated, role, token, accountId, email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [fallbackDisplayName, setFallbackDisplayName] = useState("");
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [adminUnreadNotificationCount, setAdminUnreadNotificationCount] = useState(0);
  const [businessUnreadMessageCount, setBusinessUnreadMessageCount] = useState(0);
  const [regularUnreadMessageCount, setRegularUnreadMessageCount] = useState(0);

  const hasProvidedProfile = displayName !== undefined || avatarUrl !== undefined;

  const navItems = getNavItems(role, isAuthenticated);
  const tabValue = getCurrentTab(location.pathname, navItems);
  const homePath = getHomePath(role, isAuthenticated);
  const notificationsPath = role === "admin" ? "/admin/notifications" : "/notifications";
  const notificationsActive = pathMatches(location.pathname, notificationsPath);
  const invitationsPath = "/invitations";
  const invitationsActive = role === "regular" && pathMatches(location.pathname, invitationsPath);
  const negotiationPath = role === "business" ? "/negotiations" : "/negotiation";
  const negotiationsActive =
    pathMatches(location.pathname, "/negotiation") ||
    pathMatches(location.pathname, "/negotiations");
  const interestsPath = "/regular/interests";
  const interestsActive = role === "regular" && pathMatches(location.pathname, interestsPath);
  const currentNegotiationId = getCurrentNegotiationId(location.pathname);
  const businessNegotiationsIndexActive = role === "business" && location.pathname === "/negotiations";

  const loadNavbarProfile = useCallback(async () => {
    if (!isAuthenticated || hasProvidedProfile) {
      setFallbackDisplayName("");
      setFallbackAvatarUrl(null);
      return;
    }

    try {
      if (role === "regular") {
        const data = await getMyProfile(token);
        setFallbackDisplayName(`${data.first_name} ${data.last_name}`.trim());
        setFallbackAvatarUrl(data.avatar || null);
        return;
      }

      if (role === "business") {
        const data = await getMyBusiness(token);
        setFallbackDisplayName(data.business_name || data.owner_name || "");
        setFallbackAvatarUrl(data.avatar || null);
        return;
      }

      if (role === "admin") {
        setFallbackDisplayName("Admin");
        setFallbackAvatarUrl(null);
        return;
      }
    } catch {
      setFallbackDisplayName(role === "admin" ? "Admin" : email || "");
      setFallbackAvatarUrl(null);
    }
  }, [email, hasProvidedProfile, isAuthenticated, role, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNavbarProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadNavbarProfile]);

  const loadUnreadNotifications = useCallback(async () => {
    if (!isAuthenticated || role !== "regular" || !token) {
      setUnreadNotificationCount(0);
      setRegularUnreadMessageCount(0);
      return;
    }

    if (location.pathname === "/notifications") {
      markRegularNotificationsSeen(accountId);
      setUnreadNotificationCount(0);
      setRegularUnreadMessageCount(countUnreadRegularNavbarMessages(accountId));
      return;
    }

    try {
      const notifications = await getRegularNotifications(token, accountId);
      setUnreadNotificationCount(
        countUnreadRegularNotifications(notifications, getRegularNotificationsLastSeen(accountId))
      );
      setRegularUnreadMessageCount(countUnreadRegularNavbarMessages(accountId));
    } catch {
      setUnreadNotificationCount(0);
      setRegularUnreadMessageCount(0);
    }
  }, [accountId, isAuthenticated, location.pathname, role, token]);

  const loadAdminUnreadNotifications = useCallback(async () => {
    if (!isAuthenticated || role !== "admin" || !token) {
      setAdminUnreadNotificationCount(0);
      return;
    }

    if (location.pathname === "/admin/notifications") {
      markAdminNotificationsSeen();
      setAdminUnreadNotificationCount(0);
      return;
    }

    try {
      const notifications = await getAdminNotifications(token);
      setAdminUnreadNotificationCount(
        countUnreadAdminNotifications(notifications, getAdminNotificationsLastSeen())
      );
    } catch {
      setAdminUnreadNotificationCount(0);
    }
  }, [isAuthenticated, location.pathname, role, token]);

  const loadBusinessUnreadMessages = useCallback(() => {
    if (!isAuthenticated || role !== "business" || !accountId) {
      setBusinessUnreadMessageCount(0);
      return;
    }

    setBusinessUnreadMessageCount(countUnreadBusinessNavbarMessages(accountId));
  }, [accountId, isAuthenticated, role]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUnreadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadUnreadNotifications]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAdminUnreadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAdminUnreadNotifications]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadBusinessUnreadMessages();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBusinessUnreadMessages]);

  useEffect(() => {
    if (!isAuthenticated || role !== "business" || !accountId) return;
    if (location.pathname !== "/negotiations") return;

    markBusinessNegotiationInboxSeen(accountId);
  }, [accountId, isAuthenticated, location.pathname, role]);

  useEffect(() => {
    if (!isAuthenticated || !accountId) return undefined;

    const handleInboxUpdate = (event) => {
      const detail = event.detail || {};
      if (String(detail.accountId) !== String(accountId)) return;

      if (detail.scope === "business" && role === "business") {
        setBusinessUnreadMessageCount(countUnreadBusinessNavbarMessages(accountId));
      }

      if (detail.scope === "regular" && role === "regular") {
        setRegularUnreadMessageCount(countUnreadRegularNavbarMessages(accountId));
      }
    };

    window.addEventListener(NEGOTIATION_INBOX_UPDATED_EVENT, handleInboxUpdate);
    return () => {
      window.removeEventListener(NEGOTIATION_INBOX_UPDATED_EVENT, handleInboxUpdate);
    };
  }, [accountId, isAuthenticated, role]);

  useEffect(() => {
    if (!isAuthenticated || role !== "regular" || !token) return undefined;

    const socket = getSocket(token);
    const refreshNotifications = (event) => {
      if (event?.scope === "regular-chat" && event?.type === "negotiation-message") {
        if (currentNegotiationId && String(event.negotiationId) === String(currentNegotiationId)) {
          return;
        }

        storeRegularChatMessageEvent(accountId, event);
        return;
      }
      if (!shouldRefreshRegularNotificationsForEvent(event)) return;
      storeRegularNotificationEvent(accountId, event);
      void loadUnreadNotifications();
    };

    socket.on("notification:event", refreshNotifications);

    return () => {
      socket.off("notification:event", refreshNotifications);
    };
  }, [accountId, currentNegotiationId, isAuthenticated, loadUnreadNotifications, role, token]);

  useEffect(() => {
    if (!isAuthenticated || role !== "business" || !token) return undefined;

    const socket = getSocket(token);
    const refreshNegotiations = (event) => {
      if (event?.scope === "business-negotiations" && event?.type === "negotiation-message") {
        if (currentNegotiationId && String(event.negotiationId) === String(currentNegotiationId)) {
          return;
        }

        storeBusinessNegotiationMessageEvent(accountId, event, {
          incrementNav: !businessNegotiationsIndexActive,
        });
      }
    };

    socket.on("notification:event", refreshNegotiations);

    return () => {
      socket.off("notification:event", refreshNegotiations);
    };
  }, [accountId, businessNegotiationsIndexActive, currentNegotiationId, isAuthenticated, role, token]);

  useEffect(() => {
    if (!isAuthenticated || role !== "admin" || !token) return undefined;

    const socket = getSocket(token);
    const refreshAdminNotifications = (event) => {
      if (!shouldRefreshAdminBellForEvent(event)) return;
      storeAdminNotificationEvent(event);
      void loadAdminUnreadNotifications();
    };

    socket.on("notification:event", refreshAdminNotifications);

    return () => {
      socket.off("notification:event", refreshAdminNotifications);
    };
  }, [isAuthenticated, loadAdminUnreadNotifications, role, token]);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/");
  };

  const effectiveDisplayName = hasProvidedProfile ? displayName : fallbackDisplayName;
  const effectiveAvatarUrl = hasProvidedProfile ? avatarUrl : fallbackAvatarUrl;
  const resolvedAvatar = effectiveAvatarUrl
    ? (effectiveAvatarUrl.startsWith("http") ? effectiveAvatarUrl : `${API_BASE}${effectiveAvatarUrl}`)
    : undefined;

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          component={RouterLink}
          to={homePath}
          variant="subtitle1"
          sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Temping Platform
        </Typography>

        <Tabs
          value={tabValue}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ flexGrow: 1 }}
        >
          {navItems.map((item) => (
            <Tab
              key={item.path}
              label={item.label}
              component={RouterLink}
              to={item.path}
            />
          ))}
          {!isAuthenticated && (
            <Tab
              key="/register"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                  <span>Log In/Sign Up</span>
                </Box>
              }
              component={RouterLink}
              to="/register"
              sx={{ ml: "auto" }}
            />
          )}
        </Tabs>

        {isAuthenticated && (
          <>
            {role !== "admin" && 
              <IconButton
                size="small"
                component={RouterLink}
                to={negotiationPath}
                sx={{ color: negotiationsActive ? "primary.main" : "inherit" }}
              >
                {role === "business" ? (
                  <Badge
                    color="error"
                    badgeContent={businessUnreadMessageCount}
                    invisible={businessUnreadMessageCount === 0}
                  >
                    {negotiationsActive ? <ChatBubbleIcon />: <ChatBubbleOutlineIcon />}
                  </Badge>
                ) : (
                  <Badge
                    color="error"
                    badgeContent={regularUnreadMessageCount}
                    invisible={regularUnreadMessageCount === 0}
                  >
                    {negotiationsActive ? <ChatBubbleIcon />: <ChatBubbleOutlineIcon />}
                  </Badge>
                )}
              </IconButton>
            }
            {role === "regular" && 
              <IconButton 
                size="small" 
                component={RouterLink} 
                to={interestsPath}
                sx={{ color: interestsActive ? "primary.main" : "inherit" }}
              >
                {interestsActive ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
            }
            {role === "regular" &&
              <IconButton
                size="small"
                component={RouterLink}
                to={invitationsPath}
                sx={{ color: invitationsActive ? "primary.main" : "inherit" }}
              >
                {invitationsActive ? <MailIcon /> : <MailOutlineIcon />}
              </IconButton>
            }
            {role !== "business" && 
              <IconButton
                size="small"
                component={RouterLink}
                to={notificationsPath}
                sx={{ color: notificationsActive ? "primary.main" : "inherit" }}
              >
                {role === "regular" ? (
                  <Badge color="error" badgeContent={unreadNotificationCount} invisible={unreadNotificationCount === 0}>
                    {notificationsActive ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                  </Badge>
                ) : role === "admin" ? (
                  <Badge
                    color="error"
                    badgeContent={adminUnreadNotificationCount}
                    invisible={adminUnreadNotificationCount === 0}
                  >
                    {notificationsActive ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                  </Badge>
                ) : (
                  notificationsActive ? <MailIcon /> : <MailOutlineIcon />
                )}
              </IconButton>
            }
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 1 }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <Avatar src={resolvedAvatar} sx={{ width: 32, height: 32 }}>
                {effectiveDisplayName?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500 }}>
                {effectiveDisplayName || "User"}
              </Typography>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 160 } } }}
            >
              {role !== "admin" && 
                <MenuItem component={RouterLink} to={getProfilePath(role)} onClick={() => setAnchorEl(null)}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  Profile
                </MenuItem>
              }
              {role === "business" &&
                <MenuItem component={RouterLink} to="/business/employees" onClick={() => setAnchorEl(null)}>
                  <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                  Employees
                </MenuItem>
              }
              {role === "regular" && 
                <MenuItem component={RouterLink} to="/history" onClick={() => setAnchorEl(null)}>
                  <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                  My Jobs
                </MenuItem>
              }
              {role === "admin" && 
                <MenuItem component={RouterLink} to="/admin/system" onClick={() => setAnchorEl(null)}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  System Settings
                </MenuItem>
              }
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Log Out
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
