"use client";

import { useState } from "react";
import { ApplicationsTable, type OrganizerRow } from "@/components/organizer/applications-table";
import { DecisionBoard } from "@/components/organizer/decision-board";

// C10: client-side toggle between the table and the kanban board. Both views
// read the same server-fetched rows, so switching is free — no second query,
// no route change. The choice is local UI state, not a URL, which keeps the
// back button behaviour of /organizer unchanged.
export function OrganizerViews({ applications }: { applications: OrganizerRow[] }) {
  const [view, setView] = useState<"table" | "board">("table");

  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold ${
      active ? "bg-berkeley-blue text-white" : "bg-white text-berkeley-blue hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => setView("table")} className={tabCls(view === "table")}>
          Table
        </button>
        <button onClick={() => setView("board")} className={tabCls(view === "board")}>
          Board
        </button>
      </div>

      {view === "table" ? (
        <ApplicationsTable applications={applications} />
      ) : (
        <DecisionBoard applications={applications} />
      )}
    </div>
  );
}
