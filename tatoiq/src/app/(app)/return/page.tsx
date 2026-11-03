import type { Metadata } from "next";
import ReturnQuestionnaire from "@/components/ReturnQuestionnaire";

export const metadata: Metadata = {
  title: "My Tax Return",
  robots: { index: false, follow: false },
};

export default function ReturnPage() {
  return <ReturnQuestionnaire />;
}
