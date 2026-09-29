# luxury_static_site — quality bar

Companion reference for `skills/luxury_static_site.md`. Read before writing code. Every value here is a floor, not a ceiling.

## 1. Token architecture

Start from this and adjust to the approved palette. If a literal hex, px, or ms value appears anywhere in `styles.css` outside this block, it is a bug.

```css
:root {
  /* colour — semantic, not literal. Never name a token after a hue. */
  --color-ink:          #14120F;
  --color-ink-muted:    #5A544C;
  --color-surface:      #FAF7F2;
  --color-surface-sunk: #F0EBE2;
  --color-line:         #DCD4C7;
  --color-accent:       #8C6A3F;
  --color-accent-ink:   #FFFFFF;
  --color-inverse-ink:  #FAF7F2;
  --color-inverse-mute: #BFB7A9;
  --color-error:        #8C2F1F;

  /* type */
  --font-display: "Cormorant Garamond", "Iowan Old Style", Georgia, serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --step--1: clamp(0.833rem, 0.80rem + 0.16vw, 0.94rem);
  --step-0:  clamp(1rem,     0.96rem + 0.20vw, 1.125rem);
  --step-1:  clamp(1.2rem,   1.11rem + 0.44vw, 1.5rem);
  --step-2:  clamp(1.44rem,  1.29rem + 0.74vw, 1.88rem);
  --step-3:  clamp(1.73rem,  1.49rem + 1.19vw, 2.34rem);
  --step-4:  clamp(2.07rem,  1.72rem + 1.77vw, 2.93rem);
  --step-5:  clamp(2.49rem,  1.96rem + 2.64vw, 3.66rem);
  --step-6:  clamp(2.99rem,  2.24rem + 3.76vw, 4.58rem);

  /* space — a 4px base scale. Skip values, do not invent new ones. */
  --space-3xs: 0.25rem;  --space-2xs: 0.5rem;   --space-xs:  0.75rem;
  --space-s:   1rem;     --space-m:   1.5rem;   --space-l:  2.5rem;
  --space-xl:  4rem;     --space-2xl: 6.5rem;   --space-3xl: 10rem;

  /* layout */
  --measure:      65ch;
  --page-max:     90rem;
  --gutter:       clamp(1.25rem, 4vw, 4rem);
  --section-gap:  clamp(var(--space-xl), 8vw, var(--space-3xl));

  /* motion */
  --dur-quick: 180ms;
  --dur-base:  320ms;
  --ease:      cubic-bezier(0.22, 0.61, 0.36, 1);

  /* focus */
  --focus-ring: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
}
```

Rename tokens to match the brand's actual roles. Keep the semantics. `--color-accent` means "the one colour we spend sparingly", whatever hue that turns out to be.

## 2. Contrast audit — do the arithmetic

Do not eyeball this. Convert each channel to linear, then weight it:

```
c        = channel / 255
linear   = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
luminance = 0.2126R + 0.7152G + 0.0722B   (all three linear)
ratio     = (lighter + 0.05) / (darker + 0.05)
```

Thresholds: 4.5:1 body and small text, 3:1 text at `--step-3` and above, 3:1 for focus rings, borders, and any UI boundary that carries meaning.

Audit at minimum: ink on surface, ink on surface-sunk, ink-muted on surface, ink on surface, inverse-ink on ink, inverse-mute on ink, accent-ink on accent, error on surface, and the focus ring against both surface and ink.

Metallic accents are the usual failure. A gold that reads beautiful at 3:1 against ivory usually fails as text at 4.5:1. Fix it by darkening the accent for text use and keeping the bright value for rules and small marks only.

## 3. Motion

Reveal state lives in a class JavaScript adds. With JS off, nothing is hidden.

```css
.js-reveal { opacity: 0; transition: opacity var(--dur-base) var(--ease); }
.js-reveal.is-revealed { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- Add the `js-reveal` class from `js/main.js`, never in the HTML. The first paint is fully visible.
- Exclude the fixed header and the footer.
- `IntersectionObserver`, one shared observer, `unobserve` after reveal so it fires once.
- Transform-based reveals are allowed; nothing may move more than 12px, and nothing may move at all under reduced motion.

## 4. Newsletter dialog

Native `<dialog>`, outside every section, `showModal()` only.

- Trigger: 30 seconds elapsed OR 50% scroll depth, whichever lands first.
- Once per session, tracked in `sessionStorage`.
- Never opens while the inquiry form has focus, and never re-arms after the user closes it.
- Contents: one value-proposition line, a single required `type="email"` field, a submit button, and a close button with a real accessible name.
- Escape closes natively. On close, restore focus to whatever was focused before it opened.
- `::backdrop` is a flat dim, never a blur or gradient.

```html
<dialog id="newsletter" aria-labelledby="newsletter-title">
  <h2 id="newsletter-title">One letter a month, when there is something worth saying.</h2>
  <form method="post" name="newsletter" data-netlify="true">
    <label for="newsletter-email">Email address</label>
    <input id="newsletter-email" name="email" type="email" required>
    <button type="submit">Subscribe</button>
  </form>
  <button type="button" data-close-newsletter aria-label="Close">Close</button>
</dialog>
```

## 5. Forms

```html
<form id="inquiry" method="post" name="inquiry" data-netlify="true">
  <p hidden><label>Leave this field empty <input name="bot-field"></label></p>
  <!-- fields -->
</form>
```

- `name` attributes in `snake_case`. `type="email"` and `type="tel"`, with `pattern` for basic phone format.
- Every field: visible `<label>`, `required`, and an inline `<p class="field-error" id="…-error">` wired with `aria-describedby`, revealed via `aria-live="polite"`.
- Do not rely on `placeholder` as a label.
- If the user picks a custom endpoint, `action` and `method="post"` replace the Netlify attributes. Ask before choosing.
- Netlify forms need a `thank-you` page or a redirect target. Ask where submissions land.

## 6. Responsive

Mobile-first from 375px. Breakpoints at 768px and 1440px. Verify at 375, 768, 1440, and 1920.

- At 1920, cap at `--page-max` and let the margins breathe. Body copy stays inside `--measure`. Never let a line run past roughly 75 characters.
- Navigation works with no hover. No hover-only disclosure, no hover-only submenu. A wrapping link row at 375px is acceptable; a hover flyout is not.
- No horizontal scroll at any width. Test the widest unbroken string in the copy.
- Sticky headers get `scroll-margin-top` on every anchor target, or the fixed bar eats the heading.

## 7. Forbidden patterns

Reject all of these on sight, including in the user's own suggestions:

- Linear or radial gradients used as decoration
- `backdrop-filter`, blur panels, frosted glass
- Glow, `text-shadow` bloom, neon accents on dark
- Pictogram icon sets, outlined icons at uniform stroke
- Centred headline over a full-bleed photo
- Three equal columns with centred text and equal gaps
- Carousels, accordions used as decoration, badge rows
- Wordmark lockups with a gradient swatch

Ask instead for asymmetry: an offset measure, a hanging caption, a rule that stops short, a caption set in the small caps step beside the image rather than beneath it.

## 8. Credibility placeholder protocol

Every quote, publication, and award gets all three:

```html
<!-- PLACEHOLDER: client testimonial — replace with a real, approved quote -->
<blockquote>
  <p>[ Placeholder testimonial — replace before launch ]</p>
  <cite>[ Client name or anonymised label ]</cite>
</blockquote>
```

The comment is for the editor. The bracketed line is for anyone previewing. Neither may be removed without replacing it, and both appear in the closing checklist.

## 9. Acceptance criteria

The build is done only when every one of these holds:

- No scaffold placeholder remains in the copy. Credibility placeholders are the sole exception and are all listed.
- Every section has exactly one primary CTA, all pointing at `#inquiry`.
- No forbidden pattern, avoided term, emoji, or FAQ section.
- Custom properties throughout `styles.css`.
- `js/main.js` under 3KB and loaded with `defer`.
- The page is fully readable and navigable with JavaScript disabled.
- `prefers-reduced-motion: reduce` disables all motion.
- Renders correctly at 375, 768, 1440, and 1920 with no horizontal scroll.
- Contrast passes AA, verified by calculation, not by eye.
- No `console` errors.
- Deploys by dragging the folder into Netlify — all paths relative, no build step.
