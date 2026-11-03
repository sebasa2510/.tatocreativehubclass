import type { Metadata } from "next";
import DocumentsReview from "@/components/DocumentsReview";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

export default function DocumentsPage() {
  return <DocumentsReview />;
}
