#!/bin/bash

# Script para aplicar migraciones RLS de forma segura
# Este script debe ejecutarse después de hacer backup de la base de datos

set -e  # Salir en caso de error

echo "🔒 Iniciando aplicación de migraciones Row Level Security (RLS)"
echo "================================================"

# Verificar que estamos en el directorio correcto
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Error: No se encontró el directorio supabase/migrations"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que las migraciones RLS existen
RLS_MIGRATION="supabase/migrations/20250115000000_implement_rls_policies.sql"
VERIFICATION_MIGRATION="supabase/migrations/20250115000001_rls_verification_script.sql"

if [ ! -f "$RLS_MIGRATION" ]; then
    echo "❌ Error: No se encontró la migración RLS principal"
    echo "   Archivo esperado: $RLS_MIGRATION"
    exit 1
fi

if [ ! -f "$VERIFICATION_MIGRATION" ]; then
    echo "❌ Error: No se encontró la migración de verificación RLS"
    echo "   Archivo esperado: $VERIFICATION_MIGRATION"
    exit 1
fi

echo "✅ Migraciones RLS encontradas"

# Función para verificar conexión a Supabase
check_supabase_connection() {
    echo "🔍 Verificando conexión a Supabase..."
    if ! npx supabase status > /dev/null 2>&1; then
        echo "❌ Error: No se puede conectar a Supabase"
        echo "   Verifica tu configuración de Supabase"
        echo "   Ejecuta: npx supabase login"
        exit 1
    fi
    echo "✅ Conexión a Supabase verificada"
}

# Función para hacer backup (opcional pero recomendado)
create_backup() {
    echo "🗄️  Creando backup de la base de datos..."
    BACKUP_FILE="backup_before_rls_$(date +%Y%m%d_%H%M%S).sql"
    
    if npx supabase db dump -f "$BACKUP_FILE" > /dev/null 2>&1; then
        echo "✅ Backup creado: $BACKUP_FILE"
        echo "   Guarda este archivo en un lugar seguro"
    else
        echo "⚠️  No se pudo crear backup automático"
        echo "   Se recomienda hacer backup manual desde el dashboard de Supabase"
        read -p "¿Continuar sin backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Operación cancelada"
            exit 1
        fi
    fi
}

# Función para aplicar migraciones
apply_migrations() {
    echo "📦 Aplicando migraciones RLS..."
    
    echo "  ➤ Aplicando migración principal RLS..."
    if npx supabase migration up --include-all > /dev/null 2>&1; then
        echo "  ✅ Migración principal aplicada exitosamente"
    else
        echo "  ❌ Error aplicando migración principal"
        echo "     Revisa los logs de Supabase para más detalles"
        exit 1
    fi
    
    echo "  ➤ Verificando estado de migraciones..."
    npx supabase migration list
}

# Función para verificar implementación
verify_rls_implementation() {
    echo "🔍 Verificando implementación RLS..."
    
    # Crear un archivo temporal con las consultas de verificación
    VERIFY_SQL=$(cat << 'EOF'
-- Verificar que RLS está habilitado en las tablas principales
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'bank_accounts', 'debts', 'receivables', 'transactions')
ORDER BY tablename;

-- Contar políticas RLS
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verificar funciones helper
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'owns_record', 'set_user_id');
EOF
)

    echo "$VERIFY_SQL" > /tmp/verify_rls.sql
    
    if npx supabase db sql -f /tmp/verify_rls.sql > /dev/null 2>&1; then
        echo "✅ Verificación básica completada"
        rm -f /tmp/verify_rls.sql
    else
        echo "⚠️  No se pudo ejecutar verificación automática"
        echo "   Verifica manualmente en el dashboard de Supabase"
        rm -f /tmp/verify_rls.sql
    fi
}

# Función para mostrar próximos pasos
show_next_steps() {
    echo ""
    echo "🎉 ¡Migraciones RLS aplicadas exitosamente!"
    echo "================================================"
    echo ""
    echo "📋 PRÓXIMOS PASOS REQUERIDOS:"
    echo ""
    echo "1. 🔄 Regenerar tipos TypeScript:"
    echo "   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts"
    echo ""
    echo "2. 🛠️  Actualizar servicios del frontend:"
    echo "   - clientService.ts"
    echo "   - transactionService.ts"
    echo "   - debtService.ts"
    echo "   - receivableService.ts"
    echo "   - calendarEventService.ts"
    echo "   - exchangeRateService.ts"
    echo ""
    echo "3. 🧪 Ejecutar verificaciones en Supabase SQL Editor:"
    echo "   SELECT * FROM public.test_rls_policies();"
    echo "   SELECT * FROM public.test_data_isolation();"
    echo "   SELECT * FROM public.test_admin_access();"
    echo ""
    echo "4. 🔍 Revisar la guía completa en:"
    echo "   resources/RLS_IMPLEMENTATION_GUIDE.md"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Todos los datos existentes han sido asignados al primer usuario"
    echo "   - Revisa y reasigna datos según sea necesario"
    echo "   - Prueba exhaustivamente antes de usar en producción"
    echo ""
}

# Función principal
main() {
    echo "Este script aplicará políticas de Row Level Security a tu base de datos."
    echo "Esto incluye:"
    echo "- Agregar columnas user_id a todas las tablas"
    echo "- Habilitar RLS en todas las tablas"
    echo "- Crear políticas de aislamiento de datos"
    echo "- Configurar triggers automáticos"
    echo ""
    
    read -p "¿Continuar con la aplicación de RLS? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operación cancelada"
        exit 0
    fi
    
    check_supabase_connection
    create_backup
    apply_migrations
    verify_rls_implementation
    show_next_steps
}

# Ejecutar función principal
main 