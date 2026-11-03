"use client";

import { useState } from "react";
import { DEMO_RETURN } from "@/lib/demo/data";
import { shortDate } from "@/lib/format";

export default function TaskList() {
  const [tasks, setTasks] = useState(DEMO_RETURN.tasks);
  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
        Tasks
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Deadlines and requests from your preparer. Checking a task marks it complete for your
        workspace.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-navy-800">Progress</span>
          <span className="text-navy-500">
            {done}/{tasks.length} complete
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>

        <ul className="mt-5 space-y-3">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-lg border border-slate-100 p-4"
            >
              <input
                id={t.id}
                type="checkbox"
                checked={t.completed}
                onChange={() =>
                  setTasks((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)),
                  )
                }
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <div className="flex-1">
                <label
                  htmlFor={t.id}
                  className={`block text-sm ${
                    t.completed ? "text-navy-400 line-through" : "text-navy-800"
                  }`}
                >
                  {t.title}
                </label>
                <p className="text-xs text-navy-500">Due {shortDate(t.dueDate)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
