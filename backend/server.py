from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta, time as dt_time
from typing import List, Optional, Annotated
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, BeforeValidator
from bson import ObjectId

# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- App / Router ---
app = FastAPI(title="MediBook API")
api = APIRouter(prefix="/api")

# --- ObjectId helpers ---
def _str_object_id(v) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_str_object_id)]

JWT_ALGORITHM = "HS256"
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# --- Password helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return pyjwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=12*3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")

# --- Auth dependency ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Type de token invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ============================================================
# Models
# ============================================================
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: datetime

class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: str = Field(pattern="^(patient|practitioner)$")

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class PractitionerPublic(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    specialty: str
    bio: str = ""
    photo: str = ""
    address: str = ""
    city: str = ""
    phone: str = ""
    lat: float
    lng: float
    rating: float = 4.8
    review_count: int = 0
    consultation_fee: int = 30
    weekly_schedule: dict = {}

class PractitionerCreate(BaseModel):
    name: str
    specialty: str
    bio: str = ""
    photo: str = ""
    address: str = ""
    city: str = ""
    phone: str = ""
    lat: float
    lng: float
    consultation_fee: int = 30
    weekly_schedule: dict = {}

class AppointmentCreate(BaseModel):
    practitioner_id: str
    slot_datetime: str  # ISO string, e.g. "2026-02-10T09:30:00"
    reason: str = ""

class AppointmentPublic(BaseModel):
    id: str
    patient_id: str
    practitioner_id: str
    patient_name: str = ""
    practitioner_name: str = ""
    practitioner_specialty: str = ""
    slot_datetime: str
    status: str
    reason: str = ""
    created_at: datetime

# ============================================================
# Auth endpoints
# ============================================================
@api.post("/auth/register", response_model=UserPublic)
async def register(body: RegisterBody, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return UserPublic(id=uid, email=email, name=body.name, role=body.role, created_at=doc["created_at"])

@api.post("/auth/login", response_model=UserPublic)
async def login(body: LoginBody, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return UserPublic(id=uid, email=user["email"], name=user["name"], role=user["role"], created_at=user["created_at"])

@api.post("/auth/logout")
async def logout(response: Response):
    # Must match flags used when setting (samesite=none; secure=True) to actually clear in browser.
    response.set_cookie("access_token", "", max_age=0, expires=0, httponly=True, secure=True, samesite="none", path="/")
    response.set_cookie("refresh_token", "", max_age=0, expires=0, httponly=True, secure=True, samesite="none", path="/")
    return {"ok": True}

@api.get("/auth/me", response_model=UserPublic)
async def me(current=Depends(get_current_user)):
    return UserPublic(**current)

# ============================================================
# Practitioners
# ============================================================
def practitioner_to_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": doc.get("user_id"),
        "name": doc.get("name", ""),
        "specialty": doc.get("specialty", ""),
        "bio": doc.get("bio", ""),
        "photo": doc.get("photo", ""),
        "address": doc.get("address", ""),
        "city": doc.get("city", ""),
        "phone": doc.get("phone", ""),
        "lat": float(doc.get("lat", 48.8566)),
        "lng": float(doc.get("lng", 2.3522)),
        "rating": float(doc.get("rating", 4.8)),
        "review_count": int(doc.get("review_count", 0)),
        "consultation_fee": int(doc.get("consultation_fee", 30)),
        "weekly_schedule": doc.get("weekly_schedule", {}),
    }

@api.get("/practitioners", response_model=List[PractitionerPublic])
async def list_practitioners(
    name: Optional[str] = None,
    specialty: Optional[str] = None,
    city: Optional[str] = None,
):
    q: dict = {}
    if name:
        q["name"] = {"$regex": name, "$options": "i"}
    if specialty and specialty != "all":
        q["specialty"] = {"$regex": specialty, "$options": "i"}
    if city:
        q["city"] = {"$regex": city, "$options": "i"}
    docs = await db.practitioners.find(q).limit(200).to_list(200)
    return [practitioner_to_public(d) for d in docs]

@api.get("/practitioners/specialties")
async def list_specialties():
    specs = await db.practitioners.distinct("specialty")
    return sorted(specs)

@api.get("/practitioners/{pid}", response_model=PractitionerPublic)
async def get_practitioner(pid: str):
    try:
        doc = await db.practitioners.find_one({"_id": ObjectId(pid)})
    except Exception:
        raise HTTPException(status_code=404, detail="Praticien introuvable")
    if not doc:
        raise HTTPException(status_code=404, detail="Praticien introuvable")
    return practitioner_to_public(doc)

@api.get("/practitioners/{pid}/availabilities")
async def get_availabilities(pid: str, days: int = 7):
    try:
        doc = await db.practitioners.find_one({"_id": ObjectId(pid)})
    except Exception:
        raise HTTPException(status_code=404, detail="Praticien introuvable")
    if not doc:
        raise HTTPException(status_code=404, detail="Praticien introuvable")

    schedule = doc.get("weekly_schedule", {})
    # Fetch existing bookings within window
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=days + 1)
    booked_docs = await db.appointments.find({
        "practitioner_id": pid,
        "slot_datetime": {"$gte": start.isoformat(), "$lt": end.isoformat()},
        "status": {"$ne": "cancelled"},
    }).to_list(1000)
    booked_set = {b["slot_datetime"] for b in booked_docs}

    weekday_names = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
    result = []
    today = datetime.now(timezone.utc)
    for i in range(days):
        day = (today + timedelta(days=i)).date()
        weekday = weekday_names[day.weekday()]
        slots_for_day = schedule.get(weekday, [])
        day_slots = []
        for hhmm in slots_for_day:
            try:
                hh, mm = hhmm.split(":")
                slot_dt = datetime(day.year, day.month, day.day, int(hh), int(mm), tzinfo=timezone.utc)
                if slot_dt < datetime.now(timezone.utc):
                    continue
                iso = slot_dt.isoformat()
                day_slots.append({"datetime": iso, "time": hhmm, "available": iso not in booked_set})
            except Exception:
                continue
        result.append({"date": day.isoformat(), "weekday": weekday, "slots": day_slots})
    return result

# --- Practitioner profile management (logged-in practitioner)
@api.get("/me/practitioner", response_model=Optional[PractitionerPublic])
async def get_my_practitioner(current=Depends(get_current_user)):
    if current["role"] != "practitioner":
        raise HTTPException(status_code=403, detail="Accès réservé aux praticiens")
    doc = await db.practitioners.find_one({"user_id": current["id"]})
    if not doc:
        return None
    return practitioner_to_public(doc)

@api.put("/me/practitioner", response_model=PractitionerPublic)
async def upsert_my_practitioner(body: PractitionerCreate, current=Depends(get_current_user)):
    if current["role"] != "practitioner":
        raise HTTPException(status_code=403, detail="Accès réservé aux praticiens")
    update = body.model_dump()
    update["user_id"] = current["id"]
    await db.practitioners.update_one(
        {"user_id": current["id"]},
        {"$set": update, "$setOnInsert": {"rating": 5.0, "review_count": 0}},
        upsert=True,
    )
    doc = await db.practitioners.find_one({"user_id": current["id"]})
    return practitioner_to_public(doc)

# ============================================================
# Appointments
# ============================================================
def appt_to_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "patient_id": doc["patient_id"],
        "practitioner_id": doc["practitioner_id"],
        "patient_name": doc.get("patient_name", ""),
        "practitioner_name": doc.get("practitioner_name", ""),
        "practitioner_specialty": doc.get("practitioner_specialty", ""),
        "slot_datetime": doc["slot_datetime"],
        "status": doc["status"],
        "reason": doc.get("reason", ""),
        "created_at": doc["created_at"],
    }

@api.post("/appointments", response_model=AppointmentPublic)
async def book_appointment(body: AppointmentCreate, current=Depends(get_current_user)):
    if current["role"] != "patient":
        raise HTTPException(status_code=403, detail="Seuls les patients peuvent réserver")
    try:
        pract = await db.practitioners.find_one({"_id": ObjectId(body.practitioner_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Praticien introuvable")
    if not pract:
        raise HTTPException(status_code=404, detail="Praticien introuvable")
    # check conflict
    existing = await db.appointments.find_one({
        "practitioner_id": body.practitioner_id,
        "slot_datetime": body.slot_datetime,
        "status": {"$ne": "cancelled"},
    })
    if existing:
        raise HTTPException(status_code=409, detail="Ce créneau est déjà réservé")
    doc = {
        "patient_id": current["id"],
        "practitioner_id": body.practitioner_id,
        "patient_name": current["name"],
        "patient_email": current["email"],
        "practitioner_name": pract.get("name", ""),
        "practitioner_specialty": pract.get("specialty", ""),
        "slot_datetime": body.slot_datetime,
        "reason": body.reason,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.appointments.insert_one(doc)
    doc["_id"] = res.inserted_id
    return appt_to_public(doc)

@api.get("/appointments/mine", response_model=List[AppointmentPublic])
async def my_appointments(current=Depends(get_current_user)):
    if current["role"] == "patient":
        q = {"patient_id": current["id"]}
    else:
        # practitioner: load their practitioner profile
        pract = await db.practitioners.find_one({"user_id": current["id"]})
        if not pract:
            return []
        q = {"practitioner_id": str(pract["_id"])}
    docs = await db.appointments.find(q).sort("slot_datetime", -1).to_list(500)
    return [appt_to_public(d) for d in docs]

@api.delete("/appointments/{aid}")
async def cancel_appointment(aid: str, current=Depends(get_current_user)):
    try:
        doc = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    if not doc:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    # patient owner OR practitioner who owns it
    allowed = False
    if current["role"] == "patient" and doc["patient_id"] == current["id"]:
        allowed = True
    elif current["role"] == "practitioner":
        pract = await db.practitioners.find_one({"user_id": current["id"]})
        if pract and str(pract["_id"]) == doc["practitioner_id"]:
            allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Non autorisé")
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"status": "cancelled"}})
    return {"ok": True}

@api.get("/")
async def root():
    return {"name": "MediBook API", "status": "ok"}

# ============================================================
# Startup: indexes + seed demo data
# ============================================================
DEMO_SCHEDULE = {
    "monday": ["09:00","09:30","10:00","10:30","11:00","14:00","14:30","15:00","15:30","16:00","16:30"],
    "tuesday": ["09:00","09:30","10:00","10:30","11:00","14:00","14:30","15:00","15:30","16:00"],
    "wednesday": ["09:00","09:30","10:00","10:30","11:00","11:30"],
    "thursday": ["09:00","09:30","10:00","10:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
    "friday": ["09:00","09:30","10:00","10:30","11:00","14:00","14:30","15:00","15:30"],
    "saturday": ["09:00","09:30","10:00","10:30"],
    "sunday": [],
}

DEMO_PRACTITIONERS = [
    {"name": "Dr. Camille Dubois", "specialty": "Médecin généraliste", "city": "Paris",
     "address": "12 rue de Rivoli, 75004 Paris", "lat": 48.8558, "lng": 2.3578, "phone": "+33 1 42 33 44 55",
     "photo": "https://images.unsplash.com/photo-1612349316228-5942a9b489c2?w=400&q=80",
     "bio": "Médecin généraliste, 15 ans d'expérience. Consultations adultes et enfants.",
     "consultation_fee": 30, "rating": 4.9, "review_count": 187},
    {"name": "Dr. Antoine Moreau", "specialty": "Dentiste", "city": "Paris",
     "address": "45 avenue de la République, 75011 Paris", "lat": 48.8657, "lng": 2.3795, "phone": "+33 1 43 55 22 11",
     "photo": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80",
     "bio": "Chirurgien-dentiste spécialisé en soins conservateurs et esthétique dentaire.",
     "consultation_fee": 50, "rating": 4.8, "review_count": 134},
    {"name": "Léa Bernard", "specialty": "Kinésithérapeute", "city": "Lyon",
     "address": "8 place Bellecour, 69002 Lyon", "lat": 45.7578, "lng": 4.8320, "phone": "+33 4 78 22 11 33",
     "photo": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",
     "bio": "Kinésithérapeute du sport et rééducation post-opératoire.",
     "consultation_fee": 35, "rating": 4.7, "review_count": 92},
    {"name": "Dr. Sophie Laurent", "specialty": "Dermatologue", "city": "Paris",
     "address": "23 boulevard Haussmann, 75009 Paris", "lat": 48.8744, "lng": 2.3325, "phone": "+33 1 47 70 12 34",
     "photo": "https://images.pexels.com/photos/8460094/pexels-photo-8460094.jpeg?auto=compress&w=400",
     "bio": "Dermatologue, dermatologie médicale, esthétique et pédiatrique.",
     "consultation_fee": 70, "rating": 4.9, "review_count": 211},
    {"name": "Dr. Karim Benali", "specialty": "Ophtalmologue", "city": "Marseille",
     "address": "5 La Canebière, 13001 Marseille", "lat": 43.2965, "lng": 5.3742, "phone": "+33 4 91 33 44 55",
     "photo": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80",
     "bio": "Ophtalmologue, chirurgie réfractive et cataracte.",
     "consultation_fee": 60, "rating": 4.6, "review_count": 78},
    {"name": "Dr. Émilie Rousseau", "specialty": "Pédiatre", "city": "Bordeaux",
     "address": "10 cours de l'Intendance, 33000 Bordeaux", "lat": 44.8412, "lng": -0.5772, "phone": "+33 5 56 11 22 33",
     "photo": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&q=80",
     "bio": "Pédiatre, suivi de l'enfant de 0 à 16 ans.",
     "consultation_fee": 40, "rating": 4.9, "review_count": 156},
    {"name": "Marc Lefèvre", "specialty": "Psychologue", "city": "Paris",
     "address": "67 rue du Faubourg Saint-Antoine, 75011 Paris", "lat": 48.8516, "lng": 2.3756, "phone": "+33 1 48 06 12 34",
     "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
     "bio": "Psychologue clinicien, thérapie cognitivo-comportementale.",
     "consultation_fee": 70, "rating": 4.8, "review_count": 102},
    {"name": "Dr. Nadia Chen", "specialty": "Médecin généraliste", "city": "Lyon",
     "address": "15 rue de la République, 69001 Lyon", "lat": 45.7665, "lng": 4.8358, "phone": "+33 4 78 88 99 00",
     "photo": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80",
     "bio": "Médecin de famille, médecine préventive et nutrition.",
     "consultation_fee": 30, "rating": 4.7, "review_count": 143},
]

@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.appointments.create_index([("practitioner_id", 1), ("slot_datetime", 1)])
    await db.practitioners.create_index("specialty")
    await db.practitioners.create_index("city")

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@medibook.fr").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # seed demo patient
    patient_email = "patient@demo.fr"
    if not await db.users.find_one({"email": patient_email}):
        await db.users.insert_one({
            "email": patient_email,
            "password_hash": hash_password("Patient123!"),
            "name": "Marie Démo",
            "role": "patient",
            "created_at": datetime.now(timezone.utc),
        })

    # seed demo practitioners
    count = await db.practitioners.count_documents({})
    if count == 0:
        for p in DEMO_PRACTITIONERS:
            doc = dict(p)
            doc["weekly_schedule"] = DEMO_SCHEDULE
            doc["bio"] = doc.get("bio", "")
            doc["user_id"] = None
            await db.practitioners.insert_one(doc)
        logger.info(f"Seeded {len(DEMO_PRACTITIONERS)} demo practitioners")

    # seed a demo practitioner user account linked to one practitioner
    pract_email = "praticien@demo.fr"
    pract_user = await db.users.find_one({"email": pract_email})
    if not pract_user:
        res = await db.users.insert_one({
            "email": pract_email,
            "password_hash": hash_password("Praticien123!"),
            "name": "Dr. Camille Dubois",
            "role": "practitioner",
            "created_at": datetime.now(timezone.utc),
        })
        # link to first practitioner if not linked
        first = await db.practitioners.find_one({"name": "Dr. Camille Dubois"})
        if first:
            await db.practitioners.update_one({"_id": first["_id"]}, {"$set": {"user_id": str(res.inserted_id)}})

# --- include router + CORS ---
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
