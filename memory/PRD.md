# MediBook — PRD

## Problem Statement (verbatim)
An app to book appointments with doctors or health practitioners with a system of search by name, by localisation and availability. Patients have to identify and can access to their own booking history. Booking has to be set directly in a timetable showing availabilities.

## Stack & Architecture
- Backend: FastAPI + MongoDB (motor), JWT cookie auth (httpOnly)
- Frontend: React + React Router + Tailwind + shadcn/ui + react-leaflet
- Language: French (UI), English (code)

## User Personas
1. **Patient** — registers/logs in, searches practitioners, views map + timetable, books and manages appointments.
2. **Practitioner** — registers/logs in, edits profile (name, specialty, address, photo, lat/lng, fee, bio), defines weekly availability slots, sees and cancels upcoming appointments.

## Core Requirements (static)
- Search by name, specialty, city (server-side filtering)
- Interactive map (Leaflet/OpenStreetMap) of practitioner locations
- Timetable showing real-time availability over 7–14 days
- Booking via direct slot click + reason
- Patient booking history (upcoming / past / cancelled)
- Authentication with two roles

## Implemented (Feb 2026)
- Backend: auth (register/login/logout/me), practitioners list+detail+specialties, availabilities (computed from weekly schedule – booked slots), appointments (create, list mine, cancel), practitioner profile upsert.
- Seed data: 8 demo practitioners in 4 French cities + demo patient & practitioner accounts.
- Frontend: Landing with hero search, Search page with split list+map, Practitioner profile with map+timetable, Booking dialog, Patient dashboard (upcoming/history), Practitioner dashboard (profile editor + weekly slot grid + upcoming).
- French interface entirely.
- design_guidelines.json applied: Outfit/Plus Jakarta Sans fonts, green (#184B3D) + sage palette, rounded-2xl, hover-lift.

## Test Credentials (in /app/memory/test_credentials.md)
- Admin: admin@medibook.fr / Admin123!
- Patient: patient@demo.fr / Patient123!
- Practitioner: praticien@demo.fr / Praticien123!

## Backlog (next priorities)
P0: Google login (Emergent-managed) as alt to JWT.
P1: SMS/email reminders for upcoming appointments; ratings & reviews from patients post-visit.
P1: Geolocation "near me" using browser geo API + radius filter.
P2: Practitioner availability bulk-edit (copy week / time off blocks).
P2: Calendar export (iCal/Google).
P2: Multi-language toggle (FR/EN).
