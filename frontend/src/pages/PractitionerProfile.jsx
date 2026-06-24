import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Timetable from "@/components/Timetable";
import MapView from "@/components/MapView";
import { MapPin, Phone, Star, ArrowLeft, BadgeEuro, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAY_FR = { 0: "Lun", 1: "Mar", 2: "Mer", 3: "Jeu", 4: "Ven", 5: "Sam", 6: "Dim" };

function formatSlot(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}

export default function PractitionerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pract, setPract] = useState(null);
  const [avail, setAvail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.get(`/practitioners/${id}`),
        api.get(`/practitioners/${id}/availabilities?days=14`),
      ]);
      setPract(p.data);
      setAvail(a.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSlotPick = (slot) => {
    if (!user || user === false) {
      navigate("/connexion", { state: { from: `/praticien/${id}` } });
      return;
    }
    if (user.role !== "patient") {
      toast.error("Seul un compte patient peut réserver un rendez-vous.");
      return;
    }
    setSelectedSlot(slot);
  };

  const confirmBooking = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      await api.post("/appointments", {
        practitioner_id: id,
        slot_datetime: selectedSlot.datetime,
        reason,
      });
      toast.success("Rendez-vous confirmé !");
      setSelectedSlot(null);
      setReason("");
      await load();
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-16 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>;
  if (!pract) return <div className="max-w-7xl mx-auto px-6 py-16">Praticien introuvable.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8" data-testid="practitioner-page">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4" /> Retour aux résultats
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* LEFT - profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <img src={pract.photo} alt={pract.name} className="w-24 h-24 rounded-2xl object-cover" data-testid="practitioner-photo" />
              <div className="flex-1">
                <div className="label-eyebrow">{pract.specialty}</div>
                <h1 className="font-heading text-2xl font-bold mt-1 leading-tight" data-testid="practitioner-name">{pract.name}</h1>
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="font-semibold">{pract.rating}</span>
                  <span className="text-muted-foreground">({pract.review_count} avis)</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-5 leading-relaxed" data-testid="practitioner-bio">{pract.bio}</p>

            <div className="mt-6 space-y-3 pt-5 border-t border-border">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>{pract.address}</span>
              </div>
              {pract.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{pract.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <BadgeEuro className="w-4 h-4 text-primary" />
                <span><span className="font-bold text-primary">{pract.consultation_fee}€</span> <span className="text-muted-foreground">par consultation</span></span>
              </div>
            </div>
          </div>

          <div className="h-64 lg:h-80">
            <MapView practitioners={[pract]} />
          </div>
        </div>

        {/* RIGHT - timetable */}
        <div className="lg:col-span-2">
          <Timetable availabilities={avail} onSelect={handleSlotPick} />

          <div className="mt-6 bg-muted/40 border border-border rounded-2xl p-5 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground mb-1">Comment ça marche ?</div>
            Cliquez sur un créneau vert pour réserver. Connectez-vous avec un compte patient pour confirmer votre rendez-vous.
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => !o && setSelectedSlot(null)}>
        <DialogContent className="rounded-2xl" data-testid="booking-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Confirmer le rendez-vous</DialogTitle>
            <DialogDescription>
              Avec <strong className="text-foreground">{pract.name}</strong> ({pract.specialty})
              {selectedSlot && <> · {formatSlot(selectedSlot.datetime)}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Motif (optionnel)</label>
            <Textarea data-testid="booking-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Décrivez brièvement la raison du rendez-vous…" className="rounded-xl bg-muted/30 min-h-24" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setSelectedSlot(null)} data-testid="booking-cancel">Annuler</Button>
            <Button className="rounded-full bg-primary hover:bg-primary/90 font-semibold" disabled={booking} onClick={confirmBooking} data-testid="booking-confirm">
              {booking ? "Réservation…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
