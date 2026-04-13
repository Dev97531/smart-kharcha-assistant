import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { useTheme } from "@/hooks/useTheme";
import Index from "./pages/Index";
import AddExpense from "./pages/AddExpense";
import LendingPage from "./pages/LendingPage";
import MonthlySpend from "./pages/MonthlySpend";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/lending" element={<LendingPage />} />
        <Route path="/monthly" element={<MonthlySpend />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

function ThemedApp() {
  // useTheme handles the dark class on documentElement
  useTheme();

  return (
    <AuthProvider>
      <FinanceProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <ThemedApp />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
