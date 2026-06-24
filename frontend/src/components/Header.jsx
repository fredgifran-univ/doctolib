import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Stethoscope, LogOut, CalendarDays, LayoutDashboard, Search } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="header-logo">
          <div className="w-9 h-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-lg font-bold tracking-tight">MediBook</div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Soin sur mesure</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/recherche" className="text-sm font-medium px-3 py-2 rounded-full hover:bg-muted text-foreground/80 hover:text-foreground transition" data-testid="nav-search">
            <Search className="inline w-4 h-4 mr-1.5" />Rechercher
          </Link>
          {user && user !== false && (
            <Link to="/dashboard" className="text-sm font-medium px-3 py-2 rounded-full hover:bg-muted text-foreground/80 hover:text-foreground transition" data-testid="nav-dashboard">
              <LayoutDashboard className="inline w-4 h-4 mr-1.5" />Mon espace
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user === null ? null : user === false ? (
            <>
              <Button variant="ghost" className="rounded-full" onClick={() => navigate("/connexion")} data-testid="header-login-btn">
                Se connecter
              </Button>
              <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/inscription")} data-testid="header-register-btn">
                Créer un compte
              </Button>
            </>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-medium" data-testid="header-username">{user.name}</span>
              </div>
              <Button variant="ghost" className="rounded-full" onClick={async () => { await logout(); navigate("/"); }} data-testid="header-logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
