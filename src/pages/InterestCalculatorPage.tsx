import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { InterestCalculator } from '@/components/InterestCalculator';

const InterestCalculatorPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">Volver</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Calculadora de Intereses</h1>
      </div>
      
      <div className="max-w-6xl">
        <InterestCalculator />
      </div>
      
      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">📊 Validación de Rentabilidad</h3>
            <p className="text-sm text-muted-foreground">
              El sistema valida automáticamente que la tasa de interés genere al menos un 10% de rentabilidad. 
              Si no cumple con este mínimo, mostrará una alerta y sugerirá la tasa mínima recomendada.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">🧮 Cálculo de Cuotas</h3>
            <p className="text-sm text-muted-foreground">
              Utiliza la fórmula de amortización francesa para calcular cuotas fijas mensuales, 
              considerando el interés compuesto sobre el saldo pendiente.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">💰 Información Detallada</h3>
            <p className="text-sm text-muted-foreground">
              Muestra el monto total a recibir, intereses ganados, cuota mensual, 
              tasa efectiva anual y porcentaje de rentabilidad.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">⚠️ Alertas Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Sistema de alertas que te avisa cuando la rentabilidad es menor al 10% mínimo requerido, 
              con sugerencias automáticas para optimizar la tasa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterestCalculatorPage; 