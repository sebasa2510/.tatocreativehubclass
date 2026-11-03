"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { IconChevronDown } from "@/components/icons";

const FAQS = [
  {
    q: "Who prepares my return?",
    a: "A preparer holding a valid PTIN reviews your return end-to-end. The portal shows who is assigned, their credential, and the moment your draft moves into review.",
  },
  {
    q: "Is Saggio giving me professional advice?",
    a: "No. Saggio provides general tax education and cites IRS sources. It explains terms and flags inconsistencies, but it does not give individualized advice and will escalate sensitive topics to a human preparer.",
  },
  {
    q: "How does TatoIQ handle my documents?",
    a: "Uploads pass through a scan step, then every extracted value is shown to you for confirmation before it can enter your return. Sensitive identifiers are encrypted at rest.",
  },
  {
    q: "Can TatoIQ file directly with the IRS?",
    a: "This demonstration build cannot. Direct IRS transmission is disabled here, and generated drafts are watermarked DRAFT — DO NOT FILE until you authorize them.",
  },
  {
    q: "How is my data used with AI models?",
    a: "Personal identifiers are redacted before any text reaches a model provider, and only redacted text plus retrieved IRS passages are ever sent. If no provider is configured, no network call happens at all.",
  },
  {
    q: "Is a refund promised when my return is accepted?",
    a: "No. Filing status, acceptance, and refund status are tracked separately. Acceptance never implies that a refund was or will be issued — the IRS processes refunds on its own schedule.",
  },
];

export default function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="divide-y divide-navy-100">
      {FAQS.map((item, i) => (
        <Accordion.Item key={item.q} value={`item-${i}`} className="group">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-medium text-navy-900 outline-none transition hover:text-navy-600">
              {item.q}
              <IconChevronDown className="h-5 w-5 shrink-0 text-navy-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden pb-5 text-sm leading-relaxed text-navy-600 data-[state=closed]:hidden">
            {item.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
