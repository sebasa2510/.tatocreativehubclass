"use client";

import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Logo from "@/components/site/logo";
import { IconChevronDown, IconMenu, IconClose } from "@/components/icons";
import { portalRouteAvailable } from "@/lib/flags.client";

interface NavItem {
  label: string;
  href?: string;
  items?: Array<{ href: string; title: string; desc: string; external?: boolean }>;
}

const NAV: NavItem[] = [
  {
    label: "Services",
    items: [
      {
        href: "/#services",
        title: "Individuals & families",
        desc: "Form 1040 returns, reviewed end-to-end by a PTIN-verified preparer.",
      },
      {
        href: "/#services",
        title: "Self-employed & 1099",
        desc: "Schedule C, Schedule SE, and quarterly estimated payments.",
      },
      {
        href: "/#services",
        title: "Small business",
        desc: "Bookkeeping, payroll coordination, and entity returns.",
      },
      {
        href: "/#services",
        title: "IRS notice support",
        desc: "Understand a letter and respond with a preparer's help.",
      },
    ],
  },
  { label: "How it works", href: "/#how" },
  { label: "Saggio AI", href: "/#saggio" },
  { label: "Pricing", href: "/#pricing" },
  {
    label: "Resources",
    items: [
      {
        href: "/#resources",
        title: "Tax guides",
        desc: "Plain-language explainers, each citing an IRS source.",
      },
      {
        href: "/#resources",
        title: "Deadline calendar",
        desc: "Federal filing and estimated-payment due dates.",
      },
      {
        href: "https://www.irs.gov/wheres-my-refund",
        title: "Where's My Refund?",
        desc: "Check federal refund status on the official IRS tool.",
        external: true,
      },
      {
        href: "/disclosures",
        title: "Tax disclosures",
        desc: "How TatoIQ is compensated and what it does not do.",
      },
      {
        href: "/disclaimer",
        title: "Disclaimer",
        desc: "The limits of our tools and automated assistant.",
      },
    ],
  },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Compliance strip */}
      <div className="bg-navy-950 text-center text-[11px] tracking-wide text-navy-200">
        <p className="px-4 py-1.5">
          Tax year 2025 · DRAFT-only build · Direct IRS transmission is disabled
        </p>
      </div>

      <div className="border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) =>
              item.items ? (
                <DropdownMenu.Root key={item.label}>
                  <DropdownMenu.Trigger className="group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-navy-700 outline-none transition hover:bg-navy-50 hover:text-navy-900 data-[state=open]:bg-navy-50 data-[state=open]:text-navy-900">
                    {item.label}
                    <IconChevronDown className="h-3.5 w-3.5 text-navy-400 transition group-data-[state=open]:rotate-180" />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="start"
                      sideOffset={10}
                      className="z-50 w-80 rounded-xl border border-navy-100 bg-white p-2 shadow-xl shadow-navy-900/10"
                    >
                      {item.items.map((sub) =>
                        sub.external ? (
                          <DropdownMenu.Item key={sub.title} asChild>
                            <a
                              href={sub.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg px-3 py-2.5 outline-none transition hover:bg-navy-50 focus:bg-navy-50"
                            >
                              <span className="block text-sm font-medium text-navy-900">
                                {sub.title} ↗
                              </span>
                              <span className="mt-0.5 block text-xs text-navy-500">{sub.desc}</span>
                            </a>
                          </DropdownMenu.Item>
                        ) : (
                          <DropdownMenu.Item key={sub.title} asChild>
                            <Link
                              href={sub.href}
                              className="block rounded-lg px-3 py-2.5 outline-none transition hover:bg-navy-50 focus:bg-navy-50"
                            >
                              <span className="block text-sm font-medium text-navy-900">
                                {sub.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-navy-500">{sub.desc}</span>
                            </Link>
                          </DropdownMenu.Item>
                        ),
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : (
                <Link
                  key={item.label}
                  href={item.href ?? "/"}
                  className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 transition hover:bg-navy-50 hover:text-navy-900"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/contact"
              className="text-sm font-medium text-navy-700 transition hover:text-navy-900"
            >
              Contact
            </Link>
            {portalRouteAvailable ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-navy-700 transition hover:text-navy-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
                >
                  Open the portal
                </Link>
              </>
            ) : (
              <Link
                href="/contact"
                className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                Talk to a preparer
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg border border-navy-200 p-2 text-navy-800 lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-navy-100 bg-white lg:hidden">
            <div className="mx-auto max-w-6xl space-y-4 px-6 py-5">
              {NAV.map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm font-semibold text-navy-900"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        {item.label}
                      </p>
                      <div className="mt-2 space-y-2">
                        {item.items?.map((sub) => (
                          <Link
                            key={sub.title}
                            href={sub.href}
                            onClick={() => setOpen(false)}
                            className="block text-sm text-navy-700"
                          >
                            {sub.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-2 border-t border-navy-100 pt-4">
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-navy-700"
                >
                  Contact
                </Link>
                {portalRouteAvailable ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-navy-700"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Open the portal
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/contact"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Talk to a preparer
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
