/**
 * Isotipo de marca -- versión final entregada por el diseñador (reemplaza el
 * SVG hecho a mano del moodboard): una M fluida en degradé violeta Morphy
 * (#7557E8) a mint (#5DD6A8), pasando por un azul intermedio (#6385E8).
 */
export function MorphyLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size * 320) / 512}
      viewBox="0 0 512 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Morphy"
    >
      <defs>
        <linearGradient id="morphyGradient" x1="70" y1="230" x2="445" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7557E8" />
          <stop offset="0.5" stopColor="#6385E8" />
          <stop offset="1" stopColor="#5DD6A8" />
        </linearGradient>
      </defs>
      <path
        d="M82 238 C120 165 150 112 197 158 C231 191 249 218 286 171 C316 133 339 72 378 62 C418 51 437 80 443 118 C449 158 446 196 447 220"
        fill="none"
        stroke="url(#morphyGradient)"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
