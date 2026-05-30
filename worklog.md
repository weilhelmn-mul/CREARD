---
Task ID: 1
Agent: Main Agent
Task: Fix vóley courts - ensure both Vóley Cancha A and Vóley Cancha B appear in reservation flow, update Firebase

Work Log:
- Cloned CREARD repo from GitHub
- Investigated court data sources: data/courts.json, api/courts/route.ts, json-storage.ts, SearchView.tsx, FeaturedCourts.tsx, TodaysSchedule.tsx, ContentPanel.tsx, useContentStore.ts
- Identified root cause: cancha-6 was "Salón Eventos" with sport "eventos" instead of "Vóley Cancha B" with sport "voley"
- Updated 8 files: renamed cancha-5 to "Vóley Cancha A", changed cancha-6 from "Salón Eventos"/eventos to "Vóley Cancha B"/voley
- Removed "eventos" sport option from admin dropdown and sport label/icon mappings
- Created temporary seed endpoint /api/seed/fix-courts to update Firebase Firestore
- Deployed to Vercel, called seed endpoint, verified both courts updated in Firebase
- Removed seed endpoint for security, deployed final version
- Verified API returns both vóley courts correctly

Stage Summary:
- Firebase Firestore: cancha-5 = "Vóley Cancha A" (voley), cancha-6 = "Vóley Cancha B" (voley)
- All code fallbacks updated consistently across 8 files
- Deployed to https://creard.vercel.app - verified working
- 6 courts total: 4 fútbol + 2 vóley (A and B)
