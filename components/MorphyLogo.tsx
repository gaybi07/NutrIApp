/**
 * Isotipo de marca -- Concepto 02 del moodboard ("Movimiento / Evolución"):
 * una M fluida y dinámica, trazada en degradé violeta Morphy (#7557E8) a
 * mint (#5DD6A8). Se armó en SVG a partir de la captura del moodboard (no
 * hay todavía un archivo de logo exportado) -- si en algún momento llega el
 * archivo final del diseñador, este componente es el único lugar a
 * reemplazar.
 */
export function MorphyLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Morphy"
    >
      <defs>
        <linearGradient id="morphy-mark-gradient" x1="4" y1="10" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7557E8" />
          <stop offset="1" stopColor="#5DD6A8" />
        </linearGradient>
      </defs>
      <path
        d="M6 34V14C6 12 8 11 9.5 12.3L18 20C19.2 21 20.8 21 22 20L24 18.2C25.2 17.1 27 17.1 28.2 18.2L30 20C31.2 21 32.8 21 34 20L38.5 15.8C40 14.4 42 15.4 42 17.4V34"
        stroke="url(#morphy-mark-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
