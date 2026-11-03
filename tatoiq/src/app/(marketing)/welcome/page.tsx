import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconSparkle, IconShield } from "@/components/icons";
import { portalRouteAvailable } from "@/lib/flags.client";

export const metadata: Metadata = {
  title: "Welcome",
  description: "A welcome from Sebastian Alonso, creator of TatoIQ.",
};

const HIGHLIGHTS = [
  {
    title: "Clarity first",
    body: "Plain-language guidance from intake to a filing-ready draft, with a human in the loop.",
  },
  {
    title: "Grounded by design",
    body: "Saggio shows an IRS source when it has one, labels general guidance when it does not, and escalates sensitive questions.",
  },
  {
    title: "Built on trust",
    body: "Encrypted identifiers, role-limited access, and a timestamped history of every change.",
  },
];

export default function WelcomePage() {
  return (
    <section className="brand-mesh relative overflow-hidden bg-navy-950">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-navy-700 bg-navy-900/60 px-3.5 py-1.5 text-xs font-medium text-navy-200">
          <IconSparkle className="h-3.5 w-3.5 text-gold-300" />
          Welcome to TatoIQ
        </span>

        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Welcome.
        </h1>

        {/* Creator card */}
        <div className="mt-9 flex flex-col items-center gap-4 rounded-2xl border border-navy-800 bg-navy-900/60 px-7 py-5 sm:flex-row sm:text-left">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gold-400 font-display text-xl font-semibold text-navy-950">
            SA
          </span>
          <div>
            <p className="font-display text-2xl font-semibold text-white">Sebastian Alonso</p>
            <p className="mt-0.5 text-sm font-medium tracking-wide text-gold-300">
              Creator &amp; Developer of TatoIQ
            </p>
          </div>
        </div>

        <p className="mt-9 max-w-2xl text-lg leading-relaxed text-navy-200">
          I created TatoIQ to make tax preparation feel understandable and trustworthy — a portal
          where you always know what stage your return is in, what is waiting on you, and why every
          number is there. Thanks for stopping by.
        </p>

        <p className="mt-4 text-sm text-navy-300">— Sebastian Alonso, creator of TatoIQ</p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-5 py-3 text-sm font-semibold text-navy-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-300"
          >
            Explore the site <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={portalRouteAvailable ? "/dashboard" : "/contact"}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-900"
          >
            {portalRouteAvailable ? "Open the client portal" : "Talk to a preparer"}
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-navy-800 bg-navy-900/50 p-5">
              <IconShield className="h-5 w-5 text-teal-400" />
              <h2 className="mt-3 font-display text-base font-semibold text-white">{h.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-300">{h.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-navy-400">
          Designed &amp; built by Sebastian Alonso · Demo build with synthetic data only
        </p>
      </div>
    </section>
  );
}
