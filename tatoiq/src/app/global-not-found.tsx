import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";
import { Fraunces, Geist } from "next/font/google";
import { portalRouteAvailable } from "@/lib/flags.client";

/**
 * global-not-found.tsx — the app-wide 404.
 *
 * WHY THIS FILE AND NOT `not-found.tsx`
 * `not-found.tsx` only renders when a route segment calls `notFound()`. For a
 * URL that matches no route at all — and especially for the static export's
 * `404.html`, which is what Firebase serves for unknown paths — Next requires
 * `global-not-found.tsx`. It bypasses the root layout, so it must return a full
 * HTML document and import its own styles and fonts.
 *
 * This is what turns the old "soft 404" (every unknown path rendering the
 * homepage with HTTP 200) into a real 404 page.
 */

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Page not found · TatoIQ",
  description: "The page you requested does not exist.",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-navy-900">
        <main className="brand-mesh flex min-h-screen items-center justify-center bg-navy-950 px-6 py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-300">
              404
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              We couldn&rsquo;t find that page.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-navy-200">
              The link may be out of date, or the page may have moved. Nothing was lost.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={portalRouteAvailable ? "/dashboard" : "/contact"}
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-navy-100"
              >
                {portalRouteAvailable ? "Go to your dashboard" : "Talk to a preparer"}
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-navy-700 px-5 py-2.5 text-sm font-semibold text-navy-100 transition hover:bg-navy-900"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
