#!/usr/bin/env python3
"""
E2E: Flujo Pago-validado -> confirmada en CREARD (local, Firebase creard-8debc REAL)

Verifica el requisito:
  1. Reserva de usuario nace 'awaiting_payment'  -> NO bloquea, NO confirmada
  2. Usuario marca "ya pagué"                    -> 'payment_pending' -> NO bloquea, NO confirmada
  3. Admin valida el pago (PATCH)                -> 'reserved' -> CONFIRMADA -> SÍ bloquea
  4. Dos reservas sin validar del mismo horario son posibles (no bloquean)
  5. Tras validar la primera, validar la segunda -> 409 conflicto
  6. El pago asociado nace 'pending' y se completa al validar
"""
import json
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import date, timedelta

BASE = "http://localhost:3000"


def _firebase_api_key() -> str:
    """Lee la API key web (pública) desde el entorno o .env.local — nunca hardcodeada."""
    import os
    import pathlib

    key = os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
    if key:
        return key
    env_file = pathlib.Path(__file__).resolve().parents[1] / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.strip().startswith("NEXT_PUBLIC_FIREBASE_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"\'')
    return ""


FIREBASE_API_KEY = _firebase_api_key()

PASS, FAIL = [], []


def check(name, cond, detail=""):
    if cond:
        PASS.append(name)
        print(f"  [OK]   {name}")
    else:
        FAIL.append(name)
        print(f"  [FAIL] {name}  {detail}")


def http(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("x-user-id", "test")  # ignored in prod, harmless in dev
    data = None
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def fb_login(email, password):
    """Firebase Auth REST: password sign-in -> (idToken, localId)"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
        return d["idToken"], d["localId"]


def main():
    booking_day = (date.today() + timedelta(days=21)).isoformat()
    start_t, end_t = "06:00", "07:00"  # franja temprana, improbable que esté ocupada

    print(f"=== E2E pago-validado → confirmada | fecha prueba: {booking_day} {start_t}-{end_t} ===\n")

    # 0) Tokens
    print("[0] Autenticación Firebase")
    user_tok, user_uid = fb_login("carlos@email.com", "user123")
    admin_tok, admin_uid = fb_login("admin@creard.com", "admin123")
    check("Login cliente (carlos@email.com)", bool(user_tok))
    check("Login admin (admin@creard.com)", bool(admin_tok))

    # cancha disponible
    st, courts = http("GET", "/api/courts")
    check("GET /api/courts", st == 200 and isinstance(courts, list) and len(courts) > 0)
    court = courts[0]
    cid = court["id"]
    uid = user_uid  # localId de Firebase Auth == user_id del perfil en Firestore

    # GET público antes
    st, before = http("GET", f"/api/bookings?courtId={cid}&date={booking_day}")
    check("GET público disponibilidad inicial", st == 200)

    # 1) Crear reserva como CLIENTE (Yape, adelanto 50%)
    print("\n[1] Cliente crea reserva (sin pagar aún)")
    st, bk = http("POST", "/api/bookings", token=user_tok, body={
        "courtIds": [cid], "userId": uid, "date": booking_day,
        "startTime": start_t, "endTime": end_t,
        "totalPrice": 50, "advanceAmount": 25, "remainingAmount": 25,
        "paymentMethod": "Yape QR", "paymentType": "advance",
        "status": "reserved",  # el cliente lo intenta, el server DEBE ignorarlo
    })
    check("POST /api/bookings crea la reserva", st == 201, f"{st} {bk}")
    booking_a = bk.get("id")
    check("status inicial = awaiting_payment (NO confirmada)", bk.get("status") == "awaiting_payment", f"got {bk.get('status')}")
    check("paymentId generado (pago pendiente)", bool(bk.get("paymentId")))

    # 2) GET público NO debe mostrarla (no bloquea)
    st, after = http("GET", f"/api/bookings?courtId={cid}&date={booking_day}")
    ids = [b.get("id") for b in after]
    check("Reserva awaiting NO aparece en disponibilidad pública", booking_a not in ids)

    # 2b) Otra reserva del MISMO horario debe PERMITIRSE (no bloquea)
    st, bk2 = http("POST", "/api/bookings", token=user_tok, body={
        "courtIds": [cid], "userId": uid, "date": booking_day,
        "startTime": start_t, "endTime": end_t,
        "totalPrice": 50, "advanceAmount": 25, "remainingAmount": 25,
        "paymentMethod": "Yape QR", "paymentType": "advance",
    })
    booking_b = bk2.get("id") if st == 201 else None
    check("Segunda reserva del mismo horario PERMITIDA (awaiting no bloquea)", st == 201, f"{st} {bk2}")

    # 3) Cliente marca "ya pagué" sobre la reserva A
    print("\n[3] Cliente declara pago (ya pagué)")
    st, pv = http("POST", "/api/payment-validation", token=user_tok, body={
        "bookingIds": [booking_a], "paymentType": "advance", "transactionId": "TEST-123456",
    })
    check("POST /api/payment-validation (ya pagué)", st == 200, f"{st} {pv}")

    st, after2 = http("GET", f"/api/bookings?courtId={cid}&date={booking_day}")
    ids2 = [b.get("id") for b in after2]
    check("Reserva payment_pending TAMBIÉN no aparece en disponibilidad pública", booking_a not in ids2)

    # 4) Admin la ve en la lista completa (GET autenticado) como payment_pending
    st, admin_list = http("GET", f"/api/bookings?dateFrom={booking_day}&dateTo={booking_day}", token=admin_tok)
    blist = admin_list if isinstance(admin_list, list) else admin_list.get("bookings", [])
    a_in_admin = next((b for b in blist if b.get("id") == booking_a), None)
    check("Admin SÍ ve la reserva (lista completa)", a_in_admin is not None)
    check("Vista admin: status payment_pending (NO confirmada)", a_in_admin and a_in_admin.get("status") == "payment_pending", f"got {a_in_admin and a_in_admin.get('status')}")

    # 5) Admin valida el pago -> CONFIRMADA
    print("\n[5] Admin valida el pago")
    st, val = http("PATCH", "/api/payment-validation", token=admin_tok, body={
        "bookingId": booking_a, "action": "validate", "observation": "Pago verificado en Yape (E2E)",
    })
    check("PATCH validate → confirmada", st == 200, f"{st} {val}")

    st, after3 = http("GET", f"/api/bookings?courtId={cid}&date={booking_day}")
    ids3 = [b.get("id") for b in after3]
    check("Reserva CONFIRMADA SÍ aparece en disponibilidad pública (bloquea)", booking_a in ids3)

    # 6) Intentar reservar el mismo horario ahora -> 409
    st, bk3 = http("POST", "/api/bookings", token=user_tok, body={
        "courtIds": [cid], "userId": uid, "date": booking_day,
        "startTime": start_t, "endTime": end_t,
        "totalPrice": 50, "advanceAmount": 25, "remainingAmount": 25,
        "paymentMethod": "Yape QR",
    })
    check("Nuevo POST mismo horario → 409 (ya bloqueado)", st == 409, f"{st} {bk3}")

    # 7) Validar la reserva B (segunda del mismo horario) -> 409 conflicto
    if booking_b:
        st, pvb = http("POST", "/api/payment-validation", token=user_tok, body={
            "bookingIds": [booking_b], "paymentType": "advance", "transactionId": "TEST-B-002",
        })
        st, valb = http("PATCH", "/api/payment-validation", token=admin_tok, body={
            "bookingId": booking_b, "action": "validate",
        })
        check("Validar reserva B (horario ya confirmado por A) → 409", st == 409, f"{st} {valb}")

    # 8) Verificar en Firestore el estado final de A (status reserved, sin expires_at) y pago completed
    print("\n[8] Estado en Firestore (verificación directa)")
    out = subprocess.run(
        ["bun", "-e", f"""
import {{ getAdminDb }} from './src/lib/firebase-admin';
const db = getAdminDb();
const b = await db.collection('bookings').doc('{booking_a}').get();
const d = b.data() || {{}};
console.log(JSON.stringify({{ status: d.status, slot_status: d.slot_status, has_expires: !!d.expires_at }}));
const pays = await db.collection('payments').where('booking_id', '==', '{booking_a}').limit(3).get();
const pay = pays.docs[0]?.data() || {{}};
console.log(JSON.stringify({{ pay_status: pay.status, pay_payment_status: pay.payment_status }}));
const vals = await db.collection('payment_validations').where('booking_id', '==', '{booking_a}').limit(3).get();
console.log(JSON.stringify({{ validations: vals.size }}));
"""],
        capture_output=True, text=True, cwd="/home/z/my-project")
    lines = [l for l in out.stdout.strip().splitlines() if l.startswith("{")]
    if len(lines) >= 2:
        fs_booking, fs_pay = json.loads(lines[0]), json.loads(lines[1])
        fs_vals = json.loads(lines[2]) if len(lines) > 2 else {}
        check("Firestore: booking status=reserved", fs_booking.get("status") == "reserved", str(fs_booking))
        check("Firestore: expires_at eliminado (no expira)", fs_booking.get("has_expires") is False, str(fs_booking))
        check("Firestore: pago top-level completed (validado)", fs_pay.get("pay_status") == "completed", str(fs_pay))
        check("Firestore: registro de validación creado", fs_vals.get("validations", 0) >= 1, str(fs_vals))
    else:
        check("Verificación Firestore ejecutada", False, out.stderr[-300:])

    # Resumen
    print(f"\n=== RESULTADO: {len(PASS)} OK, {len(FAIL)} FAIL ===")
    if FAIL:
        print("Fallidos:", FAIL)
        sys.exit(1)
    print("BOOKINGS_A=" + booking_a)
    print("BOOKINGS_B=" + (booking_b or ""))
    print("COURT=" + cid)
    print("DAY=" + booking_day)


if __name__ == "__main__":
    main()
