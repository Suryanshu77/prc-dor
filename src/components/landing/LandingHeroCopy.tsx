import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const STATS = [
  { icon: Users, value: "30+", label: "Players" },
  { icon: BarChart3, value: "Top 10", label: "Ranking" },
  { icon: Trophy, value: "1", label: "Winner crowned" },
];

export function LandingHeroCopy() {
  return (
    <div className="ld-copy">
      <div className="ld-eyebrow ld-rise ld-delay-1">
        <span className="ld-eyebrow__rule" />
        <span className="ld-eyebrow__text">PRC D&apos;or 2027</span>
        <span className="ld-eyebrow__rule ld-eyebrow__rule--tail" />
      </div>

      <h1 className="ld-title ld-rise ld-delay-2">
        <span>The Community</span>
        <span>Award For</span>
        <span className="ld-title__gold">Football Greatness</span>
      </h1>

      <p className="ld-lede ld-rise ld-delay-3">
        The annual football community award of the PRC society. Sign up, rank
        your top ten, and crown the year&apos;s best player among 30+ legends of
        the pitch.
      </p>

      <div className="ld-ctas ld-rise ld-delay-4">
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="ld-btn ld-btn--primary"
        >
          <UserPlus />
          Create your player profile
          <ArrowRight />
        </Link>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="ld-btn ld-btn--ghost"
        >
          <User />I already have an account
        </Link>
      </div>

      <div className="ld-stats ld-rise ld-delay-5">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="ld-stat">
            <Icon className="ld-stat__icon" />
            <div>
              <div className="ld-stat__value">{value}</div>
              <div className="ld-stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
