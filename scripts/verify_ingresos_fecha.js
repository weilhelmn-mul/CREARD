/**
 * Verificación de deploy Vercel: busca el marcador "Ingresos por Fecha"
 * en los chunks JS de producción de creard.vercel.app.
 * Uso: node scripts/verify_ingresos_fecha.js
 */
const https = require('https')

const MARKERS = ['Ingresos por Fecha', 'Ingreso del periodo', 'Rango extenso: vista por mes']

function get(url, gzip = true) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': gzip ? 'gzip' : 'identity' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(new URL(res.headers.location, url).toString(), gzip))
      }
      const chunks = []
      const zlib = require('zlib')
      let stream = res
      if (res.headers['content-encoding'] === 'gzip') stream = res.pipe(zlib.createGunzip())
      else if (res.headers['content-encoding'] === 'br') stream = res.pipe(zlib.createBrotliDecompress())
      stream.on('data', (c) => chunks.push(c))
      stream.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout ' + url)) })
  })
}

async function main() {
  const base = 'https://creard.vercel.app'
  console.log('1) HomePage:', base)
  const home = await get(base + '/')
  console.log('   status:', home.status)
  const scripts = [...home.body.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1])
  console.log('   scripts encontrados:', scripts.length)

  const found = {}
  let checked = 0
  for (const s of scripts) {
    const url = s.startsWith('http') ? s : base + (s.startsWith('/') ? '' : '/') + s
    if (!/chunk|main|app|page|_app|framework|AdminDashboard|admin/i.test(url)) continue
    checked++
    try {
      const r = await get(url)
      for (const m of MARKERS) {
        if (r.body.includes(m)) { found[m] = found[m] || url }
      }
    } catch (e) { /* ignore */ }
  }
  console.log(`   chunks verificados: ${checked}`)
  let ok = true
  for (const m of MARKERS) {
    if (found[m]) console.log(`   ✓ "${m}" → ${found[m].split('/').pop()}`)
    else { console.log(`   ✗ "${m}" NO encontrado`); ok = false }
  }
  console.log(ok ? 'DEPLOY OK — marcadores presentes en producción' : 'AÚN NO DESPLEGADO (o build viejo en CDN)')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(2) })
