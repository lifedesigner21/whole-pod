import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ClientDashboard from "@/pages/ClientDashboard";
import DepartmentDashboard from "@/pages/DepartmentDashboard";
import LoadingSpinner from "@/components/LoadingSpinner";
import Navigation from "@/components/Navigation";
import NotFound from "./pages/NotFound";
import AddUser from "./components/AddUsers";
import AccessDenied from "./pages/AccessDenied";
import AdminProjectDetails from "./pages/AdminProjectDetails";
import MilestoneDetailsPage from "./components/MilestoneDetailsPage";
import MyWorkboard from "./pages/MyWorkBoard";
import ProjectDetailPage from "./pages/project/[projectId]";
import Profile from "./components/Profile";
import InvoicesPage from "./pages/InvoicesPage";
import TasksPage from "./components/client/TaskPage";
import InvoiceDashboard from "./components/InvoiceAndPayment";
import Users from "./components/UsersList";
import { useWarnOnTabCloseOnly } from "./hooks/useWarnOnTabCloseOnly";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const LoginRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
};

const DashboardRouter = () => {
  const { userRole, user, loading } = useAuth();

  // Still loading auth info
  if (loading || !user || !userRole) {
    return <LoadingSpinner />;
  }

  // Auth loaded, but user or role not available — don't redirect immediately
  // if (!user || !userRole) {
  //   return (
  //     <div className="text-center py-10">
  //       <p className="text-gray-600">No role assigned. Please log in again.</p>
  //       <Navigate to="/login" replace />
  //     </div>
  //   );
  // }

  // Render dashboard based on role
  switch (userRole) {
    case "admin":
      return <AdminDashboard />;
    case "client":
      return <ClientDashboard />;
    case "designer":
    case "developer":
    case "legalteam":
      return <DepartmentDashboard />;
    default:
      return (
        <div className="text-center py-10">
          <p className="text-red-500">Unknown role.</p>
        </div>
      );
  }
};

const AppContent = () => {
  const { user } = useAuth();

  // 👇 This enables tab/window close confirmation
  useWarnOnTabCloseOnly();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {user && <Navigation />}
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/project/:projectId" element={<AdminProjectDetails />} />
          <Route
            path="/client/project/:projectId"
            element={<ProjectDetailPage />}
          />
          <Route
            path="/project/:projectId/milestone/:milestoneId"
            element={<MilestoneDetailsPage />}
          />
          <Route
            path="/client/project/:projectId/milestone/:milestoneId/tasks"
            element={<TasksPage />}
          />
          <Route path="/my-workboard" element={<MyWorkboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/client/invoices" element={<InvoicesPage />} />
          <Route path="/payments" element={<InvoiceDashboard />} />
          <Route path="usersList" element={<Users />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
