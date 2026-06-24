import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, User, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const WEEKDAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

const DEFAULT_SLOTS_BY_HOUR = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

function formatDateTime(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    isPast: d < new Date(),
  };
}

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    specialty: "Médecin généraliste",
    bio: "",
    photo: "",
    address: "",
    city: "",
    phone: "",
    lat: 48.8566,
    lng: 2.3522,
    consultation_fee: 30,
    weekly_schedule: {},
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.get("/me/practitioner"),
        api.get("/appointments/mine"),
      ]);
      if (p.data) {
        setProfile(p.data);
        setForm({ ...p.data });
      }
      setAppts(a.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSlot = (day, time) => {
    const current = form.weekly_schedule?.[day] || [];
    const next = current.includes(time) ? current.filter((t) => t !== time) : [...current, time].sort();
    setForm({ ...form, weekly_schedule: { ...form.weekly_schedule, [day]: next } });
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form };
      body.lat = Number(body.lat);
      body.lng = Number(body.lng);
      body.consultation_fee = Number(body.consultation_fee);
      const { data } = await api.put("/me/practitioner", body);
      setProfile(data);
      toast.success("Profil enregistré");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Rendez-vous annulé");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const upcoming = appts.filter((a) => new Date(a.slot_datetime) >= new Date() && a.status !== "cancelled");

  if (loading) {
    return <div className="max-w-6xl mx-auto px-6 py-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10" data-testid="practitioner-dashboard">
      <div className="label-eyebrow">Espace praticien</div>
      <h1 className="font-heading text-3xl lg:text-4xl font-bold mt-2">Bonjour {user?.name}</h1>
      <p className="text-sm text-muted-foreground mt-1.5">Mettez à jour votre profil et gérez votre agenda.</p>

      <div className="grid lg:grid-cols-3 gap-8 mt-10">
        {/* Upcoming */}
        <section className="lg:col-span-1">
          <h2 className="font-heading text-xl font-semibold mb-4">Rendez-vous à venir <span className="text-muted-foreground font-normal text-sm">({upcoming.length})</span></h2>
          {upcoming.length === 0 ? (
            <div className="bg-muted/40 border border-border rounded-2xl p-6 text-sm text-muted-foreground" data-testid="no-upcoming-pract">
              Aucun rendez-vous à venir.
            </div>
          ) : (
            <div className="space-y-3" data-testid="practitioner-upcoming-list">
              {upcoming.map((a) => {
                const f = formatDateTime(a.slot_datetime);
                return (
                  <div key={a.id} className="bg-card border border-border rounded-2xl p-4" data-testid={`pract-appt-${a.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold"><User className="w-4 h-4 text-primary" />{a.patient_name}</div>
                        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /><span className="capitalize">{f.date}</span></div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{f.time}</div>
                      </div>
                      <button onClick={() => cancel(a.id)} className="text-muted-foreground hover:text-destructive p-1" data-testid={`pract-cancel-${a.id}`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {a.reason && <div className="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-border">« {a.reason} »</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Profile + schedule */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold mb-4">Profil public</h2>
            <div className="grid sm:grid-cols-2 gap-4" data-testid="profile-form">
              {[
                ["name", "Nom affiché"],
                ["specialty", "Spécialité"],
                ["address", "Adresse"],
                ["city", "Ville"],
                ["phone", "Téléphone"],
                ["photo", "URL de la photo"],
              ].map(([k, label]) => (
                <label key={k} className="block">
                  <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{label}</div>
                  <Input data-testid={`profile-${k}`} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
                </label>
              ))}
              <label className="block">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Latitude</div>
                <Input data-testid="profile-lat" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Longitude</div>
                <Input data-testid="profile-lng" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Tarif (€)</div>
                <Input data-testid="profile-fee" type="number" value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
              </label>
              <label className="block sm:col-span-2">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Présentation</div>
                <Textarea data-testid="profile-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5 rounded-xl bg-muted/30 min-h-24" />
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-heading text-xl font-semibold">Agenda hebdomadaire</h2>
            <p className="text-sm text-muted-foreground mt-1">Cliquez sur les créneaux pour activer les disponibilités récurrentes.</p>
            <div className="mt-5 space-y-4" data-testid="weekly-schedule">
              {WEEKDAYS.map((d) => {
                const active = form.weekly_schedule?.[d.key] || [];
                return (
                  <div key={d.key}>
                    <div className="text-sm font-semibold mb-2">{d.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_SLOTS_BY_HOUR.map((t) => {
                        const on = active.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            data-testid={`slot-${d.key}-${t}`}
                            onClick={() => toggleSlot(d.key, t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="rounded-full bg-primary hover:bg-primary/90 h-11 px-8 font-semibold" data-testid="profile-save">
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </section>
      </div>
    </div>
  );
}
