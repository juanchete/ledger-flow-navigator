import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, DollarSign, Landmark, CreditCard, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useDailyComparison } from "@/hooks/useDailyComparison";
import { DailyChangeIndicator, DailyChangeTooltip } from "./DailyChangeIndicator";
import { VESLayersBreakdown } from "./VESLayersBreakdown";

interface BankAccountUI {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  currency: "USD" | "VES";
  historicalCostUsd?: number;
}

interface NetWorthBreakdownProps {
  bankAccounts: BankAccountUI[];
  totalUSD: number;
  totalVES: number;
  netWorth: number;
  pendingReceivables?: number;
  pendingDebts?: number;
  isFullWidth?: boolean;
}

const formatCurrency = (amount: number, currency: 'USD' | 'VES') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  } else {
    return `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
  }
};

const formatCurrencyUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const NetWorthBreakdown = ({
  bankAccounts,
  totalUSD,
  totalVES,
  netWorth,
  pendingReceivables = 0,
  pendingDebts = 0,
  isFullWidth = false
}: NetWorthBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVESAccount, setSelectedVESAccount] = useState<BankAccountUI | null>(null);
  const { rates: exchangeRates, convertVESToUSD } = useExchangeRates();
  const { comparisons, getComparisonForAccount } = useDailyComparison({
    autoSaveSnapshot: true,
    autoRefresh: false
  });

  const usdAccounts = bankAccounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = bankAccounts.filter(acc => acc.currency === 'VES');

  // Calcular costo histórico de VES usando FIFO
  const totalVESHistoricalCost = vesAccounts.reduce(
    (sum, acc) => sum + (acc.historicalCostUsd || 0),
    0
  );

  // Para referencia: valor a tasa actual
  const totalVESAtCurrentRate = convertVESToUSD ? convertVESToUSD(totalVES, 'parallel') || 0 : 0;

  const getBankIcon = (bankName: string) => {
    const name = bankName.toLowerCase();
    if (name.includes('efectivo') || name.includes('cash') || name.includes('caja')) {
      return <DollarSign className="h-4 w-4" />;
    } else if (name.includes('banesco') || name.includes('banco')) {
      return <Landmark className="h-4 w-4" />;
    } else {
      return <CreditCard className="h-4 w-4" />;
    }
  };

  const getAccountLabel = (account: BankAccountUI) => {
    const lastFour = account.accountNumber.slice(-4);
    return `${account.bank} ****${lastFour}`;
  };

  if (isFullWidth) {
    // Layout de ancho completo con métricas adicionales
    return (
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="w-full">
                             <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-all duration-200 hover:shadow-md border border-transparent hover:border-primary/20">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <CardTitle className="text-lg font-semibold">Resumen Financiero</CardTitle>
                     <Badge variant="outline" className="text-xs animate-pulse">
                       {isOpen ? 'Clic para ocultar' : 'Clic para detalles'}
                     </Badge>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-muted-foreground hidden sm:inline">
                       {isOpen ? 'Ocultar desglose' : 'Ver desglose por cuenta'}
                     </span>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                     >
                       {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                     </Button>
                   </div>
                 </div>
                
                                 {/* Grid de métricas principales */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                   {/* Patrimonio Neto */}
                   <div className="text-center md:text-left p-4 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-200 hover:bg-primary/10">
                     <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                       <DollarSign className="h-4 w-4 text-primary" />
                       <div className="text-sm text-muted-foreground">Patrimonio Neto</div>
                     </div>
                     <div className="text-2xl md:text-3xl font-bold text-primary">
                       {formatCurrencyUSD(netWorth)}
                     </div>
                     <div className="text-xs text-muted-foreground mt-1">
                       Total en todas las cuentas
                     </div>
                   </div>
                   
                   {/* Cuentas por Cobrar */}
                   <div className="text-center p-4 rounded-lg bg-green-50 border border-green-100 transition-all duration-200 hover:bg-green-100">
                     <div className="flex items-center justify-center gap-2 mb-2">
                       <ArrowUp className="h-4 w-4 text-green-600" />
                       <div className="text-sm text-muted-foreground">Cuentas por Cobrar</div>
                     </div>
                     <div className="text-xl md:text-2xl font-bold text-green-600">
                       {formatCurrencyUSD(pendingReceivables)}
                     </div>
                     <div className="text-xs text-muted-foreground mt-1">
                       Pendientes de cobro
                     </div>
                   </div>
                   
                   {/* Deudas Pendientes */}
                   <div className="text-center md:text-right p-4 rounded-lg bg-red-50 border border-red-100 transition-all duration-200 hover:bg-red-100">
                     <div className="flex items-center justify-center md:justify-end gap-2 mb-2">
                       <ArrowDown className="h-4 w-4 text-red-600" />
                       <div className="text-sm text-muted-foreground">Deudas Pendientes</div>
                     </div>
                     <div className="text-xl md:text-2xl font-bold text-red-600">
                       {formatCurrencyUSD(pendingDebts)}
                     </div>
                     <div className="text-xs text-muted-foreground mt-1">
                       Pendientes de pago
                     </div>
                   </div>
                 </div>
                
                                 {/* Resumen por monedas */}
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
                   <div className="flex items-center gap-4 text-xs text-muted-foreground">
                     <span>USD: {formatCurrencyUSD(totalUSD)}</span>
                     <span>•</span>
                     <span>VES: Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}</span>
                   </div>
                 </div>
                 
                 {/* Indicador de interactividad */}
                 <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/30">
                   <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
                     <Landmark className="h-3 w-3" />
                     <span className="animate-pulse">
                       {isOpen ? 'Haz clic arriba para ocultar el desglose detallado' : 'Haz clic arriba para ver el desglose detallado por cuenta'}
                     </span>
                     <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                   </div>
                 </div>
              </CardHeader>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-6 pb-6">
            <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
              {/* Cuentas en USD */}
              {usdAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-700">Cuentas en USD</h4>
                    <Badge variant="outline" className="text-xs">
                      {formatCurrencyUSD(totalUSD)}
                    </Badge>
                  </div>
                  {usdAccounts.map((account) => {
                    const comparison = getComparisonForAccount(account.id);
                    return (
                      <div key={account.id} className="flex items-center justify-between py-3 px-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getBankIcon(account.bank)}
                          <span className="text-sm font-medium truncate">
                            {getAccountLabel(account)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-green-700">
                            {formatCurrency(account.amount, 'USD')}
                          </span>
                          {comparison && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <DailyChangeIndicator
                                    comparison={comparison}
                                    showPercentage={true}
                                    showAbsolute={false}
                                    size="sm"
                                    useHistoricalCost={false}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <DailyChangeTooltip comparison={comparison} useHistoricalCost={false} />
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cuentas en VES */}
              {vesAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-700">Cuentas en VES</h4>
                    <Badge variant="outline" className="text-xs">
                      Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        ≈ {formatCurrencyUSD(totalVESHistoricalCost)}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                            <HelpCircle className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm space-y-1">
                            <p className="font-medium">Costo Histórico USD (FIFO)</p>
                            <p className="text-xs text-muted-foreground">Suma del costo histórico de todas las capas VES</p>
                            <div className="pt-1 border-t text-xs">
                              <p>Valor a tasa actual: {formatCurrencyUSD(totalVESAtCurrentRate)}</p>
                              <p>Tasa paralela: Bs. {exchangeRates?.usd_to_ves_parallel.toFixed(2)}/USD</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {vesAccounts.map((account) => {
                    const comparison = getComparisonForAccount(account.id);
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => setSelectedVESAccount(account)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getBankIcon(account.bank)}
                          <span className="text-sm font-medium truncate">
                            {getAccountLabel(account)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-700">
                              {formatCurrencyUSD(account.historicalCostUsd || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>{formatCurrency(account.amount, 'VES')}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help" onClick={(e) => e.stopPropagation()}>
                                    <HelpCircle className="h-2 w-2" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm space-y-1">
                                    <p className="font-medium">Costo Histórico FIFO</p>
                                    <p className="text-xs">Suma del costo USD de las capas VES en esta cuenta</p>
                                    <div className="pt-1 border-t text-xs">
                                      <p>Valor a tasa actual: ≈ {formatCurrencyUSD(convertVESToUSD ? convertVESToUSD(account.amount, 'parallel') || 0 : 0)}</p>
                                      <p>Tasa: Bs. {exchangeRates?.usd_to_ves_parallel.toFixed(2)}/USD</p>
                                      <p className="text-primary font-medium mt-1">Clic para ver desglose de capas</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          {comparison && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <DailyChangeIndicator
                                    comparison={comparison}
                                    showPercentage={true}
                                    showAbsolute={false}
                                    size="sm"
                                    useHistoricalCost={true}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <DailyChangeTooltip comparison={comparison} useHistoricalCost={true} />
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Modal para desglose de capas VES - Full Width Layout */}
        <Dialog open={!!selectedVESAccount} onOpenChange={(open) => !open && setSelectedVESAccount(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Desglose de Capas VES FIFO - {selectedVESAccount?.bank} ****{selectedVESAccount?.accountNumber.slice(-4)}
              </DialogTitle>
            </DialogHeader>
            {selectedVESAccount && (
              <VESLayersBreakdown
                bankAccountId={selectedVESAccount.id}
                accountName={`${selectedVESAccount.bank} ****${selectedVESAccount.accountNumber.slice(-4)}`}
              />
            )}
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Layout compacto original
  return (
    <Card className="col-span-1 sm:col-span-2 lg:col-span-1 min-w-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="w-full">
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              <CardDescription className="text-xl md:text-2xl font-bold">
                {formatCurrencyUSD(netWorth)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-xs">
                <span className="text-muted-foreground">
                  Total en todas las cuentas
                </span>
                <div className="text-left sm:text-right space-y-0.5">
                  <div className="text-xs text-muted-foreground">USD: {formatCurrencyUSD(totalUSD)}</div>
                  <div className="text-xs text-muted-foreground">VES: Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}</div>
                </div>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-6 pb-6">
          <div className="space-y-4 border-t pt-4">
            {/* Cuentas en USD */}
            {usdAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-sm text-green-700">Cuentas en USD</h4>
                  <Badge variant="outline" className="text-xs">
                    {formatCurrencyUSD(totalUSD)}
                  </Badge>
                </div>
                {usdAccounts.map((account) => {
                  const comparison = getComparisonForAccount(account.id);
                  return (
                    <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-md">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getBankIcon(account.bank)}
                        <span className="text-sm font-medium truncate">
                          {getAccountLabel(account)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-green-700">
                          {formatCurrency(account.amount, 'USD')}
                        </span>
                        {comparison && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <DailyChangeIndicator
                                  comparison={comparison}
                                  showPercentage={true}
                                  showAbsolute={false}
                                  size="sm"
                                  useHistoricalCost={false}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <DailyChangeTooltip comparison={comparison} useHistoricalCost={false} />
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cuentas en VES */}
            {vesAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm text-blue-700">Cuentas en VES</h4>
                  <Badge variant="outline" className="text-xs">
                    Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      ≈ {formatCurrencyUSD(totalVESHistoricalCost)}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">Costo Histórico USD (FIFO)</p>
                          <p className="text-xs text-muted-foreground">Suma del costo histórico de todas las capas VES</p>
                          <div className="pt-1 border-t text-xs">
                            <p>Valor a tasa actual: {formatCurrencyUSD(totalVESAtCurrentRate)}</p>
                            <p>Tasa paralela: Bs. {exchangeRates?.usd_to_ves_parallel.toFixed(2)}/USD</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {vesAccounts.map((account) => {
                  const comparison = getComparisonForAccount(account.id);
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setSelectedVESAccount(account)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getBankIcon(account.bank)}
                        <span className="text-sm font-medium truncate">
                          {getAccountLabel(account)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-700">
                            {formatCurrencyUSD(account.historicalCostUsd || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>{formatCurrency(account.amount, 'VES')}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help" onClick={(e) => e.stopPropagation()}>
                                  <HelpCircle className="h-2 w-2" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm space-y-1">
                                  <p className="font-medium">Costo Histórico FIFO</p>
                                  <p className="text-xs">Suma del costo USD de las capas VES en esta cuenta</p>
                                  <div className="pt-1 border-t text-xs">
                                    <p>Valor a tasa actual: ≈ {formatCurrencyUSD(convertVESToUSD ? convertVESToUSD(account.amount, 'parallel') || 0 : 0)}</p>
                                    <p>Tasa: Bs. {exchangeRates?.usd_to_ves_parallel.toFixed(2)}/USD</p>
                                    <p className="text-primary font-medium mt-1">Clic para ver desglose de capas</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        {comparison && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div onClick={(e) => e.stopPropagation()}>
                                <DailyChangeIndicator
                                  comparison={comparison}
                                  showPercentage={true}
                                  showAbsolute={false}
                                  size="sm"
                                  useHistoricalCost={true}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <DailyChangeTooltip comparison={comparison} useHistoricalCost={true} />
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumen total */}
            <div className="border-t pt-3 mt-4">
              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Total Patrimonio</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatCurrencyUSD(netWorth)}
                </span>
              </div>
            </div>

            {/* Información adicional */}
            <div className="text-xs text-muted-foreground space-y-1 mt-3">
              <div className="flex justify-between">
                <span>Total cuentas USD:</span>
                <span>{usdAccounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total cuentas VES:</span>
                <span>{vesAccounts.length}</span>
              </div>
              {exchangeRates && (
                <div className="flex justify-between">
                  <span>Tasa de cambio:</span>
                  <span>Bs. {exchangeRates.usd_to_ves_parallel.toFixed(2)}/USD</span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modal para desglose de capas VES */}
      <Dialog open={!!selectedVESAccount} onOpenChange={(open) => !open && setSelectedVESAccount(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Desglose de Capas VES FIFO - {selectedVESAccount?.bank} ****{selectedVESAccount?.accountNumber.slice(-4)}
            </DialogTitle>
          </DialogHeader>
          {selectedVESAccount && (
            <VESLayersBreakdown
              bankAccountId={selectedVESAccount.id}
              accountName={`${selectedVESAccount.bank} ****${selectedVESAccount.accountNumber.slice(-4)}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}; 