---
Task ID: 1
Agent: main-agent
Task: CMS completo para página de Inicio

Work Log:
- Read and analyzed existing project structure (page.tsx, all home components, AdminDashboard, SiteSettingsContext, API route)
- Extended SiteSettings schema with customSections, sectionOrder, sectionVisibility, activePromotions, heroBanners
- Updated API settings route with new defaults and backward-compatible patching for existing Firestore docs
- Updated SiteSettingsContext with new types (CustomSection, ActivePromotion, HeroBanner, SectionVisibility) and methods (saveFullSettings, toggleSectionVisibility, reorderSections, saveCustomSection, removeCustomSection)
- Created CustomSections.tsx with 5 section types: banner, notice, highlight, cta, gallery
- Replaced ContentTab with comprehensive CMS featuring:
  - 3 sub-tabs: Secciones, Promociones, Banners Hero
  - Drag-and-drop section reorder using @dnd-kit/sortable
  - Visibility toggle per section (eye icon)
  - Custom section CRUD (type selector, title, subtitle, image, link, CTA)
  - Promotions CRUD (title, description, discount, dates, image, active toggle)
  - Hero banner carousel management (add/remove/toggle/edit)
  - Preview modal showing full home page section layout
- Updated HomeView to render sections dynamically based on sectionOrder, skipping hidden sections
- Updated HeroSection with auto-rotating banner carousel (5s interval, dots navigation)
- Deployed to Vercel (commit 89d13d9 pushed to main)

Stage Summary:
- Comprehensive CMS system implemented for admin
- Admin can now: add/remove/reorder sections via drag-and-drop, manage promotions with validity dates, manage hero banner carousel, preview entire home page layout, toggle section visibility
- All changes persisted to Firestore via existing PUT /api/settings endpoint
- Backward compatible — if Firestore doc has no new fields, defaults are used
- Home page renders dynamically based on admin-configured section order
---
Task ID: 3
Agent: main-agent
Task: Reservas recurrentes de canchas

Work Log:
- Created POST /api/bookings/recurring endpoint with dryRun preview and batch creation
- Created PUT /api/bookings/recurring endpoint for series/single cancellation
- Added recurring_group_id and recurring_index to Booking schema in db.ts
- Extended toCamelBooking in bookings/route.ts to include recurring fields
- Added recurring toggle to admin booking form with frequency selector (daily/weekly/biweekly/custom)
- Added day-of-week picker for custom frequency
- Added end condition (by date or by count) with preview
- Added preview table showing all dates with conflict detection
- Added series management modal (view all, cancel series, cancel single)
- Added recurring badge (repeat icon) to bookings in table, gallery, and compact views
- Deployed to Vercel

Stage Summary:
- Recurring bookings fully functional: create, preview conflicts, batch create, manage series
- Admin can create daily/weekly/biweekly/custom recurring bookings
- Conflict detection prevents double-booking
- Series management allows cancelling entire series or individual dates
- Commit: b13d9c5
