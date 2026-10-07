import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const normalize = (r) => {
  const s = (r || "").toLowerCase().replace(/[-_]/g, "");
  if (s === "mainadmin" || s === "superadmin") return "main_admin";
  if (s === "nhgsecretary" || s === "secretary") return "nhg_secretary";
  if (s === "member") return "member";
  return s;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <div className="container py-5 text-center text-muted" role="status">Checking your membership status…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = normalize(user.role);

    // Main Admin has platform-level access to all management modules
    if (userRole === "main_admin") {
      return children;
    }

    const isPermitted = allowedRoles.some((role) => {
      const targetRole = normalize(role);
      return userRole === targetRole;
    });

    if (!isPermitted) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
