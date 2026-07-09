---
Task ID: 1
Agent: Super Z (main)
Task: Redesign court booking time slot selection with futuristic grid-based picker

Work Log:
- Analyzed existing TimeSlotPicker.tsx (horizontal scrollable timeline with 35 tiny buttons)
- Analyzed AdminDashboard.tsx for dead code (startTimeDrop, endTimeDrop, allTimeSlots, editEndSlots)
- Analyzed API routes (bookings/route.ts, bookings/recurring/route.ts) and db.ts
- Designed new responsive grid-based TimeSlotPicker organized by time periods (MAÑANA, TARDE, NOCHE)
- Implemented grid layout: 3 cols mobile, 4 cols sm, 6 cols md+ with futuristic styling
- Added neon glow effects, scanline animation, gradient backgrounds, pulsing start/end markers
- Added duration display (e.g. "2h 30min") and block count in selection info bar
- Cleaned up dead code: removed startTimeDrop, endTimeDrop state variables, allTimeSlots, editEndSlots
- Added computeSelectedSlots() helper to generate individual 30-min slot strings
- Added selectedSlots to booking creation payload (single + recurring)
- Updated createBooking in db.ts to store selected_slots array in Firestore
- Updated bookings/route.ts and bookings/recurring/route.ts to pass selected_slots
- Added tsp-scan and tsp-pulse CSS keyframes to globals.css
- Built successfully, deployed to Vercel via git push

Stage Summary:
- New TimeSlotPicker: responsive grid (3→4→6 columns), period-grouped, neon-styled
- DB change: new `selected_slots` (string[]) field on all new bookings
- Files modified: TimeSlotPicker.tsx, AdminDashboard.tsx, globals.css, db.ts, bookings/route.ts, recurring/route.ts
- Deployed: https://creard.vercel.app/