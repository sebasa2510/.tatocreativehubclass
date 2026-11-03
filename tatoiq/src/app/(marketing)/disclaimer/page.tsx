import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "The limits of TatoIQ's software, calculators, and automated assistant, and the scope of the professionals who prepare returns.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage eyebrow="Legal" title="Disclaimer" updated="January 2026">
      <section>
        <h2>General information, not professional advice</h2>
        <p>
          TatoIQ provides tax preparation software and general tax education. Content on this site,
          and answers produced by the <strong>Saggio</strong> assistant, are provided for general
          information only. They are not individualized tax, legal, accounting, or financial advice,
          and they are not a substitute for consultation with a qualified professional who knows
          your full circumstances.
        </p>
        <p>
          Reading this site or using the assistant does not create a preparer&ndash;client,
          accountant&ndash;client, or attorney&ndash;client relationship. That relationship begins only
          when a separate engagement is agreed in writing.
        </p>
      </section>

      <section>
        <h2>Accuracy, completeness, and currency</h2>
        <p>
          Tax law changes frequently, and its application depends on facts specific to each
          taxpayer. While we work to keep information current and to cite the Internal Revenue
          Service source behind an answer, we do not warrant that any content is accurate, complete,
          or up to date for your situation. Where Saggio has no source for an answer, it is designed
          to say so rather than guess — treat any such answer as unverified.
        </p>
      </section>

      <section>
        <h2>Calculators and estimates</h2>
        <p>
          Any figure produced by our calculators, estimators, or the guided return workflow is an{" "}
          <strong>estimate for planning and review purposes</strong> and may differ from the amount
          ultimately assessed or refunded by a taxing authority. Estimates are not a filed return,
          and they are not a guarantee of any refund, credit, deduction, or tax outcome.
        </p>
      </section>

      <section>
        <h2>Who prepares and signs your return</h2>
        <p>
          TatoIQ provides administrative matching and accounting technology. Where a return is
          prepared and signed, it is prepared and signed by a licensed independent professional.
          Automated output is a draft until that professional reviews and authorizes it.
        </p>
      </section>

      <section>
        <h2>The assistant&rsquo;s limits</h2>
        <p>
          Saggio is an automated system. It can be wrong, it can misunderstand a question, and it
          cannot assess your specific facts. It does not provide advice, does not represent you
          before the IRS, and escalates sensitive matters — among them audits, IRS notices,
          collections, suspected fraud or identity theft, and complex international reporting — to a
          human preparer. Do not rely on it, or on this site, as the sole basis for a filing
          position.
        </p>
      </section>

      <section>
        <h2>Demonstration build notice</h2>
        <p>
          This build is a demonstration. It uses <strong>synthetic data only</strong>, cannot
          transmit a return to the IRS or any state authority, and produces documents marked{" "}
          <strong>DRAFT — DO NOT FILE</strong> until a qualified preparer authorizes them.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, TatoIQ is not liable for any loss or damage arising
          from reliance on information, an estimate, or automated output obtained through this site
          or the assistant. This disclaimer is illustrative for a demonstration build and does not
          limit any liability that cannot lawfully be limited.
        </p>
      </section>

      <section>
        <h2>Related documents</h2>
        <ul>
          <li>
            <a href="/terms" className="font-medium text-teal-700 hover:underline">
              Terms of service
            </a>{" "}
            — the agreement that governs use of the service.
          </li>
          <li>
            <a href="/privacy" className="font-medium text-teal-700 hover:underline">
              Privacy policy
            </a>{" "}
            — what we collect and how it is protected.
          </li>
          <li>
            <a href="/disclosures" className="font-medium text-teal-700 hover:underline">
              Tax disclosures
            </a>{" "}
            — service scope, escalation, and refund disclosures.
          </li>
        </ul>
      </section>
    </LegalPage>
  );
}
