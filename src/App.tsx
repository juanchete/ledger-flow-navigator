
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail"; 
import Operations from "./pages/Operations";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AccountDetail from "./pages/AccountDetail";
import TransactionDetail from "./pages/TransactionDetail";
import AllDebts from "./pages/AllDebts";
import AllReceivables from "./pages/AllReceivables";
import HistoricalBalance from "./pages/HistoricalBalance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId" element={<ClientDetail />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/operations/transaction/:transactionId" element={<TransactionDetail />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/accounts/:accountId" element={<AccountDetail />} />
              <Route path="/all-debts" element={<AllDebts />} />
              <Route path="/all-receivables" element={<AllReceivables />} />
              <Route path="/historical-balance" element={<HistoricalBalance />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
