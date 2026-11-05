const PARTICLES = [
  { left: "9%", bottom: "16%", size: 3, dur: 9.5, delay: 0.4 },
  { left: "24%", bottom: "10%", size: 4, dur: 8.4, delay: 1.4 },
  { left: "38%", bottom: "27%", size: 2, dur: 12, delay: 2.6 },
  { left: "52%", bottom: "13%", size: 3, dur: 9.8, delay: 0.9 },
  { left: "66%", bottom: "30%", size: 2, dur: 11.6, delay: 3.1 },
  { left: "78%", bottom: "17%", size: 4, dur: 8.8, delay: 1.8 },
  { left: "88%", bottom: "25%", size: 3, dur: 10.2, delay: 2.9 },
  { left: "31%", bottom: "34%", size: 2, dur: 10.6, delay: 3.6 },
  { left: "71%", bottom: "9%", size: 3, dur: 9.2, delay: 0.6 },
];

export function LandingAtmosphere() {
  return (
    <div className="ld-atmos" aria-hidden="true">
      <div className="ld-atmos__lights" />
      <div className="ld-atmos__beam ld-atmos__beam--l" />
      <div className="ld-atmos__beam ld-atmos__beam--r" />
      <div className="ld-atmos__haze ld-atmos__haze--1" />
      <div className="ld-atmos__haze ld-atmos__haze--2" />
      <div className="ld-atmos__haze ld-atmos__haze--3" />

      <svg
        className="ld-atmos__fabric"
        viewBox="0 0 1440 340"
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <linearGradient id="ld-fabric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#180f05" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
          <linearGradient id="ld-fabric-fold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(240, 185, 11, 0.28)" />
            <stop offset="100%" stopColor="rgba(240, 185, 11, 0)" />
          </linearGradient>
        </defs>
        <path
          d="M0 96 Q 240 40 480 88 T 960 84 T 1440 76 L1440 340 L0 340 Z"
          fill="url(#ld-fabric)"
        />
        <path
          d="M0 96 Q 240 40 480 88 T 960 84 T 1440 76"
          fill="none"
          stroke="url(#ld-fabric-fold)"
          strokeWidth="2"
        />
        <path
          d="M180 340 Q 260 190 340 120 M540 340 Q 600 200 660 108 M900 340 Q 950 210 1010 116 M1230 340 Q 1270 220 1320 128"
          fill="none"
          stroke="rgba(212, 160, 23, 0.09)"
          strokeWidth="26"
          strokeLinecap="round"
        />
      </svg>

      <div className="ld-atmos__vignette" />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ld-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
