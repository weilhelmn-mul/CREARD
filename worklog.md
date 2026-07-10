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
- Deployed: https://creard.vercel.app/---
Task ID: 1
Agent: Main Agent
Task: Fix 12 bugs in Adelantos por Cancelaciones (Finanzas tab)

Work Log:
- Read and analyzed AdminDashboard.tsx, retained-advances/route.ts, bookings/route.ts, db.ts
- Identified 12 bugs across frontend and backend
- Fixed Bug #2 (CRITICAL): Balance now subtracts refunded advances from effective income
- Fixed Bug #9 (CRITICAL): Backend returns warning flags; frontend shows toast on retained_advance_failed
- Fixed Bug #1: "Neto retenido" now shows retainedTotal - refundedTotal with proper label
- Fixed Bug #5+#12: Delete action now sends bookingId and backend deletes associated payment record
- Fixed Bug #6: Payment sync query now uses .limit(1) to only affect most recent record
- Fixed Bug #7: Added confirm() dialog when changing advance status (retained/refunded)
- Fixed Bug #3: Client-side filter to current month when loading retained advances
- Fixed Bug #4: Added pagination (8 per page) with page controls to advances table
- Fixed Bug #8: userEmail fallback from user document when missing in booking
- Fixed Bug #10: Refactored cancellation block with proper indentation
- Fixed Bug #11: Added inline editing for amount and reason with save/cancel buttons
- Committed and pushed to Vercel

Stage Summary:
- 3 files changed, 318 insertions, 135 deletions
- Commit: 87954e5
- All 12 bugs fixed and deployed
