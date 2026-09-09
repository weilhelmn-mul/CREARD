#!/usr/bin/env python3
"""Crea una reserva awaiting_payment para verificación visual del panel admin."""
import json, urllib.request
from datetime import date, timedelta
import sys
sys.path.insert(0, "/home/z/my-project/scripts")
from e2e_validacion_reservas import http, fb_login, BASE  # noqa

tok, uid = fb_login("carlos@email.com", "user123")
day = (date.today() + timedelta(days=21)).isoformat()
st, courts = http("GET", "/api/courts")
cid = courts[0]["id"]
st, bk = http("POST", "/api/bookings", token=tok, body={
    "courtIds": [cid], "userId": uid, "date": day,
    "startTime": "08:00", "endTime": "09:00",
    "totalPrice": 50, "advanceAmount": 25, "remainingAmount": 25,
    "paymentMethod": "Yape QR", "paymentType": "advance",
})
print(json.dumps({"status": st, "id": bk.get("id"), "booking_status": bk.get("status")}))
