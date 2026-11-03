import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern your use of TatoIQ.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of service" updated="January 2026">
      <section>
        <h2>Acceptance of these terms</h2>
        <p>
          By using TatoIQ you agree to these terms. If you use the service on behalf of an
          organization, you confirm you are authorized to accept them for that organization.
        </p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          TatoIQ provides tax preparation tooling and a client portal, including guided intake,
          document review, a deterministic calculation engine, and the Saggio assistant. Features
          may change as the service evolves.
        </p>
      </section>

      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Provide accurate and complete information, and review every extracted value.</li>
          <li>Keep your credentials secure and use a second factor where available.</li>
          <li>Only upload documents you are authorized to share.</li>
        </ul>
      </section>

      <section>
        <h2>Not professional advice</h2>
        <p>
          Content in the service, including Saggio&rsquo;s answers, is general tax education. It is
          not individualized professional advice, and it does not create a preparer-client
          relationship on its own.
        </p>
      </section>

      <section>
        <h2>No guarantee of outcome</h2>
        <p>
          Calculations are estimates produced by versioned rules for a given tax year. Using the
          service is not a promise of any refund, credit, or result.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, TatoIQ is not liable for indirect or consequential losses
          arising from use of the service. Nothing in these terms limits rights that cannot be
          limited.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms and will revise the date above. Continued use after an update
          means you accept the revised terms.
        </p>
      </section>
    </LegalPage>
  );
}
