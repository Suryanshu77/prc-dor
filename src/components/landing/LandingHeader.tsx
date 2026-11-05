import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

function LaurelEmblem() {
  return (
    <svg
      className="ld-emblem"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="currentColor"
      >
        <path d="M24 45 C 11 39 6 25 12 11" fill="none" />
        <path d="M24 45 C 37 39 42 25 36 11" fill="none" />
        <ellipse
          cx="11"
          cy="37"
          rx="4.6"
          ry="2.6"
          transform="rotate(-46 11 37)"
        />
        <ellipse
          cx="8.4"
          cy="27"
          rx="4.6"
          ry="2.6"
          transform="rotate(-18 8.4 27)"
        />
        <ellipse
          cx="10.2"
          cy="17"
          rx="4.4"
          ry="2.5"
          transform="rotate(14 10.2 17)"
        />
        <ellipse
          cx="15.6"
          cy="10.4"
          rx="4.2"
          ry="2.4"
          transform="rotate(48 15.6 10.4)"
        />
        <ellipse
          cx="37"
          cy="37"
          rx="4.6"
          ry="2.6"
          transform="rotate(46 37 37)"
        />
        <ellipse
          cx="39.6"
          cy="27"
          rx="4.6"
          ry="2.6"
          transform="rotate(18 39.6 27)"
        />
        <ellipse
          cx="37.8"
          cy="17"
          rx="4.4"
          ry="2.5"
          transform="rotate(-14 37.8 17)"
        />
        <ellipse
          cx="32.4"
          cy="10.4"
          rx="4.2"
          ry="2.4"
          transform="rotate(-48 32.4 10.4)"
        />
      </g>
      <circle
        cx="24"
        cy="24"
        r="8.5"
        fill="rgba(20, 15, 6, 0.55)"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M24 19.4 L27.7 22.1 L26.3 26.5 L21.7 26.5 L20.3 22.1 Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function LandingHeader() {
  return (
    <header className="ld-header">
      <Link to="/" className="ld-brand" aria-label="PRC D'OR home">
        <LaurelEmblem />
        <span>
          <span className="ld-brand__name">PRC D&apos;OR</span>
          <span className="ld-brand__est">Est. 2024</span>
        </span>
      </Link>

      <Link to="/auth" search={{ mode: "login" }} className="ld-signin">
        Sign in
        <ArrowRight />
      </Link>
    </header>
  );
}
