// Script para aplicar la migración de campos de tasa de cambio a la base de datos
// Ejecutar con: node apply-migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuración de Supabase (ajustar según sea necesario)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl.includes('YOUR_') || supabaseKey.includes('YOUR_')) {
  console.error('❌ Por favor configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migración: campos de tasa de cambio...');

    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'resources/migrations/add_debt_exchange_rate_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Dividir por comandos individuales (cada comando termina con ;)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📄 Ejecutando ${commands.length} comandos SQL...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`   ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: command });

      if (error) {
        // Algunos errores pueden ser esperados (como IF NOT EXISTS)
        if (error.message.includes('already exists') || error.message.includes('IF NOT EXISTS')) {
          console.log(`   ℹ️  Campo ya existe, omitiendo...`);
        } else {
          console.error(`   ❌ Error en comando ${i + 1}:`, error.message);
        }
      } else {
        console.log(`   ✅ Comando ${i + 1} ejecutado correctamente`);
      }
    }

    console.log('✅ Migración completada!');

    // Verificar que los campos se agregaron correctamente
    console.log('\n🔍 Verificando estructura de la tabla debts...');
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error al verificar estructura:', error.message);
    } else {
      console.log('✅ Estructura verificada correctamente');
      if (data && data.length > 0) {
        const fields = Object.keys(data[0]);
        const newFields = ['exchange_rate', 'amount_usd', 'exchange_rate_id'];
        const missingFields = newFields.filter(field => !fields.includes(field));

        if (missingFields.length > 0) {
          console.log(`⚠️  Campos faltantes: ${missingFields.join(', ')}`);
        } else {
          console.log('✅ Todos los campos nuevos están presentes');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
applyMigration();