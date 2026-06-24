import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Stethoscope, ArrowRight, ShieldCheck, Sparkles, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Landing() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("name", q);
    if (city) params.set("city", city);
    if (specialty) params.set("specialty", specialty);
    navigate(`/recherche?${params.toString()}`);
  };

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1762625570087-6d98fca29531?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxtZWRpY2FsJTIwY2xpbmljJTIwaW50ZXJpb3IlMjBjbGVhbiUyMG1vZGVybnxlbnwwfHx8fDE3ODIyODg3MjF8MA&ixlib=rb-4.1.0&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/80 to-background" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs tracking-[0.18em] uppercase font-bold" data-testid="hero-badge">
              <Sparkles className="w-3.5 h-3.5" /> Votre santé, en quelques clics
            </div>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
              Trouvez et réservez<br />
              <span className="text-primary">votre praticien</span> de santé
            </h1>
            <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Médecins, dentistes, kinés, psychologues… Recherchez par nom, localisation
              et disponibilité. Réservez en direct depuis leur agenda.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={submit} className="relative mt-10 bg-card border border-border rounded-2xl p-3 lg:p-4 max-w-4xl shadow-[0_24px_60px_-30px_rgba(24,75,61,0.25)]" data-testid="hero-search-form">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="relative">
                <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="hero-search-specialty"
                  placeholder="Spécialité (ex: dentiste)"
                  className="pl-10 h-12 rounded-xl border-border bg-muted/30"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </label>
              <label className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="hero-search-name"
                  placeholder="Nom du praticien"
                  className="pl-10 h-12 rounded-xl border-border bg-muted/30"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <label className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="hero-search-city"
                  placeholder="Ville ou code postal"
                  className="pl-10 h-12 rounded-xl border-border bg-muted/30"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
            </div>
            <Button
              type="submit"
              data-testid="hero-search-submit"
              className="mt-3 w-full md:w-auto md:absolute md:right-4 md:bottom-4 h-12 rounded-full bg-primary hover:bg-primary/90 px-8 font-semibold"
            >
              Rechercher <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          {/* Quick specs */}
          <div className="mt-8 flex flex-wrap gap-2" data-testid="quick-specs">
            {["Médecin généraliste", "Dentiste", "Kinésithérapeute", "Dermatologue", "Pédiatre", "Psychologue"].map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/recherche?specialty=${encodeURIComponent(s)}`)}
                className="px-4 py-2 rounded-full bg-card border border-border text-sm hover-lift"
                data-testid={`quick-spec-${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { icon: Search, title: "Recherche intelligente", text: "Trouvez par nom, spécialité, ville. Filtres précis et carte interactive en temps réel." },
            { icon: CalendarCheck, title: "Agenda en direct", text: "Visualisez les créneaux disponibles et réservez en un clic depuis l'agenda du praticien." },
            { icon: ShieldCheck, title: "Données protégées", text: "Vos informations restent confidentielles. Suivez votre historique de rendez-vous dans votre espace." },
          ].map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-7 hover-lift" data-testid={`feature-${i}`}>
              <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA practitioner */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 lg:p-14 grid lg:grid-cols-2 gap-8 items-center grain">
          <div>
            <div className="label-eyebrow text-primary-foreground/70">Vous êtes praticien ?</div>
            <h2 className="mt-3 font-heading text-3xl lg:text-4xl font-semibold leading-tight">
              Simplifiez la gestion de votre agenda et accueillez plus de patients.
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
            <Button onClick={() => navigate("/inscription?role=practitioner")} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground px-8 h-12 font-semibold" data-testid="cta-practitioner-register">
              Devenir praticien
            </Button>
            <Button onClick={() => navigate("/connexion")} variant="outline" className="rounded-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 h-12 font-semibold bg-transparent" data-testid="cta-practitioner-login">
              Se connecter
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
