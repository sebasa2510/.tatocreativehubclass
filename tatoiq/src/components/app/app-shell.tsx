"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/site/logo";
import {
  IconBell,
  IconCalculator,
  IconChat,
  IconCheck,
  IconClock,
  IconFile,
  IconGrid,
  IconMenu,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@/components/icons";

import { leadsRouteAvailable } from "@/lib/flags.client";
import { signOut } from "@/lib/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconGrid },
  { href: "/return", label: "My Tax Return", icon: IconCalculator },
  { href: "/documents", label: "Documents", icon: IconFile },
  { href: "/tasks", label: "Tasks", icon: IconCheck },
  { href: "/messages", label: "Messages", icon: IconChat },
  { href: "/status", label: "Tax Status", icon: IconClock },
  { href: "/leads", label: "Leads", icon: IconUsers },
  { href: "/settings", label: "Account Settings", icon: IconSettings },
];

/**
 * The static export parks the /leads page and /api/leads, so linking to them
 * there is a guaranteed 404. The server build serves them. The flag is a
 * build-time constant, so this filter is resolved into the bundle.
 */
const VISIBLE_NAV = NAV.filter((item) => item.href !== "/leads" || leadsRouteAvailable);

const PAGE_TITLES: Record<string, string> = {
  "/leads": "Lead management",
  "/dashboard": "Dashboard",
  "/return": "My Tax Return",
  "/documents": "Documents",
  "/tasks": "Tasks",
  "/messages": "Messages",
  "/status": "Tax Status",
  "/settings": "Account Settings",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Initials for the avatar circle, e.g. "Jordan Rivera" → "JR". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Human wording for the session role.
 *
 * Deliberately not the raw enum: the sidebar is read by clients, and "SUPPORT"
 * as a job title is clearer than the database value behind it.
 */
function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Firm administrator",
    PREPARER: "Tax preparer",
    REVIEWER: "Reviewer",
    BOOKKEEPER: "Bookkeeper",
    SUPPORT: "Support",
    CLIENT: "Client workspace",
  };
  return labels[role] ?? "Client workspace";
}

function SidebarContent({
  pathname,
  onNavigate,
  user,
}: {
  pathname: string;
  onNavigate?: () => void;
  /** Signed-in identity, resolved on the server by the (app) layout. */
  user: { name: string; role: string };
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Logo variant="light" />
      </div>

      <div className="px-5">
        <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-navy-400">Return</p>
          <p className="mt-1 text-sm font-semibold text-white">Form 1040 · TY 2025</p>
          <p className="mt-1 text-[11px] text-teal-300">In preparer review</p>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-3" aria-label="Portal">
        {VISIBLE_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-navy-800 text-white ring-1 ring-inset ring-gold-400/30"
                  : "text-navy-300 hover:bg-navy-900 hover:text-white"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${active ? "text-gold-300" : "text-navy-400 group-hover:text-teal-300"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-800 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-500/20 text-sm font-semibold text-teal-200">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-navy-400">{roleLabel(user.role)}</p>
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="text-[11px] text-navy-400 transition hover:text-gold-300"
          >
            Sign out
          </button>
        </form>
        <Link
          href="/"
          className="mt-2 inline-block text-[11px] text-navy-400 transition hover:text-gold-300"
        >
          ← Back to tatoiq.com
        </Link>
      </div>
    </>
  );
}

export default function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  /** Resolved on the server by the (app) layout; absent in the static export. */
  user?: { name: string; role: string };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Workspace";

  // The static export has no session, so there is no name to show. A neutral
  // label is better than inventing a person, which is what the old hardcoded
  // "Jordan Rivera" did on every account.
  const identity = user ?? { name: "Signed in", role: "CLIENT" };

  // The portal is a small fixed set of destinations, so search filters the
  // navigation itself. Client-side only — nothing leaves the page.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return VISIBLE_NAV.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-950 md:flex">
        <SidebarContent pathname={pathname} user={identity} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-navy-950/60"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-950 shadow-2xl">
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} user={identity} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-navy-800 md:hidden"
            aria-label="Open navigation"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold text-navy-900">{title}</h1>
          </div>

          <div className="relative hidden items-center lg:flex">
            <label htmlFor="portal-search" className="sr-only">
              Search your return
            </label>
            <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-navy-400" />
            <input
              id="portal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your return…"
              autoComplete="off"
              aria-describedby="portal-search-results"
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy-800 placeholder:text-navy-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {query.trim() ? (
              <div
                id="portal-search-results"
                role="region"
                aria-label="Search results"
                className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                {results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-navy-500">
                    No pages match “{query.trim()}”.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {results.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setQuery("")}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-800 hover:bg-slate-50"
                        >
                          <item.icon className="h-4 w-4 text-navy-400" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="relative rounded-lg border border-slate-200 p-2 text-navy-700 transition hover:bg-slate-50"
            aria-label="Notifications (1 unread)"
          >
            <IconBell className="h-5 w-5" />
            <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold-500" />
          </button>

          <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-navy-500 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Demo build
          </span>

          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-900 text-sm font-semibold text-gold-300">
            JR
          </span>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
