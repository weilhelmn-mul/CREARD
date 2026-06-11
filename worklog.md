---
Task ID: 1
Agent: Main Agent
Task: Home Page CMS - Image Upload & Content Management Enhancement

Work Log:
- Created `/api/upload/route.ts` — Image upload endpoint using base64 data URLs with sharp image processing (resize, compress, convert to JPEG/WebP)
- Fixed `handleUploadImage` in AdminDashboard.tsx — Removed auth headers that conflicted with FormData multipart boundary
- Added `uploadFile` helper for image uploads outside editForm context (promotions, banners, custom sections)
- Enhanced ImageUploader component with proper `uploadId` prop for tracking upload state
- Enhanced CMS Preview Modal — Replaced basic text-only preview with mobile-frame visual preview showing:
  - Hero section with background image, stats, badges
  - Sports section with images, pricing details, amenities
  - Featured courts grid
  - Promo banner with selling points and payment methods
  - How it works steps
  - Custom sections (banner, notice, highlight, cta, gallery) with visual rendering
  - Active promotions carousel
  - Hero banners carousel
  - Bottom navigation bar hint
- Added pricing details editor in sportsSection modal (add/edit/delete pricing tiers per sport)
- Added gallery items management for custom gallery sections (add/remove images with upload, titles)
- Fixed upload IDs for promo, banner, and custom section image uploaders
- Deployed to Vercel production successfully

Stage Summary:
- Created file: `/src/app/api/upload/route.ts`
- Modified file: `/src/components/admin/AdminDashboard.tsx`
- All CMS features now functional:
  - ✅ Edit texts, titles, subtitles, descriptions
  - ✅ Modify prices, promotions, tariffs
  - ✅ Upload photos from device (now working!)
  - ✅ Add, replace, update, delete images
  - ✅ Create/delete content sections
  - ✅ Update services, schedules, news, announcements
  - ✅ Change display order (drag & drop)
  - ✅ Visual preview before publishing
  - ✅ Save and publish immediately
- Deployed: https://my-project-kappa-lake.vercel.app
---
Task ID: 1
Agent: Main Agent
Task: CMS integral de página de inicio - mejoras y deploy

Work Log:
- Analizado código actual del CMS (ContentTab en AdminDashboard.tsx, SiteSettingsContext, API settings)
- Agregado tipo `FeaturedCourtsSettings` con campos badge, title, subtitle, ctaText
- Agregado tipo `NewsItem` con campos id, title, content, image, link, active, createdAt, pinned
- Actualizado `SiteSettings` interface con `featuredCourts` y `news: NewsItem[]`
- Actualizado defaults en `/api/settings/route.ts` con featuredCourts y news vacíos
- Agregado backward compat migration para featuredCourts y news en GET handler
- Agregado sub-tab "Noticias" en el CMS con CRUD completo (crear, editar, eliminar, activar/desactivar, fijar)
- Agregado editor de sección "Canchas Destacadas" con badge, título, subtítulo, texto CTA
- Actualizado preview modal para mostrar noticias y featuredCourts con datos CMS
- Creado componente `NewsSection.tsx` que renderiza noticias activas en la página de inicio
- Actualizado `FeaturedCourts.tsx` para usar textos del CMS (title, subtitle, ctaText, badge)
- Agregado `NewsSection` al `page.tsx` de la página de inicio
- Deploy exitoso a Vercel: https://my-project-kappa-lake.vercel.app

Stage Summary:
- CMS ahora tiene 4 sub-tabs: Secciones, Promociones, Banners Hero, Noticias
- Sección "Canchas Destacadas" ahora es completamente editable desde el CMS
- Noticias/Anuncios: CRUD con soporte para fijar (pinned), activar, imagen, enlace
- Todas las secciones del home ahora son administrables desde una sola interfaz
- Deploy completado exitosamente en Vercel


---
Task ID: 1
Agent: Main Agent
Task: Revisar y corregir módulo de reservas - eliminar restricciones de tiempo para admin

Work Log:
- Analizó todos los archivos de reservas: bookings/route.ts, recurring/route.ts, CourtDetail.tsx, AdminDashboard.tsx, auth-middleware.ts
- Identificó 6 puntos de bloqueo donde el admin tenía restricciones de tiempo
- Corrigió API de reservas individuales: eliminada toda validación de tiempo para admin (antes tenía 5 min)
- Corrigió API de reservas recurrentes: eliminada validación de 5 min (endpoint solo admin)
- Corrigió CourtDetail.tsx: isAdmin ahora incluye super_admin, slots pasados ya no se marcan como 'past' para admin
- Corrigió AdminDashboard.tsx: eliminadas restricciones en dropdowns de hora inicio/fin, eliminado label "mín. 30 min"
- Verificó obtención de rol desde Firebase: usa colección 'users' consistentemente
- Verificó validación de duplicados: ya existente y funcional en ambas rutas API
- Build exitoso, deploy a Vercel completado

Stage Summary:
- Admin puede ahora reservar CUALQUIER horario del día actual, incluyendo slots en curso o pasados (walk-in)
- Usuarios normales mantienen restricción de 30 minutos de anticipación
- Validación de duplicados por cancha/fecha/horario funciona para todos los roles
- Deploy exitoso en: https://creard.vercel.app
---
Task ID: 1
Agent: Main Agent
Task: Analyze and fix multi-court booking system bugs

Work Log:
- Analyzed 31 source files across the booking system (API routes, components, DB layer, store)
- Identified 9 bugs (3 critical, 3 high, 3 medium) related to multi-court booking handling
- Fixed db.ts: getBookings() now runs dual Firestore queries (court_id == X AND court_ids array-contains X) with deduplication
- Fixed AdminDashboard.tsx: schedule view, court filter, search, and price calculation all handle courtIds array
- Fixed stats/route.ts: bookings by sport and top courts now iterate ALL court_ids per booking
- Fixed recurring/route.ts: accepts courtIds array, validates conflicts for ALL courts, creates bookings with court_ids
- Added courts field to Booking interface for multi-court search
- Built and deployed successfully to Vercel

Stage Summary:
- 4 files modified: db.ts, AdminDashboard.tsx, stats/route.ts, recurring/route.ts
- Commit: 1d6a869 pushed to main
- Deploy: dpl_FbMxrsoHieRFjna5VKMsDVP9x6Qb — READY
- URL: https://creard.vercel.app


---
Task ID: 1
Agent: main
Task: Fix Users management tab showing no users

Work Log:
- Read and analyzed UsersTab.tsx, /api/admin/users/route.ts, db.ts, auth-middleware.ts, firebase-admin.ts, firebase-check.ts, json-storage.ts, and auth/route.ts
- Root cause: GET handler only queried Firestore `users` collection. Users registered via Firebase Auth without a Firestore profile document were invisible. Also, all adminAuth calls in PUT/DELETE had no error handling.
- Rewrote /api/admin/users/route.ts:
  - GET: Uses adminAuth.listUsers() as primary source (all Firebase Auth users), merged with Firestore docs for role/status enrichment
  - GET: Users in Auth without Firestore profile auto-display with default values
  - GET: Demo/JSON fallback when Firebase not configured (matches auth route pattern)
  - PUT: All adminAuth calls wrapped in try/catch
  - PUT: Auto-creates Firestore profile if missing when admin acts on user
  - PUT: Demo mode uses jsonUpdateUser for all actions
  - DELETE: Demo mode removes from JSON storage; Firebase mode best-effort deletes from Auth + Firestore
- Committed and deployed to Vercel (dpl_6AnfWGjDLJF9V6CKiiWa1Bz6qbDA, state: READY)

Stage Summary:
- Fixed: Users tab now shows ALL Firebase Auth users (not just those with Firestore docs)
- Fixed: Demo mode fallback for all operations
- Fixed: Admin actions no longer crash if user doesn't exist in Firebase Auth
- Deployed to https://creard.vercel.app
