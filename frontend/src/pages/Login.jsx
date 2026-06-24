import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bienvenue ${u.name} !`);
      navigate(location.state?.from || "/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 lg:p-10">
        <div className="label-eyebrow">Espace personnel</div>
        <h1 className="font-heading text-3xl font-bold mt-2">Se connecter</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Accédez à votre historique et vos rendez-vous.</p>

        <form onSubmit={submit} className="mt-7 space-y-4" data-testid="login-form">
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Email</label>
            <Input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Mot de passe</label>
            <Input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-muted/30" />
          </div>
          {err && <div className="text-sm text-destructive" data-testid="login-error">{err}</div>}
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 font-semibold" data-testid="login-submit">
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground text-center">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="text-primary font-semibold underline" data-testid="login-go-register">Créer un compte</Link>
        </div>

        <div className="mt-6 text-xs text-muted-foreground bg-muted/40 rounded-xl p-3">
          <div className="font-semibold mb-1">Comptes de démonstration</div>
          <div>Patient: patient@demo.fr / Patient123!</div>
          <div>Praticien: praticien@demo.fr / Praticien123!</div>
        </div>
      </div>
    </div>
  );
}
