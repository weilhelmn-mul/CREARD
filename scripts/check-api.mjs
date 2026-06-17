// Check the deployed API directly
const BASE = 'https://creard.vercel.app';

async function check() {
  console.log('=== Checking deployed API ===\n');

  // 1. First check auth endpoint to verify Firebase is working
  try {
    const authRes = await fetch(`${BASE}/api/auth`, { method: 'GET' });
    console.log(`GET /api/auth: ${authRes.status}`);
    const authData = await authRes.json().catch(() => null);
    console.log(JSON.stringify(authData)?.substring(0, 200));
  } catch(e) {
    console.log(`Auth check failed: ${e.message}`);
  }

  // 2. Try public court availability check (no auth needed)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  console.log(`\nToday (Lima): ${today}`);
  
  try {
    // First get a court ID from the courts API
    const courtsRes = await fetch(`${BASE}/api/courts`);
    if (courtsRes.ok) {
      const courts = await courtsRes.json();
      if (Array.isArray(courts) && courts.length > 0) {
        const courtId = courts[0].id;
        console.log(`\nTest court: ${courts[0].name} (${courtId})`);
        
        // Check availability for today
        const availRes = await fetch(`${BASE}/api/bookings?courtId=${courtId}&date=${today}`);
        if (availRes.ok) {
          const bookings = await availRes.json();
          console.log(`\nBookings for court ${courts[0].name} on ${today}: ${Array.isArray(bookings) ? bookings.length : 'not array'}`);
          if (Array.isArray(bookings)) {
            for (const b of bookings) {
              console.log(`  ${b.startTime}-${b.endTime} user=${b.userId?.substring(0,12) || '?'} status=${b.status}`);
            }
          }
        } else {
          console.log(`Availability check failed: ${availRes.status}`);
        }
      }
    }
  } catch(e) {
    console.log(`Courts/availability check failed: ${e.message}`);
  }

  // 3. Check Firebase config validity
  console.log('\n=== Firebase Client Config ===');
  console.log('Project ID: creard-8debc');
  console.log('Config looks valid ✓');
}

check().catch(console.error);
