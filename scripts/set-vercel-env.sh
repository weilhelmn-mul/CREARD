#!/usr/bin/env bash
# ============================================================
# CREARD - Configurar variables de Firebase en Vercel via API
# Uso: bash scripts/set-vercel-env.sh
# 
# Este script lee .env.local y sube todas las variables
# a Vercel como environment variables encriptadas.
# ============================================================

set -e

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
VERCEL_API="https://api.vercel.com/v10"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}No se encontro $ENV_FILE${NC}"
    echo -e "${YELLOW}Copia .env.local.example a .env.local y completa los valores.${NC}"
    echo -e "${CYAN}  cp .env.local.example .env.local${NC}"
    exit 1
fi

echo -e "${CYAN}"
echo "Configurando variables de entorno en Vercel..."
echo "Proyecto: creard ($VERCEL_PROJECT_ID)"
echo -e "${NC}"

count=0
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    
    # Remove surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    
    # Skip empty values
    [[ "$value" =~ ^tu_ || "$value" =~ ^TU_ || -z "$value" ]] && {
        echo -e "${YELLOW}  SKIPPED $key (valor placeholder)${NC}"
        continue
    }
    
    # Use jq to properly escape JSON
    escaped_value=$(echo "$value" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
    
    response=$(curl -s -X POST "$VERCEL_API/projects/$VERCEL_PROJECT_ID/env" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"key\": \"$key\",
            \"value\": $escaped_value,
            \"type\": \"encrypted\",
            \"target\": [\"production\", \"preview\", \"development\"]
        }")
    
    if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('id') else 1)" 2>/dev/null; then
        echo -e "${GREEN}  OK $key${NC}"
        count=$((count + 1))
    else
        echo -e "${RED}  FAIL $key: $response${NC}"
    fi
done < "$ENV_FILE"

echo ""
echo -e "${GREEN}Variables configuradas en Vercel: $count${NC}"
echo ""
echo -e "${YELLOW}NOTA: Las variables estaran activas en el proximo deploy.${NC}"
echo -e "${CYAN}Para deployar con las nuevas variables:${NC}"
echo -e "${CYAN}  npx vercel --prod --yes --token=$VERCEL_TOKEN${NC}"
