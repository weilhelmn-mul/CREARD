---
Task ID: 1
Agent: Main Agent
Task: Configure Firebase connection and persist data, set up Vercel env vars

Work Log:
- Read all project files to understand current state (firebase.ts, firebase-admin.ts, db.ts, API routes, components)
- Built the project successfully (Next.js 16, Turbopack)
- Deployed to Vercel production: https://creard.vercel.app
- Verified all APIs work: /api/courts (6 courts), /api/bookings (empty, demo mode)
- Created scripts/setup-firebase.sh - Automated Firebase project creation script
- Created scripts/seed-firestore.js - Firestore seed data script (branches, courts, news, gallery, bookings)
- Created scripts/configure-vercel-env.js - Vercel env var configuration script
- Created scripts/set-vercel-env.sh - Quick Vercel env setup via API
- Created .env.local with Firebase variable templates
- App works in demo mode with fallback data when Firebase is not configured

Stage Summary:
- App is live at https://creard.vercel.app and fully functional in demo mode
- Firebase connection is ready to be activated - all code uses lazy init Proxy pattern
- Created complete automation scripts for Firebase setup
- User needs to: (1) create Firebase project, (2) get service account key + web app config, (3) fill .env.local, (4) run set-vercel-env.sh, (5) redeploy
- Reservation flow works end-to-end in demo mode: FeaturedCourts > CourtDetail > BookingForm > POST /api/bookings
