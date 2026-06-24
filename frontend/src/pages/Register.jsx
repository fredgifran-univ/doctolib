import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [role, setRole] = useState(sp.get("role") === "practitioner" ? "practitioner" : "patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await register({ email, password, name, role });
      toast.success(`Compte créé ! Bienvenue ${u.name}.`);
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 lg:p-10">
        <div className="label-eyebrow">Inscription</div>
        <h1 className="font-heading text-3xl font-bold mt-2">Créer un compte</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Réservez et suivez vos rendez-vous en toute simplicité.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 bg-muted/40 rounded-2xl p-1" data-testid="register-role-toggle">
          <button type="button" onClick={() => setRole("patient")} data-testid="role-patient"
            className={`h-10 rounded-xl text-sm font-semibold transition ${role === "patient" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            Patient
          </button>
          <button type="button" onClick={() => setRole("practitioner")} data-testid="role-practitioner"
            className={`h-10 rounded-xl text-sm font-semibold transition ${role === "practitioner" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            Praticien
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4" data-testid="register-form">
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Nom complet</label>
            <Input data-testid="register-name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Email</label>
            <Input data-testid="register-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Mot de passe</label>
            <Input data-testid="register-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
            <div className="text-[11px] text-muted-foreground mt-1">Minimum 6 caractères</div>
          </div>
          {err && <div className="text-sm text-destructive" data-testid="register-error">{err}</div>}
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 font-semibold" data-testid="register-submit">
            {loading ? "Création..." : "Créer mon compte"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground text-center">
          Déjà inscrit ?{" "}
          <Link to="/connexion" className="text-primary font-semibold underline" data-testid="register-go-login">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
