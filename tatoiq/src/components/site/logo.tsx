import Link from "next/link";

/**
 * TatoIQ brand mark.
 *
 * Concept — "the return that balances":
 * The monogram is a single continuous stroke that reads three ways at once:
 *   1. a capital "T"  (Tato)
 *   2. a column of numbers on a ledger row (a tax form)
 *   3. a check mark landing on a total line (a verified filing)
 *
 * The horizontal bar is drawn as a subtle ledger rule, the vertical as the
 * stem, and the tail curls up into a check — gold, because gold is reserved
 * across the brand for "verified / emphasised", which is exactly what a
 * completed return is. Teal is the living accent on the balance nub.
 *
 * Rendered inline (no asset request) so it inherits `currentColor` and stays
 * crisp at every size.
 */
export function LogoMark({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const isLight = variant === "light";
  // Gold is legible on navy; on white it needs the 500-step to hold contrast.
  const gold = isLight ? "#e9c96d" : "#c99a2e";
  const teal = isLight ? "#6ed6d1" : "#0f827f";
  const rule = isLight ? "rgba(233,201,109,0.45)" : "rgba(201,154,46,0.35)";

  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Ledger rules — two faint lines that make the tile read as a form. */}
      <g stroke={rule} strokeWidth="1" strokeLinecap="round">
        <line x1="9" y1="30.5" x2="26" y2="30.5" />
        <line x1="9" y1="34.5" x2="20" y2="34.5" />
      </g>

      {/* The T stem: a single stroke that runs down and kicks up into a check. */}
      <path
        d="M9.5 11.5 H30.5 M20 11.5 V26.5 L24.75 31.25 L30.5 24.5"
        fill="none"
        stroke={gold}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Balance nub — teal dot on the crossbar, the "IQ" spark. */}
      <circle cx="30.5" cy="11.5" r="2.6" fill={teal} />
      <circle cx="30.5" cy="11.5" r="1.05" fill={isLight ? "#0b1a2e" : "#ffffff"} />
    </svg>
  );
}

export default function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const wordmark = variant === "light" ? "text-white" : "text-navy-900";
  const mark =
    variant === "light"
      ? "bg-white/10 ring-1 ring-inset ring-gold-400/40"
      : "bg-navy-900 ring-1 ring-inset ring-gold-500/30";

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="TatoIQ home">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${mark}`}>
        <LogoMark variant={variant} className="h-[26px] w-[26px]" />
      </span>
      <span className={`font-display text-xl font-semibold tracking-tight ${wordmark}`}>
        TatoIQ
      </span>
    </Link>
  );
}
