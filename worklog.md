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
