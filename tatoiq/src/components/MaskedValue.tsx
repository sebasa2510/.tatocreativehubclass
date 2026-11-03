"use client";

import { useState } from "react";

import { maskIdentifier } from "@/lib/sensitive";

/**
 * MaskedValue.tsx — renders a sensitive identifier (SSN, TIN, EIN, ITIN, account
 * or routing number) hidden by default.
 *
 * WHY THIS EXISTS
 * Tax identifiers must never be displayed unprompted. A dashboard that is
 * shoulder-surfed, screen-shared, or shown in a demo leaks a full identifier the
 * moment it renders one in plain text. Masking by default makes disclosure a
 * deliberate, per-field act by the person already at the keyboard.
 *
 * The classification and masking rules live in `@/lib/sensitive` so they are
 * unit-testable and shared; this component is only the interaction and markup.
 *
 * WHAT IT IS AND IS NOT
 *   - It is a DISPLAY control. It hides the value on screen.
 *   - It is NOT encryption and NOT an access control. For these synthetic
 *     fixtures the value still exists in the client bundle. Real identifiers must
 *     be stored encrypted and released only to an authorized role server-side
 *     (spec: sensitive identifiers encrypted, access limited by role). This
 *     component handles the screen; the server handles the data.
 *
 * ACCESSIBILITY
 *   The toggle is a real button with an accessible name that states the current
 *   state and what the action will do, `aria-pressed` carries the state so it is
 *   not conveyed by styling alone, and the value region is `aria-live="polite"`
 *   so a screen-reader user hears the change.
 */

export interface MaskedValueProps {
  /** The real identifier, e.g. "88-1234567". */
  value: string;
  /** Describes the identifier for the button's accessible name, e.g. "EIN". */
  label: string;
}

export default function MaskedValue({ value, label }: MaskedValueProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`font-mono ${revealed ? "text-navy-600" : "text-navy-400"}`}
        aria-live="polite"
      >
        {revealed ? value : maskIdentifier(value)}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-pressed={revealed}
        aria-label={
          revealed
            ? `Hide ${label}`
            : `Show full ${label} — currently showing only the last four digits`
        }
        className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-navy-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        {revealed ? "Hide" : "Show"}
      </button>
    </span>
  );
}
