const BASE = 'https://creard.vercel.app';

async function check() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  
  console.log(`Today: ${today}, Tomorrow: ${tomorrow}\n`);

  // Get ALL courts to check all bookings today
  const courtsRes = await fetch(`${BASE}/api/courts`);
  const courts = await courtsRes.json();
  
  let totalToday = 0;
  let totalTomorrow = 0;
  
  for (const court of courts) {
    // Check today
    const todayRes = await fetch(`${BASE}/api/bookings?courtId=${court.id}&date=${today}`);
    if (todayRes.ok) {
      const bookings = await todayRes.json();
      if (Array.isArray(bookings) && bookings.length > 0) {
        totalToday += bookings.length;
        for (const b of bookings) {
          console.log(`[TODAY ${today}] ${b.startTime}-${b.endTime} court=${b.court?.name || court.name} user=${b.user?.name || b.userId?.substring(0,10) || '?'} status=${b.status} total=${b.totalPrice} advance=${b.advanceAmount} remaining=${b.remainingAmount} method=${b.paymentMethod || 'none'}`);
        }
      }
    }
    
    // Check tomorrow
    const tmrwRes = await fetch(`${BASE}/api/bookings?courtId=${court.id}&date=${tomorrow}`);
    if (tmrwRes.ok) {
      const bookings = await tmrwRes.json();
      if (Array.isArray(bookings) && bookings.length > 0) {
        totalTomorrow += bookings.length;
        for (const b of bookings) {
          console.log(`[TMRW  ${tomorrow}] ${b.startTime}-${b.endTime} court=${b.court?.name || court.name} user=${b.user?.name || b.userId?.substring(0,10) || '?'} status=${b.status} total=${b.totalPrice} advance=${b.advanceAmount} remaining=${b.remainingAmount} method=${b.paymentMethod || 'none'}`);
        }
      }
    }
  }
  
  console.log(`\n=== TOTAL: ${totalToday} today, ${totalTomorrow} tomorrow ===`);
  
  // Test the full /api/bookings without auth (should get 401)
  console.log('\n=== Auth test (no auth) ===');
  const fullRes = await fetch(`${BASE}/api/bookings`);
  console.log(`GET /api/bookings (no auth): ${fullRes.status}`);
  const errData = await fullRes.json().catch(() => null);
  console.log(JSON.stringify(errData));
}

check().catch(console.error);
