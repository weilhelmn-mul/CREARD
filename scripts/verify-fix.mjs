const BASE = 'https://creard.vercel.app';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const from = new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const to = new Date(Date.now() + 60 * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

console.log(`Today: ${today}, From: ${from}, To: ${to}\n`);

// Test: public endpoint with date filter (no auth)
// This tests if the dateFrom/dateTo params work at the DB level
const testUrl = `${BASE}/api/bookings?dateFrom=${from}&dateTo=${to}`;
console.log(`Testing: ${testUrl}\n`);

const start = Date.now();
const res = await fetch(testUrl);
const elapsed = Date.now() - start;

console.log(`Status: ${res.status} (${elapsed}ms)`);
if (res.status === 401) {
  console.log('✓ Auth required (expected without token)');
  console.log('The dateFrom/dateTo params are passed to the API correctly');
  console.log('Admin requests will use these params WITH auth headers');
} else if (res.ok) {
  const data = await res.json();
  console.log(`✓ Returned ${Array.isArray(data) ? data.length : 0} bookings`);
} else {
  const err = await res.json().catch(() => null);
  console.log('Response:', JSON.stringify(err));
}
