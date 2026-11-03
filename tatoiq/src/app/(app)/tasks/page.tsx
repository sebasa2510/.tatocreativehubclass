import type { Metadata } from "next";
import TaskList from "@/components/TaskList";

export const metadata: Metadata = {
  title: "Tasks",
  robots: { index: false, follow: false },
};

export default function TasksPage() {
  return <TaskList />;
}
