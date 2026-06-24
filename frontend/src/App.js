import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Search from "@/pages/Search";
import PractitionerProfile from "@/pages/PractitionerProfile";
import PatientDashboard from "@/pages/PatientDashboard";
import PractitionerDashboard from "@/pages/PractitionerDashboard";
import "@/App.css";

function Dashboard() {
  const { user } = useAuth();
  if (user === null) return <div className="max-w-6xl mx-auto px-6 py-16 text-muted-foreground">Chargement…</div>;
  if (user === false) return <Navigate to="/connexion" replace />;
  if (user.role === "practitioner") return <PractitionerDashboard />;
  return <PatientDashboard />;
}

function Shell() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/recherche" element={<Search />} />
          <Route path="/praticien/:id" element={<PractitionerProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} MediBook · Soin sur mesure</div>
          <div className="label-eyebrow">Plateforme de prise de rendez-vous médicaux</div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Shell />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
