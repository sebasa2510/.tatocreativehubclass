import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/site/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with TatoIQ to discuss your tax preparation needs.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Contact
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            Let&apos;s talk about your taxes
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-navy-600">
            Tell us a bit about your situation and we&apos;ll get back to you to discuss how TatoIQ
            can help.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <ContactForm />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-5">
            <h2 className="text-sm font-semibold text-navy-900">What happens next</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-navy-600">
              <li>We review the details you send.</li>
              <li>We reply by email to clarify anything missing.</li>
              <li>If it is a fit, we schedule a time to talk through the work.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-navy-100 bg-white p-5">
            <h2 className="text-sm font-semibold text-navy-900">Before you send</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              Please do not include your Social Security number, EIN, bank account, or card numbers
              in this form. We will ask for sensitive documents through a secure channel if needed.
            </p>
            <Link
              href="/privacy"
              className="mt-3 inline-flex text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
            >
              Read the privacy notice
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
