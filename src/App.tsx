import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { TransactionProvider } from "./context/TransactionContext";
import { ClientProvider } from "./context/ClientContext";
import { DebtProvider } from "./contexts/DebtContext";
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
import DebtDetail from "./pages/DebtDetail";
import ReceivableDetail from "./pages/ReceivableDetail";
import BankAccounts from "./pages/BankAccounts";
import ExchangeRates from "./pages/ExchangeRates";
import InterestCalculatorPage from "./pages/InterestCalculatorPage";
import AllExpenses from "./pages/AllObras";
import CreateInvestmentProject from "./pages/CreateObra";
import InvestmentProjectDetail from "./pages/ObraDetail";
import { TestFunctionality } from "./components/TestFunctionality";
import Invoices from "./pages/Invoices";
// import { SetupInvoices } from "./components/SetupInvoices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClientProvider>
            <TransactionProvider>
              <DebtProvider>
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
                    <Route path="/settings" element={
                      <ProtectedRoute requireAdmin={true}>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/accounts" element={<BankAccounts />} />
                    <Route path="/accounts/:accountId" element={<AccountDetail />} />
                    <Route path="/all-debts" element={<AllDebts />} />
                    <Route path="/all-debts/:debtId" element={<DebtDetail />} />
                    <Route path="/all-receivables" element={<AllReceivables />} />
                    <Route path="/all-receivables/:receivableId" element={<ReceivableDetail />} />
                    <Route path="/historical-balance" element={<HistoricalBalance />} />
                    <Route path="/exchange-rates" element={<ExchangeRates />} />
                    <Route path="/interest-calculator" element={<InterestCalculatorPage />} />
                    <Route path="/obras" element={<AllExpenses />} />
                    <Route path="/obras/new" element={<CreateInvestmentProject />} />
                    <Route path="/obras/:id" element={<InvestmentProjectDetail />} />
                    <Route path="/invoices" element={<Invoices />} />
                    {/* <Route path="/setup-invoices" element={<SetupInvoices />} /> */}
                    <Route path="/test-functionality" element={<TestFunctionality />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </DebtProvider>
            </TransactionProvider>
          </ClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
