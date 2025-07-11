# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ledger Flow Navigator** is a comprehensive accounting software designed for detailed financial control of income and debts. The system supports multi-currency operations (USD/VES) and distinguishes between direct and indirect clients.

### Key Business Concepts

- **Direct Clients**: Clients with direct commercial relationships with the company
- **Indirect Clients**: Clients of clients who make payments or settle debts on behalf of direct clients
- **Multi-currency Support**: Full support for Venezuelan Bolívares (VES) and US Dollars (USD)
- **Investment Projects (Obras)**: Special expense category that increases net worth rather than decreasing it

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Core Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: React Context API + TanStack Query
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Project Structure

```
src/
├── components/       # Reusable components organized by feature
│   ├── operations/  # Transaction-related components
│   ├── debts/       # Debt management components
│   ├── receivables/ # Receivables components
│   ├── wizard/      # Multi-step form components
│   └── ui/          # shadcn/ui components
├── context/         # React Context providers
├── hooks/           # Custom React hooks
├── integrations/    # External service integrations
│   └── supabase/    # Database services and types
├── pages/           # Route components
└── types/           # TypeScript type definitions

resources/           # Documentation and database schemas
├── db_schema.sql    # Complete database schema
├── RLS_IMPLEMENTATION_GUIDE.md  # Row Level Security guide
└── COMPONENTS_OVERVIEW.md       # Component documentation
```

### State Management Pattern

The app uses a hybrid approach:

1. **Global State via Context API**:
   - `AuthContext`: Authentication and user management with role-based access
   - `TransactionContext`: Transaction CRUD and real-time updates
   - `ClientContext`: Client data management
   - `DebtContext`: Debt operations
   - `TransactionWizardContext`: Multi-step form state

2. **Server State via React Query**: 
   - Caching and synchronization of server data
   - Optimistic updates for better UX

3. **Event-Driven Updates**:
   ```typescript
   // Custom events for cross-component communication
   const TRANSACTION_UPDATED_EVENT = 'transactionUpdated';
   const BANK_BALANCE_UPDATED_EVENT = 'bankBalanceUpdated';
   ```

### Database Schema

The database includes the following main tables:
- `users`: Extended from Supabase auth with role management
- `clients`: Direct and indirect client management
- `bank_accounts`: Multi-currency account tracking
- `transactions`: All financial operations
- `debts` & `receivables`: Debt and credit management
- `calendar_events`: Event and reminder tracking
- `exchange_rates`: Currency conversion rates
- Audit tables for all major entities

### Row Level Security (RLS)

The system implements comprehensive RLS policies:
- Each user only sees their own data
- Admin users have full access
- Automatic `user_id` assignment via triggers
- Performance-optimized with proper indexes

### Authentication & Authorization

1. User signs in via Supabase Auth
2. `AuthProvider` manages session state
3. `ProtectedRoute` guards authenticated routes
4. Role-based access for admin features (e.g., Settings page)

### Transaction Types

The system supports various transaction types:
- **sale**: Income from sales
- **purchase**: Expenses from purchases
- **cash**: Direct cash operations
- **expense**: General expenses
- **payment**: Debt payments
- **balance-change**: Manual balance adjustments

### Form Handling Patterns

1. **Simple Forms**: Direct integration with React Hook Form
2. **Complex Forms**: Multi-step wizard pattern with context
3. **Optimized Variants**: Performance-focused versions (e.g., `TransactionFormOptimized`)

### Component Patterns

- **Compound Components**: Complex UI split into focused sub-components
- **Modal Pattern**: Extensive use of Dialog components for forms
- **Responsive Design**: Mobile-first approach with Tailwind utilities
- **Loading States**: Consistent skeleton loaders and spinners

### API Error Handling

All service methods follow this pattern:
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Error:', error);
  throw error;
}
```

### Key Features

1. **Dashboard**: Real-time financial overview with auto-refresh capabilities
2. **Multi-currency Operations**: Automatic conversion using exchange rates
3. **Client Relationship Management**: Direct and indirect client tracking
4. **Debt & Receivables Management**: Comprehensive tracking with interest and commissions
5. **Investment Projects**: Special expenses that increase net worth
6. **Bank Account Integration**: Automatic balance updates via database triggers
7. **Calendar Integration**: Event and payment reminders
8. **Audit Trail**: Complete history of all changes

### Performance Considerations

- Code splitting at the route level
- Parallel data fetching in dashboard views
- Memoization of expensive calculations
- Optimistic UI updates for better perceived performance
- Database indexes on all foreign keys and frequently queried fields

### Testing Approach

When implementing tests:
- Focus on integration tests for critical flows
- Mock Supabase client for unit tests
- Test custom hooks with React Testing Library
- Verify RLS policies work correctly

## Development Guidelines

### Before Creating New Components
1. Check `resources/COMPONENTS_OVERVIEW.md` to avoid duplication
2. Follow existing patterns in similar components
3. Use optimized variants where performance is critical

### When Working with Database
1. All operations go through service files in `/integrations/supabase/`
2. Balance updates are handled by database triggers - never update manually
3. Always consider RLS policies when adding new features
4. Use proper TypeScript types from generated Supabase types

### Currency Handling
- All monetary values stored as numbers in the database
- Use `formatCurrency` utility from `/lib/utils` for display
- Exchange rates managed through `exchangeRateService`
- Support for both official and parallel exchange rates

### Important Conventions
- Timestamps use `TIMESTAMP WITH TIME ZONE`
- IDs are `VARCHAR(64)` for consistency
- Status fields use specific enums (check schema)
- All tables have `created_at` and `updated_at` fields

## Security Considerations

1. **Row Level Security**: Enforced at database level
2. **Authentication**: Handled by Supabase Auth
3. **API Keys**: Never expose in client code
4. **Sensitive Data**: Never log or expose user financial data
5. **Admin Access**: Restricted to users with 'admin' role

## Common Tasks

### Adding a New Transaction Type
1. Update database schema if needed
2. Add type to transaction type enum
3. Update `TransactionForm` components
4. Add handling in `update_bank_account_balance()` trigger

### Adding a New Report
1. Create service method in appropriate service file
2. Add new page component in `/pages`
3. Update routing in `App.tsx`
4. Add navigation item in `AppSidebar.tsx`

### Updating Exchange Rates
- Use `exchangeRateService` for all rate operations
- Support both system-wide and user-specific rates
- Consider caching for performance