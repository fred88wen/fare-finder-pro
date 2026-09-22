import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { RequireAuth } from "./components/RequireAuth";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            {/* Legacy paths from the TanStack Start version */}
            <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
      <Analytics />
    </RootErrorBoundary>
  );
}
