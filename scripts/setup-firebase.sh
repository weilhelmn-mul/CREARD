#!/usr/bin/env bash
# ============================================================
# CREARD - Script de Configuración Automática de Firebase
# Ejecutar: bash scripts/setup-firebase.sh
# Requisitos: Firebase CLI instalado (npm install -g firebase-tools)
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     CREARD - Configuración Automática de Firebase     ║"
echo "║     Gestión de Canchas Deportivas - San Sebastián     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# --- Paso 1: Verificar Firebase CLI ---
echo -e "${YELLOW}[1/7] Verificando Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Firebase CLI no encontrado. Instalando...${NC}"
    npm install -g firebase-tools
    echo -e "${GREEN}Firebase CLI instalado correctamente.${NC}"
else
    echo -e "${GREEN}Firebase CLI v$(firebase --version | head -1) encontrado.${NC}"
fi

# --- Paso 2: Iniciar sesión en Firebase ---
echo -e "${YELLOW}[2/7] Iniciando sesión en Firebase...${NC}"
echo -e "${CYAN}Se abrirá tu navegador para iniciar sesión con Google.${NC}"
echo -e "${CYAN}Si estás en un servidor, usa: firebase login:ci --no-localhost${NC}"
firebase login

# --- Paso 3: Crear el proyecto de Firebase ---
PROJECT_ID="creard-sport-$(date +%s)"
PROJECT_NAME="CREARD - Gestión de Canchas Deportivas"

echo -e "${YELLOW}[3/7] Creando proyecto de Firebase...${NC}"
echo -e "${CYAN}Nombre: $PROJECT_NAME${NC}"
echo -e "${CYAN}ID: $PROJECT_ID${NC}"

firebase projects:create "$PROJECT_ID" --display-name="$PROJECT_NAME"

echo -e "${GREEN}Proyecto creado: $PROJECT_ID${NC}"

# --- Paso 4: Seleccionar el proyecto ---
echo -e "${YELLOW}[4/7] Seleccionando proyecto...${NC}"
firebase use "$PROJECT_ID"

# --- Paso 5: Crear la base de datos Firestore ---
echo -e "${YELLOW}[5/7] Creando base de datos Firestore...${NC}"
echo -e "${CYAN}Seleccionando región: southamerica-east1 (São Paulo)${NC}"

# Crear Firestore database
firebase firestore:databases:create --location=southamerica-east1 || {
    echo -e "${YELLOW}Nota: La base de datos puede necesitar ser creada manualmente en la consola.${NC}"
    echo -e "${CYAN}Ve a: https://console.firebase.google.com/project/$PROJECT_ID/firestore${NC}"
    echo -e "${CYAN}y crea la base de datos en modo de producción (southamerica-east1)${NC}"
    read -p "Presiona Enter cuando hayas creado la base de datos..."
}

echo -e "${GREEN}Firestore configurado.${NC}"

# --- Paso 6: Crear Service Account para el Admin SDK ---
echo -e "${YELLOW}[6/7] Configurando Service Account...${NC}"

# Habilitar la API de Identity Toolkit (para Firebase Auth)
echo -e "${CYAN}Habilitando APIs necesarias...${NC}"

# Crear service account key
echo -e "${CYAN}Creando clave de Service Account...${NC}"
echo -e "${CYAN}Esto descargará un archivo JSON con las credenciales.${NC}"

# Obtener el número de proyecto
PROJECT_NUMBER=$(firebase projects:list --json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data.get('result', []):
    if p.get('projectId') == '$PROJECT_ID':
        print(p.get('projectNumber', ''))
        break
" 2>/dev/null || echo "")

if [ -z "$PROJECT_NUMBER" ]; then
    echo -e "${YELLOW}No se pudo obtener el project number automáticamente.${NC}"
    echo -e "${CYAN}Necesitarás crear el Service Account manualmente:${NC}"
    echo -e "${CYAN}1. Ve a https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$PROJECT_ID${NC}"
    echo -e "${CYAN}2. Nombre: creard-admin-sdk${NC}"
    echo -e "${CYAN}3. Rol: Firebase Admin > Administrador de Firebase${NC}"
    echo -e "${CYAN}4. Crea una clave JSON y guárdala como creard-service-account.json${NC}"
    read -p "Presiona Enter cuando hayas descargado la clave JSON..."
    
    if [ ! -f "creard-service-account.json" ]; then
        echo -e "${RED}Error: No se encontró el archivo creard-service-account.json${NC}"
        exit 1
    fi
else
    # Usar gcloud para crear el service account
    echo -e "${CYAN}Project Number: $PROJECT_NUMBER${NC}"
    
    # Verificar si gcloud está disponible
    if command -v gcloud &> /dev/null; then
        gcloud iam service-accounts create "creard-admin-sdk" \
            --display-name="CREARD Admin SDK" \
            --project="$PROJECT_ID"
        
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:creard-admin-sdk@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/firebaseadmin"
        
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:creard-admin-sdk@$PROJECT_ID.iam.gserviceaccount.com" \
            --role="roles/datastore.user"
        
        # Descargar la clave JSON
        mkdir -p scripts
        gcloud iam service-accounts keys create scripts/creard-service-account.json \
            --iam-account="creard-admin-sdk@$PROJECT_ID.iam.gserviceaccount.com"
    else
        echo -e "${YELLOW}gcloud CLI no encontrado. Creando Service Account manualmente...${NC}"
        echo -e "${CYAN}1. Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$PROJECT_ID${NC}"
        echo -e "${CYAN}2. Nombre: creard-admin-sdk${NC}"
        echo -e "${CYAN}3. Rol: Editor de proyecto básico o Firebase Admin${NC}"
        echo -e "${CYAN}4. Descarga la clave en formato JSON${NC}"
        
        # Abrir navegador
        open "https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$PROJECT_ID" 2>/dev/null || \
        xdg-open "https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$PROJECT_ID" 2>/dev/null || \
        echo -e "${CYAN}Abre manualmente la URL de arriba${NC}"
        
        read -p "Descarga la clave JSON y guárdala como scripts/creard-service-account.json, luego presiona Enter..."
    fi
fi

echo -e "${GREEN}Service Account configurado.${NC}"

# --- Paso 7: Configurar Authentication ---
echo -e "${YELLOW}[7/7] Configurando Firebase Authentication...${NC}"

# Habilitar Email/Password auth
echo -e "${CYAN}Para habilitar la autenticación por Email/Password:${NC}"
echo -e "${CYAN}1. Ve a: https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers${NC}"
echo -e "${CYAN}2. Habilita 'Email/Contraseña'${NC}"
echo -e "${CYAN}3. Guarda los cambios${NC}"

# Abrir navegador
open "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers" 2>/dev/null || \
xdg-open "https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers" 2>/dev/null || \
echo -e "${CYAN}Abre manualmente la URL de arriba${NC}"

read -p "Presiona Enter cuando hayas habilitado Email/Password Authentication..."

# --- Resumen y generación de variables de entorno ---
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║          Configuración Completada                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Leer el service account JSON
SA_FILE="scripts/creard-service-account.json"
if [ -f "$SA_FILE" ]; then
    echo -e "${GREEN}Generando variables de entorno...${NC}"
    
    # Extraer valores del JSON
    SA_TYPE=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('type','service_account'))")
    SA_PROJECT_ID=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('project_id',''))")
    SA_PRIVATE_KEY_ID=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('private_key_id',''))")
    SA_PRIVATE_KEY=$(python3 -c "import json; d=json.load(open('$SA_FILE')); import os; print(d.get('private_key',''))")
    SA_CLIENT_EMAIL=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('client_email',''))")
    SA_CLIENT_ID=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('client_id',''))")
    SA_AUTH_URI=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('auth_uri','https://accounts.google.com/o/oauth2/auth'))")
    SA_TOKEN_URI=$(python3 -c "import json; d=json.load(open('$SA_FILE')); print(d.get('token_uri','https://oauth2.googleapis.com/token'))")
    
    # Variables del cliente (Firebase Web App)
    # El usuario necesita crear una Web App en la consola para obtener estas
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}PASO FINAL: Configurar la Web App de Firebase${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}1. Ve a: https://console.firebase.google.com/project/$PROJECT_ID/settings/general${NC}"
    echo -e "${CYAN}2. Haz clic en 'Añadir aplicación' > 'Web' (</> icon)${NC}"
    echo -e "${CYAN}3. Nombre: creard-web${NC}"
    echo -e "${CYAN}4. NO habilitar Firebase Hosting (o sí, como prefieras)${NC}"
    echo -e "${CYAN}5. Copia el objeto 'firebaseConfig' que aparece${NC}"
    echo ""
    
    open "https://console.firebase.google.com/project/$PROJECT_ID/settings/general" 2>/dev/null || \
    xdg-open "https://console.firebase.google.com/project/$PROJECT_ID/settings/general" 2>/dev/null || true
    
    echo -e "${CYAN}Ingresa los valores del firebaseConfig de tu Web App:${NC}"
    echo ""
    
    read -p "apiKey: " API_KEY
    read -p "authDomain (ej: creard-sport-xxxxx.web.app): " AUTH_DOMAIN
    read -p "projectId (presiona Enter para usar $SA_PROJECT_ID): " INPUT_PID
    WEB_PROJECT_ID=${INPUT_PID:-$SA_PROJECT_ID}
    read -p "storageBucket (ej: creard-sport-xxxxx.appspot.com): " STORAGE_BUCKET
    read -p "messagingSenderId: " MSG_SENDER_ID
    read -p "appId: " APP_ID
    
    # Generar archivo .env.local
    ENV_FILE=".env.local"
    cat > "$ENV_FILE" << EOF
# ============================================================
# CREARD - Variables de Entorno de Firebase
# Generado automáticamente por setup-firebase.sh
# ¡NO COMPARTIR ESTE ARCHIVO! ¡NO SUBIR A GIT!
# ============================================================

# --- Firebase Admin SDK (Server-Side) ---
FIREBASE_SERVICE_ACCOUNT_TYPE=$SA_TYPE
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=$SA_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=$SA_PRIVATE_KEY_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY='$SA_PRIVATE_KEY'
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=$SA_CLIENT_EMAIL
FIREBASE_SERVICE_ACCOUNT_CLIENT_ID=$SA_CLIENT_ID
FIREBASE_SERVICE_ACCOUNT_AUTH_URI=$SA_AUTH_URI
FIREBASE_SERVICE_ACCOUNT_TOKEN_URI=$SA_TOKEN_URI

# --- Firebase Client SDK (Browser-Side) ---
NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$WEB_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$MSG_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$APP_ID
EOF
    
    echo -e "${GREEN}"
    echo "✅ Variables de entorno guardadas en $ENV_FILE"
    echo -e "${NC}"
    
    # Mostrar resumen
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════"
    echo "  RESUMEN DE CONFIGURACIÓN"
    echo "═══════════════════════════════════════════════════════"
    echo "  Proyecto Firebase: $SA_PROJECT_ID"
    echo "  Web App: creard-web"
    echo "  Firestore: southamerica-east1"
    echo "  Auth: Email/Password"
    echo "  Service Account: $SA_CLIENT_EMAIL"
    echo ""
    echo "  Archivo de credenciales: $SA_FILE"
    echo "  Archivo de entorno: $ENV_FILE"
    echo ""
    echo "  PRÓXIMOS PASOS:"
    echo "  1. Ejecuta: npm run dev  (probar localmente)"
    echo "  2. Ejecuta: node scripts/seed-firestore.js  (poblar datos)"
    echo "  3. Despliega en Vercel con las variables de entorno"
    echo "═══════════════════════════════════════════════════════"
    echo -e "${NC}"
    
else
    echo -e "${RED}Error: No se encontró $SA_FILE${NC}"
    echo -e "${YELLOW}Configura las variables de entorno manualmente en Vercel.${NC}"
fi

echo -e "${GREEN}¡Configuración de Firebase completada! 🎉${NC}"
