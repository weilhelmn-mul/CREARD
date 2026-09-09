# Worklog

---
Task ID: 1
Agent: Super Z (main agent)
Task: Clonar repositorio https://github.com/weilhelmn-mul/CREARD y configurar su base de datos Firebase (creard-8debc)

Work Log:
- Clonado el repo en /home/z/my-project/CREARD (133 MB, Next.js 16 + TypeScript + Firebase)
- Creado .env.local con credenciales Firebase Client SDK proporcionadas por el usuario (proyecto creard-8debc)
- Detectado que el proyecto fue desarrollado en esta misma plataforma (espera estar en /home/z/my-project raíz)
- Ejecutado init-fullstack.sh; reubicado el repo del usuario a la raíz con scripts/mover_creard_raiz.sh:
  - .git del repo del usuario ahora en raíz (respaldo de plataforma en .git-platform-backup/)
  - Resuelto conflicto del directorio scripts/ (quedó anidado, corregido)
  - upload/ restaurado desde git (imágenes trackeadas)
- bun install: 1061+ paquetes OK, sin cambios pendientes
- Resuelto conflicto EADDRINUSE (proceso huérfano de plantilla retenía puerto 3000); reiniciado servidor gestionado vía .zscripts/dev.sh
- Verificación con agent-browser:
  - Home renderiza (tema verde CREARD, canchas, precios S/., date picker)
  - GET /api/courts devuelve datos reales (fallback JSON data/*.json activo)
  - Login admin@creard.com: OK — consola confirma "[CREARD] Firebase Client inicializado correctamente"
  - Firebase Auth client devolvió auth/invalid-credential → app usó fallback server-only auth correctamente
  - Responsive móvil verificado (menú admin, navegación inferior)
- Screenshots en download/: creard_home_admin.png, creard_mobile.png

Stage Summary:
- App CREARD corriendo en puerto 3000 con código del repo del usuario y .env.local configurado
- Firebase Client SDK (navegador): CONFIGURADO Y FUNCIONANDO
- Firebase Admin SDK (servidor/Firestore): PENDIENTE — requiere clave privada de cuenta de servicio
  (Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada)
  Sin ella, la app usa fallback JSON (datos de data/*.json) y auth server-only
- Repo git intacto en raíz con historial original (remoto: github.com/weilhelmn-mul/CREARD)

---
Task ID: 2
Agent: Super Z (main agent)
Task: Configurar Firebase Admin SDK con la clave de cuenta de servicio proporcionada por el usuario y poblar usuarios de prueba

Work Log:
- Usuario entregó JSON de service account (firebase-adminsdk-fbsvc@creard-8debc.iam.gserviceaccount.com)
- Configuradas variables FIREBASE_SERVICE_ACCOUNT_* en .env.local (clave PEM con \n literales; el código hace replace a saltos reales)
- Nota: el filtro de seguridad redactaba el encabezado PEM en la VISTA del editor pero el archivo quedó intacto; validado con grep
- Reiniciado servidor dev (dev.sh); log confirma "[CREARD] Firebase Admin inicializado correctamente"
- Inspección de Firestore: users=67, courts=12, branches=1, bookings=143, expenses=1, settings=0 (base con datos reales de producción previa)
- Login API fallaba: admin@creard.com NO existía en Firebase Auth
- Creado scripts/seed_usuarios_firebase.ts (carga .env.local, nunca hardcodea secretos)
- Seed ejecutado: admin@creard.com (admin123, role=admin) y carlos@email.com (user123, role=user) creados en Firebase Auth + perfiles Firestore + custom claims
- Verificación API: login de ambas cuentas OK (status approved)
- Verificación E2E browser: "Firebase Client auth succeeded", insignia ADMIN visible, Panel Admin renderiza reservas reales de Firestore (Weilhelm, Cancha Fútbol 1, Yape QR, S/ 50.00)
- Añadido ADMIN_EMAIL=admin@creard.com pendiente en .env.local (auto-promoción a super_admin del route)
- Screenshots: download/creard_panel_admin_firestore.png, download/creard_panel_admin_2.png

Stage Summary:
- Firebase 100% operativo: Client SDK (browser) + Admin SDK (servidor) contra proyecto creard-8debc
- App lee/escribe datos REALES de Firestore (12 canchas, 143 reservas, 67 usuarios)
- Cuentas de prueba funcionando: admin@creard.com/admin123 (admin), carlos@email.com/user123 (cliente)
- Script reutilizable: scripts/seed_usuarios_firebase.ts (idempotente, actualiza si existen)
- RECOMENDACIÓN pendiente al usuario: rotar la clave privada (fue compartida por chat) y considerar reglas de Firestore

---
Task ID: 4
Agent: Super Z (main agent)
Task: Deploy de CREARD en Vercel (proyecto weilhelmns-projects/creard → https://creard.vercel.app/)

Work Log:
- Autenticado con Vercel CLI v59.14.0 usando el token proporcionado (scope limitado: /v2/user 404 pero API de proyectos OK)
- Proyecto existente localizado: creard (prj_KwcbWj34S39BsJOfU60TPtgAKwQ1, framework nextjs, dominio creard.vercel.app verified)
- Analizados 19 env vars existentes en Vercel: todas las NEXT_PUBLIC_FIREBASE_* y FIREBASE_SERVICE_ACCOUNT_* ya apuntan al proyecto creard-8debc del usuario (+ CULQI pagos, SETUP_SECRET)
- Detectado: producción actual (dpl del 2026-09-05, commit 6fa3d66b "feat: add split payment support") NO proviene de GitHub (origin/main=cc473770 del 01-09) sino de deploy CLI desde otra máquina del usuario con commits nunca pusheados
- Decisión clave: NO desplegar la copia local (cc473770+artefactos) para no REVERTIR la producción a código más antiguo sin split payments
- Env var añadida: ADMIN_EMAIL=admin@creard.com (production/preview/development)
- SMTP_* confirmado opcional (solo /api/claims, con defaults); ADMIN_PASSWORD solo requerido por /api/setup/create-admin (queda protegido sin configurarse)
- Verificación API producción: GET /api/courts devuelve datos reales de Firestore (Cancha Fútbol 1, CREARD San Sebastián, Cusco)
- Verificación API login producción: POST /api/auth?action=login con admin@creard.com/admin123 → OK (role=admin, status=approved, perfil Firestore "Administrador CREARD")
- Verificación E2E visual (agent-browser): home renderiza con precios S/., login OK con insignia ADMIN, Panel Admin muestra reserva real (Weilhelmn, Cancha Fútbol 1, 9 Sep 9PM, S/ 50.00, Yape QR, monitoreo 15s Lima)
- Screenshots: download/creard_prod_home.png, creard_prod_login_ok.png, creard_prod_panel.png, creard_prod_panel_full.png
- Token de Vercel eliminado de disco por seguridad tras finalizar

Stage Summary:
- https://creard.vercel.app/ ya está en producción (READY), conectado al Firebase creard-8debc del usuario, con login admin verificado E2E contra Firestore real
- No se ejecutó un nuevo deploy de código a propósito: la producción ya corre un commit (6fa3d66b) MÁS NUEVO que GitHub/local; desplegar local habría revertido split payments
- Pendiente para el usuario: si quiere deploy vía Git continuo, pushear sus commits locales del 05-09 (628690f4, f094bf29, 6fa3d66b) a GitHub; alternativamente puedo desplegar por CLI si confirma que quiere el estado local
- Recomendación reiterada: rotar la clave privada de la service account (compartida por chat) y el token de Vercel (también compartido por chat)

---
Task ID: 5
Agent: Super Z (main agent)
Task: Implementar y verificar el flujo "pago validado → reserva confirmada" en CREARD (panel admin + disponibilidad)

Work Log:
- Exploración completa (subagente Explore): bookings API (1184 líneas), payment-validation, payments/process (Culqi), webhooks/culqi, AdminDashboard (6884 líneas), BookingsTable, UnifiedBookingView, CourtDetail, BookingsView, auth-middleware
- Hallazgo previo: las reservas nacían 'reserved' (confirmadas y bloqueando) sin pago ni validación; se creaba un pago auto-'completed' falso al reservar
- NUEVO MODELO implementado:
  * awaiting_payment (Esperando Pago): reserva de usuario recién creada — NO bloquea, NO confirmada
  * payment_pending (Pago Pendiente): usuario declaró pago ("Ya pagué" Yape / cobro Culqi) — NO bloquea, NO confirmada; aparece en pestaña Pagos
  * reserved (Reservado): CONFIRMADA solo tras validación de admin/superadmin — SÍ bloquea
  * completed/cancelled sin cambios; reservas creadas por admin nacen confirmadas (confianza)
- Backend (src/app/api/bookings/route.ts): migrateStatus+isBlockingStatus+expiryToMs helpers; status inicial por rol (admin→reserved, user→awaiting_payment, ignora status del cliente); transacción POST solo bloquea confirmadas; GET público (courtId+date) devuelve solo bloqueantes + nueva rama date-only con payload mínimo (mapa de disponibilidad sin auth); lazy-expire TTL 15min aplica a reserved/awaiting_payment y expira pagos pendientes; PUT con re-chequeo de conflicto al confirmar manualmente + limpia expires_at (FieldValue.delete)
- Backend (payment-validation): POST "ya pagué" elimina expires_at (no expira esperando validación); PATCH validate re-chequea conflicto contra reservas confirmadas → 409 si choque; validate confirma (reserved) y limpia TTL
- Backend (Culqi): payments/process y webhook aceptan awaiting_payment/payment_pending; tras cobro del adelanto NO auto-confirman → payment_pending (espera admin)
- Backend (payments manual): admin → reserved; user → payment_pending; restante completo → completed (antes legacy fully_paid)
- Frontend: AdminDashboard statusConfig + pestañas (Esperando Pago/Pago Pendiente/Reservado/Completo/Cancelado) + fix conteo "Todos (N)"; BookingsTable badges + select de estados; UnifiedBookingView occupiedMap solo bloqueantes + server decide status; CourtDetail getBookedSlotHours solo confirmadas; BookingsView "Esperando pago"/"Pago en validación"; db.ts BookingStatus + expires_at
- Fix colateral: bug latente exp.toMillis?.()?.() (double optional-call) que rompía lazy-expire y disponibilidad pública
- Verificación E2E API (scripts/e2e_validacion_reservas.py, 21/21 OK contra Firebase creard-8debc REAL): awaiting no bloquea; 2ª reserva mismo horario permitida; ya pagué→payment_pending no bloquea; admin la ve como pendiente; validate→reserved bloquea; POST posterior→409; validar la 2ª→409 conflicto; Firestore: status reserved, expires_at eliminado, pago completed, payment_validations creado
- Verificación visual (agent-browser): pestañas Todos(3)/Esperando Pago(1)/Pago Pendiente(1)/Reservado(1); pestaña Pagos lista solo payment_pending (awaiting NO); Validar con conflicto muestra mensaje 409 claro; Rechazar libera; disponibilidad pública refleja solo confirmadas
- Limpieza: 3 reservas de prueba eliminadas (DELETE super_admin); la solicitud REAL de Weilhelmn (2 Sep) no fue tocada
- Errores TS: corregidos los introducidos (expires_at en Booking, tipo BookingStatus); los pre-existentes del repo se mantienen (next.config tiene ignoreBuildErrors:true — el build de Vercel pasa)

Stage Summary:
- Requisito cumplido: una reserva solo aparece como CONFIRMADA en el panel y bloquea horario cuando el pago fue realizado Y validado por admin/superadmin
- Cambios en 11 archivos (4 API routes modificadas a fondo + 5 componentes + db.ts + scripts E2E)
- NOTA DESPLIEGUE: estos cambios están SOLO en local (cc473770 + commits plataforma). Producción (creard.vercel.app) corre 6fa3d66b más nuevo — desplegar local lo revertiría; requerirá decisión del usuario (push a GitHub o deploy CLI consciente)

---
Task ID: 6
Agent: Super Z (main agent)
Task: Push a GitHub (token nuevo) + deploy a Vercel con la Tarea 5 incluida

Work Log:
- Intento de recuperar "split payments" (6fa3d66b) desde Vercel: el deployment solo contiene output compilado; el fuente existe SOLO en la otra máquina del usuario. No recuperable por API.
- Escaneo de secretos pre-push: .env trackeado solo tiene DATABASE_URL local; sin private keys; única API key web (pública por diseño) en e2e_validacion_reservas.py -> limpiada (lee .env.local).
- Historial limpio: git reset --soft cc47377 + squash de 4 commits de plataforma en 1 commit "feat(bookings): require completed payment + admin validation before confirmation" (8259f20).
- Dejaron de trackearse artefactos internos (.zscripts/, tool-results/, .git-platform-backup/, screenshots download/*.png, tests/*.sh) + .gitignore actualizado; docs de download/ (PDFs/SQL) se mantienen.
- Push a GitHub: cc47377..8259f20 main->main (token usado one-shot, remote URL limpio). Vercel auto-deploy disparado por la integración GitHub (productionBranch=main).
- Deploy dpl_7kPenkzY86owyGfM91FS3LSUTCWW READY en ~1.5 min (commit 8259f205).
- E2E PRODUCCIÓN 21/21 OK (scripts/e2e_validacion_reservas.py, ahora admite E2E_BASE_URL): awaiting_payment no bloquea; segunda reserva mismo horario permitida; ya pagué->payment_pending no bloquea; admin la ve; validate->reserved bloquea; 409 posteriores; Firestore: reserved + expires_at eliminado + pago completed + payment_validations creado.
- Limpieza: reservas de prueba V5DHhBuUx3phZROar9o4 y bf3KpSgdiR0hFU7rLftG eliminadas via DELETE super_admin (horario 2026-09-30 06:00 liberado).
- Verificación visual producción: login super_admin OK; Panel Admin muestra pestañas Todos(142)/Pago Pendiente(1)/Reservado(62)/Completo(63)/Cancelado(16); pestaña Pago Pendiente lista reserva REAL de Weilhelmn (Cancha Fútbol 1, 2 Sep, S/17.50) NO confirmada esperando validación.
- Screenshots: download/creard_prod_tab_pago_pendiente.png, download/creard_prod_tabs_estados.png

Stage Summary:
- GitHub (weilhelmn-mul/CREARD) y producción (creard.vercel.app) sincronizados en 8259f20 con el flujo "pago validado -> reserva confirmada" operativo y verificado E2E en producción.
- IMPORTANTE: los commits 628690f4, f094bf29, 6fa3d66b (split payment cash+Yape/Plin) siguen SOLO en la otra máquina del usuario. Al hacer pull en esa máquina habrá conflictos en las rutas de pagos (Tarea 5 reescribió el flujo): rebase/cherry-pick con resolución consciente; el nuevo modelo (payment_pending -> validación admin) manda.
