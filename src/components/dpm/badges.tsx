import { Badge } from "@/components/ui/badge";
import type { ActivityFlag, Phase, RagStatus } from "@/lib/dpm/types";

export function RagBadge({ status }: { status: RagStatus }) {
  const tone = status === "Green" ? "green" : status === "Yellow" ? "yellow" : "red";
  return <Badge tone={tone}>{status}</Badge>;
}

export function PhaseBadge({ phase }: { phase: Phase }) {
  return <Badge tone="outline">{phase}</Badge>;
}

const FLAG_LABEL: Record<ActivityFlag, { label: string; tone: "red" | "yellow" | "gray" | "default" }> = {
  critical: { label: "Critical", tone: "red" },
  "near-critical": { label: "Near-critical", tone: "yellow" },
  "at-risk": { label: "At risk", tone: "yellow" },
  overdue: { label: "Overdue", tone: "red" },
  "should-have-started": { label: "Should have started", tone: "yellow" },
  "open-end": { label: "Open end", tone: "gray" },
  "finish-soon": { label: "≤14d", tone: "default" },
  "inflated-remaining": { label: "RD inflated", tone: "yellow" },
};

export function FlagChips({ flags }: { flags: ActivityFlag[] }) {
  if (!flags.length) return <span className="text-subtle">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} tone={FLAG_LABEL[f].tone}>
          {FLAG_LABEL[f].label}
        </Badge>
      ))}
    </span>
  );
}

export function HealthDot({ tone }: { tone: "ok" | "watch" | "bad" }) {
  const cls = tone === "ok" ? "bg-ontrack" : tone === "watch" ? "bg-risk" : "bg-critical";
  return <span className={`inline-block size-2 rounded-full ${cls}`} />;
}
