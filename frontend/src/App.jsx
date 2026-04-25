import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import AdminDashboard from "./pages/AdminDashboard";
import EntryFlowPage from "./pages/EntryFlowPage";
import HomePage from "./pages/HomePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
import SchoolDashboardPage from "./pages/SchoolDashboardPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryFlowPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/student-login" element={<StudentLoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="home" element={<HomePage />} />
        <Route path="school-dashboard" element={<SchoolDashboardPage />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
      <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
      <Route path="/students/:id" element={<StudentDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
