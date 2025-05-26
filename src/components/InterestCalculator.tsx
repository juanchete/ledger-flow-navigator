import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { calculateInterest, calculateMinimumInterestRate, formatPercentage, formatCurrency } from "@/utils/interestCalculator";

interface InterestCalculatorProps {
  onInterestRateChange?: (rate: number) => void;
  onInstallmentsChange?: (installments: number) => void;
  initialAmount?: number;
  initialRate?: number;
  initialInstallments?: number;
  compact?: boolean;
}

export const InterestCalculator: React.FC<InterestCalculatorProps> = ({
  onInterestRateChange,
  onInstallmentsChange,
  initialAmount = 1000,
  initialRate = 12,
  initialInstallments = 12,
  compact = false
}) => {
  const [principal, setPrincipal] = useState(initialAmount);
  const [annualRate, setAnnualRate] = useState(initialRate);
  const [installments, setInstallments] = useState(initialInstallments);

  useEffect(() => {
    setPrincipal(initialAmount);
  }, [initialAmount]);

  useEffect(() => {
    setAnnualRate(initialRate);
  }, [initialRate]);

  useEffect(() => {
    setInstallments(initialInstallments);
  }, [initialInstallments]);

  const calculation = calculateInterest(principal, annualRate, installments);
  const minimumRate = calculateMinimumInterestRate(principal, installments);

  const handleRateChange = (newRate: number) => {
    setAnnualRate(newRate);
    if (onInterestRateChange) {
      onInterestRateChange(newRate);
    }
  };

  const handleInstallmentsChange = (newInstallments: number) => {
    setInstallments(newInstallments);
    if (onInstallmentsChange) {
      onInstallmentsChange(newInstallments);
    }
  };

  const applyMinimumRate = () => {
    handleRateChange(minimumRate);
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora de Intereses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="principal-compact" className="text-xs">Monto</Label>
              <Input
                id="principal-compact"
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="rate-compact" className="text-xs">Tasa (%)</Label>
              <Input
                id="rate-compact"
                type="number"
                step="0.1"
                value={annualRate}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="installments-compact" className="text-xs">Cuotas</Label>
              <Input
                id="installments-compact"
                type="number"
                value={installments}
                onChange={(e) => handleInstallmentsChange(Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Cuota mensual:</span>
              <span className="font-medium">{formatCurrency(calculation.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rentabilidad:</span>
              <Badge variant={calculation.profitabilityPercentage >= 10 ? "default" : "destructive"} className="text-xs">
                {formatPercentage(calculation.profitabilityPercentage)}
              </Badge>
            </div>
          </div>

                      {calculation.profitabilityPercentage < 10 && (
              <Button 
                onClick={applyMinimumRate}
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
              >
                Usar tasa mínima ({formatPercentage(minimumRate)})
              </Button>
            )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculadora de Intereses
        </CardTitle>
        <CardDescription>
          Calcula cuotas mensuales y valida rentabilidad mínima del 10%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="principal">Monto Principal ($)</Label>
            <Input
              id="principal"
              type="number"
              step="0.01"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              placeholder="1000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rate">Tasa de Interés Anual (%)</Label>
            <Input
              id="rate"
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              placeholder="12"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="installments">Número de Cuotas</Label>
            <Input
              id="installments"
              type="number"
              min="1"
              max="360"
              value={installments}
              onChange={(e) => handleInstallmentsChange(Number(e.target.value))}
              placeholder="12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resultados
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Cuota Mensual:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(calculation.monthlyPayment)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total a Recibir:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(calculation.totalAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Intereses Ganados:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(calculation.totalInterest)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Rentabilidad:</span>
                <Badge 
                  variant={calculation.profitabilityPercentage >= 10 ? "default" : "destructive"}
                  className="text-sm px-3 py-1"
                >
                  {formatPercentage(calculation.profitabilityPercentage)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Adicional</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Tasa Efectiva Anual:</span>
                <span className="font-medium">{formatPercentage(calculation.effectiveAnnualRate)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Plazo:</span>
                <span className="font-medium">{installments} meses</span>
              </div>
              
              <div className="flex justify-between">
                <span>Monto Principal:</span>
                <span className="font-medium">{formatCurrency(principal)}</span>
              </div>
            </div>

                         {calculation.profitabilityPercentage < 10 && (
               <Alert>
                 <AlertTriangle className="h-4 w-4" />
                 <AlertDescription className="space-y-2">
                   <p>La rentabilidad es menor al 10% mínimo requerido.</p>
                   <p>Tasa mínima recomendada: <strong>{formatPercentage(minimumRate)}</strong></p>
                   <Button 
                     onClick={applyMinimumRate}
                     size="sm"
                     className="mt-2"
                   >
                     Aplicar Tasa Mínima
                   </Button>
                 </AlertDescription>
               </Alert>
             )}

             {calculation.profitabilityPercentage >= 10 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-green-700">
                    ✅ <strong>Rentable:</strong> La operación cumple con el mínimo del 10% de rentabilidad.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 