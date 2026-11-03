import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Tax disclosures",
  description: "Required disclosures about TatoIQ's services and limitations.",
};

export default function DisclosuresPage() {
  return (
    <LegalPage eyebrow="Compliance" title="Tax disclosures" updated="January 2026">
      <section>
        <h2>Nature of the service</h2>
        <p>
          TatoIQ provides tax preparation tooling and general tax education. It does not provide
          individualized legal, financial, or tax advice, and it does not represent you before the
          IRS.
        </p>
      </section>

      <section>
        <h2>No direct IRS transmission in this build</h2>
        <p>
          This demonstration build cannot transmit returns to the IRS or any state authority. Any
          document produced is a draft for review and is watermarked{" "}
          <strong>DRAFT — DO NOT FILE</strong> until a qualified preparer authorizes it.
        </p>
      </section>

      <section>
        <h2>Assistance that cites its sources</h2>
        <p>
          Saggio retrieves short, paraphrased excerpts from IRS publications and cites the
          publication and section behind each answer. It is designed to say &ldquo;I don&rsquo;t
          have a source for that&rdquo; rather than invent a rule.
        </p>
      </section>

      <section>
        <h2>Escalation to a human preparer</h2>
        <p>
          Sensitive topics — audits, IRS notices, collections, suspected fraud, and complex
          international reporting — are escalated to a licensed preparer, and further automated
          calculation guidance is paused.
        </p>
      </section>

      <section>
        <h2>Third-party links and compensation</h2>
        <p>
          Links to IRS.gov and similar resources are provided for convenience. TatoIQ does not
          control third-party sites and, in this build, receives no compensation for linking to
          them.
        </p>
      </section>

      <section>
        <h2>Refund and acceptance</h2>
        <p>
          Filing status, acceptance, and refund status are tracked separately. Acceptance for
          processing never implies that a refund was or will be issued; the IRS processes refunds on
          its own schedule.
        </p>
      </section>
    </LegalPage>
  );
}
