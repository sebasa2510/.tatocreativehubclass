import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How TatoIQ collects, uses, protects, and retains your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="January 2026">
      <section>
        <h2>Our approach</h2>
        <p>
          TatoIQ is built for a sensitive category of data. We collect the minimum needed to prepare
          your return, we encrypt sensitive identifiers, and we separate the data you must confirm
          from anything used to calculate a result.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>Account details such as your name, email, and role.</li>
          <li>Tax information you enter or that is extracted from documents you upload.</li>
          <li>Documents you provide, and the extraction results you confirm or reject.</li>
          <li>Messages exchanged with your assigned preparer.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          Your information is used to prepare, review, and (where permitted) file your return, to
          respond to your questions, and to meet legal, tax, and recordkeeping obligations. We do not
          sell personal information.
        </p>
      </section>

      <section>
        <h2>Use of automated assistance</h2>
        <p>
          Saggio, our assistant, provides general tax education. Personal identifiers are redacted
          before any text is sent to a model provider, and only redacted text plus retrieved IRS
          passages are transmitted. If no provider is configured, no network call is made.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Sensitive identifiers are encrypted, access is limited by role, and every material change
          to a return status is recorded with an actor and a timestamp.
        </p>
      </section>

      <section>
        <h2>Retention and your choices</h2>
        <p>
          Records are retained according to IRS and firm policy. You may request an export of your
          data or its deletion, subject to records we are legally required to keep.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to your preparer through portal messages, or to
          privacy@tatoiq.example.
        </p>
      </section>
    </LegalPage>
  );
}
