const PORTRAITS = [
  { src: "/images/landing/legend-ronaldo.jpg", alt: "Cristiano Ronaldo" },
  { src: "/images/landing/legend-messi.jpg", alt: "Lionel Messi" },
  { src: "/images/landing/legend-pele.jpg", alt: "Pele" },
  { src: "/images/landing/legend-maradona.jpg", alt: "Diego Maradona" },
];

export function LandingHeroVisual() {
  return (
    <div className="ld-visual ld-rise ld-delay-4">
      <div className="ld-visual__glow" aria-hidden="true" />

      <div className="ld-portraits">
        {PORTRAITS.map((p) => (
          <figure key={p.alt} className="ld-portrait">
            <img
              src={p.src}
              alt={p.alt}
              width={900}
              height={1600}
              loading="eager"
              decoding="async"
            />
          </figure>
        ))}
      </div>

      <div className="ld-trophy">
        <img
          src="/images/landing/prc-dor-trophy.png"
          alt="The PRC D'OR golden football trophy on a black marble pedestal"
          width={1295}
          height={1214}
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
}
