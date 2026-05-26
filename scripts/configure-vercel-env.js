// ============================================================
// CREARD - Script para configurar variables de entorno en Vercel
// Ejecutar: node scripts/configure-vercel-env.js
// ============================================================

const fs = require('fs');
const path = require('path');

// Credenciales de Vercel (del proyecto)
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || '';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || '';

const VERCEL_API = 'https://api.vercel.com/v10';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

async function vercelRequest(endpoint, options = {}) {
  const url = `${VERCEL_API}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vercel API Error ${response.status}: ${text}`);
  }
  
  return response.json();
}

async function setEnvVar(key, value, environments = ['production', 'preview', 'development']) {
  try {
    await vercelRequest(`/projects/${VERCEL_PROJECT_ID}/env`, {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: environments,
      }),
    });
    log(`  ✅ ${key}`, 'green');
  } catch (error) {
    log(`  ❌ ${key}: ${error.message}`, 'red');
  }
}

async function main() {
  console.log('');
  log('══════════════════════════════════════════════════════', 'cyan');
  log('  CREARD - Configuración de Variables en Vercel', 'cyan');
  log('══════════════════════════════════════════════════════', 'cyan');
  console.log('');

  // Leer .env.local
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    log('❌ No se encontró .env.local', 'red');
    log('Ejecuta primero: bash scripts/setup-firebase.sh', 'yellow');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }

  log('Variables encontradas en .env.local:', 'cyan');
  console.log('');

  // Configurar cada variable
  for (const [key, value] of Object.entries(envVars)) {
    await setEnvVar(key, value);
  }

  console.log('');
  log('══════════════════════════════════════════════════════', 'green');
  log('  ✅ Variables de entorno configuradas en Vercel', 'green');
  log('══════════════════════════════════════════════════════', 'green');
  console.log('');
  log('Nota: Las variables estarán disponibles en el próximo deploy.', 'yellow');
  log('Para forzar un nuevo deploy, ejecuta:', 'yellow');
  log('  vercel --prod --force', 'cyan');
  console.log('');
}

main().catch(err => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});
