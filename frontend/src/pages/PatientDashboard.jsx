import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, MapPin, X, Loader2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

function formatDateTime(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    isPast: d < new Date(),
  };
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/appointments/mine");
      setAppts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
  const past = appts.filter((a) => new Date(a.slot_datetime) < new Date() || a.status === "cancelled");

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10" data-testid="patient-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="label-eyebrow">Mon espace patient</div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mt-2">Bonjour {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Gérez vos rendez-vous et votre historique.</p>
        </div>
        <Button onClick={() => navigate("/recherche")} className="rounded-full bg-primary hover:bg-primary/90 h-11 px-6 font-semibold" data-testid="dashboard-find-btn">
          <CalendarPlus className="w-4 h-4 mr-2" /> Prendre rendez-vous
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="font-heading text-xl font-semibold mb-4">À venir <span className="text-muted-foreground font-normal text-sm">({upcoming.length})</span></h2>
            {upcoming.length === 0 ? (
              <div className="bg-muted/40 border border-border rounded-2xl p-8 text-muted-foreground" data-testid="no-upcoming">
                Aucun rendez-vous à venir. Recherchez un praticien pour commencer votre prochaine consultation.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4" data-testid="upcoming-list">
                {upcoming.map((a) => {
                  const f = formatDateTime(a.slot_datetime);
                  return (
                    <div key={a.id} className="bg-card border border-border rounded-2xl p-5 hover-lift" data-testid={`appt-${a.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="label-eyebrow">{a.practitioner_specialty}</div>
                          <h3 className="font-heading text-lg font-semibold mt-1">{a.practitioner_name}</h3>
                        </div>
                        <button onClick={() => cancel(a.id)} title="Annuler" className="text-muted-foreground hover:text-destructive p-1" data-testid={`cancel-${a.id}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-4 space-y-1.5 text-sm">
                        <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> <span className="capitalize">{f.date}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {f.time}</div>
                      </div>
                      {a.reason && <div className="mt-3 text-xs text-muted-foreground italic">« {a.reason} »</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-xl font-semibold mb-4">Historique <span className="text-muted-foreground font-normal text-sm">({past.length})</span></h2>
            {past.length === 0 ? (
              <div className="text-sm text-muted-foreground">Pas encore d&apos;historique.</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl divide-y divide-border" data-testid="history-list">
                {past.map((a) => {
                  const f = formatDateTime(a.slot_datetime);
                  return (
                    <div key={a.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">{a.practitioner_name}</div>
                        <div className="text-xs text-muted-foreground">{a.practitioner_specialty} · <span className="capitalize">{f.date}</span> à {f.time}</div>
                      </div>
                      <div className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}>
                        {a.status === "cancelled" ? "Annulé" : "Terminé"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
