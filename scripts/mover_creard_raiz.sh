#!/bin/bash
# Reubica el repositorio CREARD clonado a la raíz de la plataforma (/home/z/my-project)
set -e
cd /home/z/my-project

echo "== 1. Respaldar .git de plataforma e instalar .git del repo del usuario =="
rm -rf .git-platform-backup
mv .git .git-platform-backup
mv CREARD/.git .git

echo "== 2. Mover node_modules del repo (evita reinstalar desde cero) =="
rm -rf node_modules
mv CREARD/node_modules node_modules

echo "== 3. Reemplazar directorios de app (los del repo mandan) =="
for d in src public prisma examples mini-services db data tool-results; do
  if [ -d "CREARD/$d" ]; then
    rm -rf "./$d"
    mv "CREARD/$d" "./$d"
    echo "  reemplazado: $d"
  fi
done

echo "== 4. Fusionar directorios compartidos (download, skills, .zscripts) =="
for d in download skills; do
  if [ -d "CREARD/$d" ]; then
    cp -a "CREARD/$d/." "./$d/"
    rm -rf "CREARD/$d"
    echo "  fusionado: $d"
  fi
done
# .zscripts: copiar scripts del repo pero conservar dev.pid actual
for f in CREARD/.zscripts/*; do
  base=$(basename "$f")
  [ "$base" = "dev.pid" ] && continue
  cp -a "$f" ".zscripts/$base"
done

echo "== 5. Mover archivos de nivel superior =="
shopt -s dotglob nullglob
for f in CREARD/*; do
  base=$(basename "$f")
  case "$base" in
    .git|node_modules|upload|.zscripts) continue ;;
  esac
  mv -f "$f" "./$base"
done
shopt -u dotglob

echo "== 6. Estado final =="
ls -A CREARD/ 2>/dev/null | head -5 || true
rmdir CREARD 2>/dev/null && echo "CARPETA CREARD eliminada (vacía)" || echo "CREARD aún tiene residuos"
echo "--- git status (primeras líneas) ---"
git status --short | head -10
git log --oneline -3
echo "OK"
