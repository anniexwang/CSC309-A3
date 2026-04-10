import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();
  const parentContext = useOutletContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const dest = role === "admin" ? "/admin" : role === "business" ? "/business" : "/regular";
    return <Navigate to={dest} replace />;
  }

  return <Outlet context={parentContext} />;
}
