# Descripción de Componentes y Pantallas

Este documento describe la función de cada componente y pantalla principal del proyecto, para evitar duplicidad y facilitar la colaboración.

## Páginas (Screens)

- **Dashboard.tsx**  
  Pantalla principal del sistema. Muestra el resumen financiero, balances, cuentas bancarias, operaciones recientes, alertas y eventos próximos.

- **AllDebts.tsx**  
  Muestra el listado completo de todas las deudas registradas en el sistema.

- **AllObras.tsx (AllExpenses)**  
  Gestión de gastos con dos categorías: gastos simples que se descuentan directamente de las cuentas, y proyectos de inversión (obras) que incrementan el patrimonio.

- **Clients.tsx**  
  Pantalla para la gestión y visualización de todos los clientes, tanto directos como indirectos.

- **Statistics.tsx**  
  Presenta estadísticas financieras y gráficas relevantes para el usuario o la empresa.

- **Settings.tsx**  
  Permite configurar opciones generales del sistema y preferencias del usuario.

- **Operations.tsx**  
  Muestra y gestiona todas las operaciones financieras realizadas.

- **NotFound.tsx**  
  Pantalla de error para rutas no encontradas (404).

- **ClientDetail.tsx**  
  Muestra el detalle de un cliente específico, incluyendo sus operaciones, deudas y movimientos.

- **TransactionDetail.tsx**  
  Detalle de una transacción específica, con toda la información relevante.

- **AllReceivables.tsx**  
  Listado completo de todas las cuentas por cobrar.

- **HistoricalBalance.tsx**  
  Visualiza el historial de balances financieros a lo largo del tiempo.

- **Calendar.tsx**  
  Muestra eventos y operaciones en formato calendario.

- **Auth.tsx**  
  Pantalla de autenticación (login, registro, etc.).

- **Index.tsx**  
  Punto de entrada o redirección inicial de las rutas.

- **AccountDetail.tsx**  
  Detalle de una cuenta bancaria específica.

- **CreateObra.tsx (CreateInvestmentProject)**  
  Formulario para crear nuevos proyectos de inversión que incrementan el patrimonio.

- **ObraDetail.tsx (InvestmentProjectDetail)**  
  Detalle de un proyecto de inversión específico, incluyendo seguimiento de gastos y progreso del presupuesto.

## Componentes

- **AppSidebar.tsx**  
  Barra lateral de navegación principal de la aplicación. Actualizada para mostrar "Gastos" en lugar de "Obras".

- **Icons.tsx**  
  Conjunto de íconos personalizados utilizados en la interfaz.

- **AuthProvider.tsx**  
  Proveedor de contexto para la autenticación de usuarios.

- **ProtectedRoute.tsx**  
  Componente para proteger rutas que requieren autenticación.

- **AppLayout.tsx**  
  Estructura base de la aplicación, incluyendo layout general.

- **BankAccountsModal.tsx**  
  Modal para mostrar el detalle de las cuentas bancarias (USD o VES) del usuario.

- **DebtsAndReceivables**  
  Componente que muestra el resumen y detalle de deudas y cuentas por cobrar.

- **TransactionForm**  
  Formulario para crear una nueva transacción financiera.

- **Table, TableBody, TableCell, TableHead, TableHeader, TableRow**  
  Componentes reutilizables para mostrar datos en formato de tabla.

- **Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle**  
  Componentes de UI para mostrar información, botones de acción y tarjetas de resumen.

- **mockData**  
  Archivo con datos simulados para pruebas y desarrollo.

- **Carpetas operations/, debts/, common/, ui/, calendar/**  
  Contienen componentes especializados para operaciones, deudas, utilidades comunes, elementos de UI y funcionalidades de calendario, respectivamente. Se recomienda revisar el contenido de cada carpeta para detalles específicos.

## Notas

- Si agregas un nuevo componente o pantalla, por favor documenta aquí su propósito.
- Antes de crear un nuevo componente, revisa este archivo para evitar duplicidad.

---

> **Actualiza este archivo conforme evolucione el proyecto y se agreguen nuevos componentes o pantallas. 