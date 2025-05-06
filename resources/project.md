# Descripción del Proyecto

Este proyecto es un **software de contabilidad** diseñado para que el cliente pueda llevar un control detallado de los ingresos y deudas de su empresa.

## Particularidades del Sistema

- **Gestión de Clientes Directos e Indirectos:**
  - Un **cliente directo** es aquel con el que la empresa tiene una relación comercial directa.
  - Un **cliente indirecto** es aquel que, aunque no es cliente directo de la empresa, realiza pagos o salda deudas en nombre de un cliente directo. Es decir, es un cliente de mi cliente.

- **Operaciones Multimoneda:**
  - El sistema permite registrar y gestionar operaciones tanto en **bolívares (VES)** como en **dólares (USD)**, facilitando el control financiero en ambas monedas.

## Objetivo

Brindar a usuarios y empresas una herramienta intuitiva para el seguimiento de su salud financiera, con paneles visuales, reportes y gestión de operaciones.

## Tecnologías Utilizadas

- **Frontend:** React (TypeScript)
- **Ruteo:** React Router
- **Componentes UI:** Shadcn/UI, Lucide React Icons
- **Estilos:** Tailwind CSS
- **Manejo de estado:** useState, useEffect (React hooks)
- **Formularios y modales:** Componentes personalizados y de Shadcn/UI

## Estructura Principal

- `/src/pages/Dashboard.tsx`: Panel principal con resumen financiero, balances, cuentas y operaciones recientes.
- `/src/components/`: Componentes reutilizables (modales, tablas, formularios, etc).
- `/src/data/mockData.ts`: Datos simulados para desarrollo y pruebas.
- `/resources/`: Documentación interna, reglas para IA, convenciones y recursos.

## Funcionalidades Clave

- Visualización de patrimonio neto, cuentas por cobrar y deudas.
- Gestión de cuentas bancarias en USD y VES.
- Registro y visualización de transacciones.
- Alertas de clientes y eventos próximos.
- Paneles y tablas interactivas.
- Diferenciación y gestión de clientes directos e indirectos.

## Consideraciones Técnicas

- El proyecto utiliza datos simulados, pero está preparado para integrarse con APIs reales.
- El diseño es responsivo y accesible.
- Se siguen buenas prácticas de modularidad y reutilización de componentes.

---

> **Nota:** Amplía este archivo con detalles sobre la arquitectura, dependencias, instrucciones de despliegue, o cualquier aspecto técnico relevante a medida que evolucione el proyecto.
