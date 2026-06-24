import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, MapPin, Stethoscope, Star, ArrowRight, Loader2 } from "lucide-react";
import MapView from "@/components/MapView";

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const [name, setName] = useState(sp.get("name") || "");
  const [city, setCity] = useState(sp.get("city") || "");
  const [specialty, setSpecialty] = useState(sp.get("specialty") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    api.get("/practitioners/specialties").then((r) => setSpecialties(r.data)).catch(() => {});
  }, []);

  const fetchResults = useCallback(async (params) => {
    setLoading(true);
    try {
      const { data } = await api.get("/practitioners", { params });
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults({
      name: sp.get("name") || undefined,
      city: sp.get("city") || undefined,
      specialty: sp.get("specialty") || undefined,
    });
  }, [sp, fetchResults]);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (city) params.set("city", city);
    if (specialty) params.set("specialty", specialty);
    setSp(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8" data-testid="search-page">
      {/* Search bar */}
      <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-3 lg:p-4 grid grid-cols-1 md:grid-cols-4 gap-2" data-testid="search-form">
        <label className="relative">
          <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="search-specialty" placeholder="Spécialité" className="pl-10 h-11 rounded-xl bg-muted/30" value={specialty} onChange={(e) => setSpecialty(e.target.value)} list="spec-list" />
          <datalist id="spec-list">
            {specialties.map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
        <label className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="search-name" placeholder="Nom du praticien" className="pl-10 h-11 rounded-xl bg-muted/30" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="search-city" placeholder="Ville" className="pl-10 h-11 rounded-xl bg-muted/30" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <Button type="submit" className="h-11 rounded-full bg-primary hover:bg-primary/90" data-testid="search-submit">
          <SearchIcon className="w-4 h-4 mr-2" /> Rechercher
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="label-eyebrow">Résultats</div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold mt-1" data-testid="search-results-title">
            {loading ? "Recherche…" : `${results.length} praticien${results.length > 1 ? "s" : ""} trouvé${results.length > 1 ? "s" : ""}`}
          </h1>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6 lg:h-[calc(100vh-280px)]">
        {/* LIST */}
        <div className="space-y-4 lg:overflow-y-auto lg:pr-2" data-testid="results-list">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="bg-muted/40 border border-border rounded-2xl p-8 text-center text-muted-foreground" data-testid="no-results">
              Aucun praticien ne correspond à votre recherche.
            </div>
          )}
          {results.map((p, i) => (
            <div
              key={p.id}
              data-testid={`practitioner-card-${p.id}`}
              onMouseEnter={() => setSelectedId(p.id)}
              className={`bg-card border rounded-2xl p-5 hover-lift cursor-pointer transition ${selectedId === p.id ? "border-primary" : "border-border"}`}
            >
              <div className="flex gap-4">
                <div className="relative shrink-0">
                  <img src={p.photo} alt={p.name} className="w-20 h-20 rounded-2xl object-cover" />
                  <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-lg font-semibold leading-tight">{p.name}</h3>
                      <div className="label-eyebrow mt-1">{p.specialty}</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-accent text-accent" />
                      <span className="font-semibold">{p.rating}</span>
                      <span className="text-muted-foreground">({p.review_count})</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {p.address}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Consultation</span>{" "}
                      <span className="font-bold text-primary">{p.consultation_fee}€</span>
                    </div>
                    <Link
                      to={`/praticien/${p.id}`}
                      className="text-sm font-semibold text-primary inline-flex items-center gap-1.5"
                      data-testid={`view-practitioner-${p.id}`}
                    >
                      Voir disponibilités <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MAP */}
        <div className="hidden lg:block sticky top-24 h-full">
          <MapView practitioners={results} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}
