import type { ReactElement } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { ChecklistFormPage } from "./pages/ChecklistFormPage";
import { HelpPage } from "./pages/HelpPage";
import { IssuesPage } from "./pages/IssuesPage";
import { LoginPage } from "./pages/LoginPage";
import { SafetyHubPage } from "./pages/SafetyHubPage";
import type { UserRole } from "./types";

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<SafetyHubPage />} />
          <Route path="/forms/:slug" element={<ChecklistFormPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route
            path="/issues"
            element={
              <ProtectedRoute allowedRoles={["supervisor", "admin"]}>
                <IssuesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactElement;
  allowedRoles?: UserRole[];
}) {
  const { isLoading, profile } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-stone-50" />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
