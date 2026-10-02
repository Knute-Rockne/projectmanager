import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDpm } from "@/lib/dpm/store";
import { ACTION_STATUSES, SEVERITIES, type ActionStatus, type Severity } from "@/lib/dpm/types";
import { formatDateTime } from "@/lib/utils";

export function ActionsPanel({ projectId }: { projectId: string | "all" }) {
  const allActions = useDpm((s) => s.actions);
  const actions = projectId === "all" ? allActions : allActions.filter((a) => a.projectId === projectId);
  const projects = useDpm((s) => s.projects);
  const addAction = useDpm((s) => s.addAction);
  const updateAction = useDpm((s) => s.updateAction);
  const [source, setSource] = useState("User-entered");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");

  const code = (id: string) => projects.find((p) => p.id === id)?.code ?? "—";

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">Actions register</h2>
      <form
        className="mb-3 grid gap-2 rounded-lg border border-border bg-surface p-3 md:grid-cols-[160px_1fr_120px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!action.trim() || projectId === "all") return;
          void addAction({
            projectId,
            source,
            severity,
            owner: "",
            recommendedAction: action.trim(),
            status: "Open",
          });
          setAction("");
        }}
      >
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source" />
        <Textarea
          className="min-h-9"
          rows={1}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Recommended action"
          disabled={projectId === "all"}
        />
        <select
          className="h-9 rounded-md border border-input px-2 text-sm"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity)}
        >
          {SEVERITIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button type="submit" disabled={projectId === "all"}>
          Add
        </Button>
      </form>
      {projectId === "all" && (
        <p className="mb-2 text-xs text-muted">Open a project to add an action. This inbox is the whole portfolio.</p>
      )}
      <div className="overflow-auto rounded-lg border border-border bg-surface">
        <table className="dpm-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Source</th>
              <th>Action</th>
              <th>Severity</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  No actions yet.
                </td>
              </tr>
            )}
            {actions.map((a) => (
              <tr key={a.id}>
                <td className="num">{code(a.projectId)}</td>
                <td className="text-xs">{a.source}</td>
                <td>{a.recommendedAction}</td>
                <td>
                  <Badge tone={a.severity === "High" ? "red" : a.severity === "Medium" ? "yellow" : "gray"}>
                    {a.severity}
                  </Badge>
                </td>
                <td>
                  <Input
                    className="h-7 w-28 text-xs"
                    value={a.owner}
                    placeholder="Unassigned"
                    onChange={(e) => void updateAction(a.id, { owner: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="h-7 rounded-md border border-input px-1 text-xs"
                    value={a.status}
                    onChange={(e) => void updateAction(a.id, { status: e.target.value as ActionStatus })}
                  >
                    {ACTION_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="num">{formatDateTime(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DraftLibrary({ projectId }: { projectId?: string }) {
  const allEmails = useDpm((s) => s.emails);
  const emails = projectId ? allEmails.filter((e) => e.projectIds.includes(projectId)) : allEmails;
  const updateEmail = useDpm((s) => s.updateEmail);
  if (!emails.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold">Drafts library</h2>
      <div className="grid gap-2">
        {emails.map((e) => (
          <article key={e.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{e.subject}</h3>
              <div className="flex items-center gap-2">
                <Badge tone={e.status === "Sent" ? "gray" : "default"}>{e.status}</Badge>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${e.subject}\n\n${e.body}`);
                  }}
                >
                  Copy
                </Button>
                {e.status === "Draft" && (
                  <Button
                    size="xs"
                    onClick={() => void updateEmail(e.id, { status: "Sent", sentAt: new Date().toISOString() })}
                  >
                    Mark sent
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted">
              {e.audience} · {e.contentType} · {formatDateTime(e.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
