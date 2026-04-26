import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const studentPathMatch = location.pathname.match(/^\/students\/([^/]+)$/);
  const routeStudentId = studentPathMatch ? studentPathMatch[1] : "";
  let studentSessionId = "";
  try {
    studentSessionId = localStorage.getItem("eduvylix_student_id") || "";
  } catch {
    studentSessionId = "";
  }

  // Permit only the selected student profile for roll-number login sessions.
  const hasValidStudentSession = (Boolean(routeStudentId) && routeStudentId === studentSessionId) || 
                                (location.pathname === "/leaderboard" && Boolean(studentSessionId));

  if (!isAuthenticated) {
    if (hasValidStudentSession) {
      return children;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}

export default PrivateRoute;
