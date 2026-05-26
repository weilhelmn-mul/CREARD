---
Task ID: 1
Agent: Main
Task: Make entire home page editable when logged in as admin

Work Log:
- Explored full project structure: 6 home page components, admin dashboard, Firebase/Firestore stack
- Identified 4 hardcoded sections: HeroSection, SportsSection, PromoBanner, HowItWorks
- Created /api/settings API route (GET/PUT) with Firestore persistence and default fallback
- Created SiteSettingsContext with useSiteSettings hook and saveSection method
- Created SectionEditor.tsx with reusable SectionEditButton, EditModal, FormField, ArrayField components
- Modified HeroSection to use settings context + inline edit pencil button (admin only)
- Modified SportsSection to use settings context + inline edit
- Modified PromoBanner to use settings context + inline edit
- Modified HowItWorks to use settings context + inline edit
- Added "Contenido" tab (5th tab) in AdminDashboard with ContentTab component
- ContentTab provides: section cards overview, quick preview, and full editor modals per section
- Integrated SiteSettingsProvider in layout.tsx wrapping all children
- Build successful (next build) - all 12 pages compiled
- Committed with git

Stage Summary:
- All home page content is now editable by admin users
- Two edit modes: inline pencil buttons on each section + Admin Dashboard "Contenido" tab
- Settings persist to Firestore `site_settings/home` document
- Falls back to sensible defaults if Firestore not configured
- Files created: src/app/api/settings/route.ts, src/context/SiteSettingsContext.tsx, src/components/home/SectionEditor.tsx
- Files modified: HeroSection.tsx, SportsSection.tsx, PromoBanner.tsx, HowItWorks.tsx, AdminDashboard.tsx, layout.tsx
