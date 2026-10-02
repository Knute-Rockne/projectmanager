import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PhaseBadge, RagBadge } from "./badges";
import type { Project } from "@/lib/dpm/types";
import { useDpm } from "@/lib/dpm/store";

export function ProjectHeader({ project }: { project: Project }) {
  const pid = { projectId: project.id };
  const updateProject = useDpm((s) => s.updateProject);

  return (
    <div className="mb-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold tracking-tight">{project.code}</h1>
          <RagBadge status={project.status} />
          <PhaseBadge phase={project.phase} />
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {project.name}
          <span className="text-subtle">
            {" "}
            · {project.location} · {project.client}
          </span>
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <MetaEdit
          label="PM"
          value={project.pm}
          onCommit={(pm) => void updateProject(project.id, { pm })}
        />
        <MetaEdit
          label="% complete"
          type="number"
          min={0}
          max={100}
          value={String(project.percentComplete)}
          onCommit={(raw) => {
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            void updateProject(project.id, { percentComplete: Math.min(100, Math.max(0, Math.round(n))) });
          }}
        />
        <MetaEdit
          label="Start"
          type="date"
          value={project.start.slice(0, 10)}
          onCommit={(start) => {
            if (start) void updateProject(project.id, { start });
          }}
        />
        <MetaEdit
          label="Finish"
          type="date"
          value={project.finish.slice(0, 10)}
          onCommit={(finish) => {
            if (finish) void updateProject(project.id, { finish });
          }}
        />
      </dl>
      <div className="mt-3 flex gap-1 overflow-x-auto border-b border-border">
        <Link
          to="/projects/$projectId"
          params={pid}
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-fg"
          activeProps={{ className: "border-steel text-fg font-medium" }}
          activeOptions={{ exact: true }}
        >
          Overview
        </Link>
        <Link
          to="/projects/$projectId/documents"
          params={pid}
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-fg"
          activeProps={{ className: "border-steel text-fg font-medium" }}
        >
          Documents
        </Link>
        <Link
          to="/projects/$projectId/schedule"
          params={pid}
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-fg"
          activeProps={{ className: "border-steel text-fg font-medium" }}
        >
          Schedule & Risk
        </Link>
        <Link
          to="/projects/$projectId/cost"
          params={pid}
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-fg"
          activeProps={{ className: "border-steel text-fg font-medium" }}
        >
          Cost Control
        </Link>
        <Link
          to="/projects/$projectId/actions"
          params={pid}
          className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted hover:text-fg"
          activeProps={{ className: "border-steel text-fg font-medium" }}
        >
          Actions & Emails
        </Link>
      </div>
    </div>
  );
}

function MetaEdit({
  label,
  value,
  onCommit,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  type?: "text" | "number" | "date";
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  function commit() {
    if (draft !== value) onCommit(draft);
  }

  return (
    <div className="bg-surface px-3 py-2">
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd>
        <input
          type={type}
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="mt-0.5 w-full bg-transparent font-medium tabular-nums outline-none focus:ring-1 focus:ring-steel rounded-sm"
        />
      </dd>
    </div>
  );
}
