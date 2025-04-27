import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail"; 
import Operations from "./pages/Operations";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AccountDetail from "./pages/AccountDetail";
import TransactionDetail from "./pages/TransactionDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:clientId" element={<ClientDetail />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/operations/transaction/:transactionId" element={<TransactionDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/accounts/:accountId" element={<AccountDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
