"""MediBook backend API tests - auth, practitioners, appointments."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://practitioner-finder.preview.emergentagent.com').rstrip('/')
if not BASE_URL.startswith('http'):
    BASE_URL = 'https://practitioner-finder.preview.emergentagent.com'

PATIENT = {"email": "patient@demo.fr", "password": "Patient123!"}
PRACT = {"email": "praticien@demo.fr", "password": "Praticien123!"}


def s():
    return requests.Session()


# --- Root / public
def test_root():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_list_practitioners():
    r = requests.get(f"{BASE_URL}/api/practitioners")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    p = data[0]
    for k in ("id", "name", "specialty", "lat", "lng"):
        assert k in p


def test_specialties():
    r = requests.get(f"{BASE_URL}/api/practitioners/specialties")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_practitioner_and_availabilities():
    lst = requests.get(f"{BASE_URL}/api/practitioners").json()
    pid = lst[0]["id"]
    r = requests.get(f"{BASE_URL}/api/practitioners/{pid}")
    assert r.status_code == 200
    assert r.json()["id"] == pid
    r2 = requests.get(f"{BASE_URL}/api/practitioners/{pid}/availabilities?days=7")
    assert r2.status_code == 200
    days = r2.json()
    assert len(days) == 7
    for d in days:
        assert "slots" in d and "date" in d and "weekday" in d
    # find at least one slot with datetime/time/available
    found = False
    for d in days:
        for slot in d["slots"]:
            assert {"datetime", "time", "available"}.issubset(slot.keys())
            found = True
            break
        if found:
            break
    assert found, "Expected at least one slot in 7-day window"


# --- Auth
def test_register_and_logout():
    ses = s()
    email = f"test_user_{int(time.time())}@example.com"
    r = ses.post(f"{BASE_URL}/api/auth/register",
                 json={"email": email, "password": "Secret123!", "name": "Test U", "role": "patient"})
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["email"] == email
    assert user["role"] == "patient"
    # cookies set
    assert "access_token" in ses.cookies
    # /me works
    me = ses.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == email
    # logout
    lo = ses.post(f"{BASE_URL}/api/auth/logout")
    assert lo.status_code == 200
    me2 = ses.get(f"{BASE_URL}/api/auth/me")
    assert me2.status_code == 401


def test_login_patient():
    ses = s()
    r = ses.post(f"{BASE_URL}/api/auth/login", json=PATIENT)
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "patient"
    me = ses.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == PATIENT["email"]


def test_login_bad():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": PATIENT["email"], "password": "WRONG"})
    assert r.status_code == 401


# --- Appointments full flow
@pytest.fixture(scope="module")
def patient_session():
    ses = s()
    r = ses.post(f"{BASE_URL}/api/auth/login", json=PATIENT)
    assert r.status_code == 200
    return ses


@pytest.fixture(scope="module")
def pract_session():
    ses = s()
    r = ses.post(f"{BASE_URL}/api/auth/login", json=PRACT)
    assert r.status_code == 200
    return ses


@pytest.fixture(scope="module")
def first_slot():
    lst = requests.get(f"{BASE_URL}/api/practitioners").json()
    # pick a practitioner that is NOT the demo-linked one to avoid /me/practitioner mutation tests interfering
    pid = lst[2]["id"]
    avail = requests.get(f"{BASE_URL}/api/practitioners/{pid}/availabilities?days=14").json()
    for d in avail:
        for sl in d["slots"]:
            if sl["available"]:
                return pid, sl["datetime"]
    pytest.skip("No available slot found")


def test_book_and_conflict_and_cancel(patient_session, first_slot):
    pid, dt = first_slot
    # Book
    r = patient_session.post(f"{BASE_URL}/api/appointments",
                             json={"practitioner_id": pid, "slot_datetime": dt, "reason": "TEST_visit"})
    assert r.status_code == 200, r.text
    appt = r.json()
    assert appt["status"] == "confirmed"
    assert appt["slot_datetime"] == dt
    aid = appt["id"]

    # Conflict
    r2 = patient_session.post(f"{BASE_URL}/api/appointments",
                              json={"practitioner_id": pid, "slot_datetime": dt})
    assert r2.status_code == 409

    # GET mine - includes
    mine = patient_session.get(f"{BASE_URL}/api/appointments/mine")
    assert mine.status_code == 200
    ids = [a["id"] for a in mine.json()]
    assert aid in ids

    # Cancel
    cx = patient_session.delete(f"{BASE_URL}/api/appointments/{aid}")
    assert cx.status_code == 200

    # Verify status flipped (re-list)
    mine2 = patient_session.get(f"{BASE_URL}/api/appointments/mine").json()
    canceled = [a for a in mine2 if a["id"] == aid]
    assert canceled and canceled[0]["status"] == "cancelled"


def test_practitioner_blocked_from_booking(pract_session):
    lst = requests.get(f"{BASE_URL}/api/practitioners").json()
    pid = lst[1]["id"]
    avail = requests.get(f"{BASE_URL}/api/practitioners/{pid}/availabilities?days=7").json()
    dt = None
    for d in avail:
        for sl in d["slots"]:
            if sl["available"]:
                dt = sl["datetime"]
                break
        if dt:
            break
    if not dt:
        pytest.skip("no slot")
    r = pract_session.post(f"{BASE_URL}/api/appointments",
                           json={"practitioner_id": pid, "slot_datetime": dt})
    assert r.status_code == 403


def test_practitioner_me_endpoints(pract_session):
    r = pract_session.get(f"{BASE_URL}/api/me/practitioner")
    assert r.status_code == 200
    data = r.json()
    assert data is not None
    # PUT update
    body = {
        "name": data["name"],
        "specialty": data["specialty"],
        "bio": "TEST_updated bio",
        "photo": data.get("photo", ""),
        "address": data.get("address", ""),
        "city": data.get("city", ""),
        "phone": data.get("phone", ""),
        "lat": data["lat"],
        "lng": data["lng"],
        "consultation_fee": data.get("consultation_fee", 30),
        "weekly_schedule": data.get("weekly_schedule", {}),
    }
    r2 = pract_session.put(f"{BASE_URL}/api/me/practitioner", json=body)
    assert r2.status_code == 200, r2.text
    assert r2.json()["bio"] == "TEST_updated bio"
    # verify persistence
    r3 = pract_session.get(f"{BASE_URL}/api/me/practitioner")
    assert r3.json()["bio"] == "TEST_updated bio"


def test_unauth_appointments():
    r = requests.get(f"{BASE_URL}/api/appointments/mine")
    assert r.status_code == 401
