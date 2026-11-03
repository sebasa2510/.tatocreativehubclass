import Link from "next/link";
import Logo from "@/components/site/logo";
import { portalRouteAvailable } from "@/lib/flags.client";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    heading: "Services",
    links: [
      { label: "Individuals & families", href: "/#services" },
      { label: "Self-employed & 1099", href: "/#services" },
      { label: "Small business", href: "/#services" },
      { label: "IRS notice support", href: "/#services" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Tax guides", href: "/#resources" },
      { label: "Deadline calendar", href: "/#resources" },
      { label: "Saggio AI assistant", href: "/#saggio" },
      { label: "Where's My Refund?", href: "https://www.irs.gov/wheres-my-refund", external: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Welcome", href: "/welcome" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
      ...(portalRouteAvailable
        ? [{ label: "Client portal", href: "/dashboard" }]
        : []),
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Tax disclosures", href: "/disclosures" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-200">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">
              Tax preparation and a client portal for individuals, self-employed professionals, and
              small-business owners — with Saggio, the assistant that shows its sources.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy-800 px-3 py-1 text-xs text-navy-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              PTIN-verified preparers
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-display text-sm font-semibold tracking-wide text-white">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-navy-300 transition hover:text-gold-300"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-navy-300 transition hover:text-gold-300"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-navy-800 pt-6">
          <p className="text-xs leading-relaxed text-navy-400">
            TatoIQ provides general tax education and preparation tooling. Nothing here is
            individualized professional advice, and it is not a promise of any refund or outcome.
            Output is a draft for your review — not a filed return. This demonstration build uses
            synthetic data only and does not transmit anything to the IRS.
          </p>
          <div className="mt-6 flex flex-col gap-3 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} TatoIQ · Created by Sebastian Alonso. All rights
              reserved.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/contact" className="transition hover:text-gold-300">
                Contact
              </Link>
              <Link href="/welcome" className="transition hover:text-gold-300">
                Welcome
              </Link>
              <Link href="/privacy" className="transition hover:text-gold-300">
                Privacy
              </Link>
              <Link href="/terms" className="transition hover:text-gold-300">
                Terms
              </Link>
              <Link href="/disclosures" className="transition hover:text-gold-300">
                Disclosures
              </Link>
              <Link href="/disclaimer" className="transition hover:text-gold-300">
                Disclaimer
              </Link>
              <a
                href="https://www.irs.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-gold-300"
              >
                IRS.gov ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
