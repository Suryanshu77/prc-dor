import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LandingAtmosphere } from "@/components/landing/LandingAtmosphere";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHeroCopy } from "@/components/landing/LandingHeroCopy";
import { LandingHeroVisual } from "@/components/landing/LandingHeroVisual";
import "../components/landing/landing.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRC D'or — The Football Community Awards" },
      {
        name: "description",
        content:
          "Annual football community awards for PRC society. Vote for the player who deserves the PRC D'or.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600;1,700&display=swap",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="ld-root">
      <LandingAtmosphere />
      <LandingHeader />
      <main className="ld-hero">
        <LandingHeroCopy />
        <LandingHeroVisual />
      </main>
    </div>
  );
}
