import { parseLooseDate } from "@/lib/utils";
import { ganttRange } from "@/lib/dpm/schedule";
import type { Activity } from "@/lib/dpm/types";

export function SimpleGantt({ activities }: { activities: Activity[] }) {
  const rows = activities.slice(0, 40);
  if (!rows.length) {
    return <p className="text-sm text-muted">No activities in this filter to plot.</p>;
  }
  const { min, max } = ganttRange(rows);
  const span = Math.max(1, max.getTime() - min.getTime());
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="min-w-[640px] p-3">
        {rows.map((a) => {
          const s = parseLooseDate(a.start) ?? min;
          const f = parseLooseDate(a.finish) ?? s;
          const left = ((s.getTime() - min.getTime()) / span) * 100;
          const width = Math.max(1.2, ((f.getTime() - s.getTime()) / span) * 100);
          const color = a.flags.includes("critical")
            ? "bg-critical"
            : a.flags.includes("at-risk")
              ? "bg-risk"
              : a.status === "Completed"
                ? "bg-complete"
                : "bg-steel";
          return (
            <div key={a.id} className="mb-1.5 grid grid-cols-[160px_1fr] items-center gap-2">
              <div className="truncate font-mono text-[11px] text-muted" title={a.name}>
                {a.activityId}
              </div>
              <div className="relative h-5 rounded-sm bg-canvas">
                <div
                  className={`absolute top-0.5 h-4 rounded-sm ${color}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${a.name} ${a.start ?? ""} – ${a.finish ?? ""}`}
                />
              </div>
            </div>
          );
        })}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-subtle">
          <span>{min.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span>{max.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}
