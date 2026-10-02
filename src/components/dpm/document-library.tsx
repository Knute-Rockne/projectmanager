import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileDrop } from "./file-drop";
import { DocumentChat } from "./document-chat";
import { Markdown } from "./markdown";
import { Badge } from "@/components/ui/badge";
import { useDpm } from "@/lib/dpm/store";
import { projectCompleteness } from "@/lib/dpm/completeness";
import { assembleProjectMaterials } from "@/lib/dpm/context";
import { runGrok, type GrokTask } from "@/lib/dpm/grok";
import { DOC_CATEGORIES, type DocCategory } from "@/lib/dpm/types";
import { fileSizeLabel, formatDateTime } from "@/lib/utils";

export function DocumentLibrary({ projectId }: { projectId: string | null }) {
  const store = useDpm();
  const project = store.projects.find((p) => p.id === projectId);
  const [cat, setCat] = useState<DocCategory | "ALL">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pasteId, setPasteId] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<string>("");

  const docs = store.documents.filter((d) => (projectId ? d.projectId === projectId : !d.projectId));
  const visible = cat === "ALL" ? docs : docs.filter((d) => d.category === cat);
  const complete = projectId ? projectCompleteness(projectId, store.documents) : null;

  const extraDocs = useMemo(
    () => store.documents.filter((d) => selected.has(d.id)),
    [store.documents, selected],
  );

  async function run(task: GrokTask, title: string) {
    if (!project) {
      toast.error("Assign files to a project first.");
      return;
    }
    setBusy(task);
    try {
      const materials = assembleProjectMaterials({
        project,
        settings: store.settings,
        documents: store.documents,
        snapshots: store.snapshots,
        activities: store.activities,
        risks: store.risks,
        extraDocs: extraDocs.length ? extraDocs : undefined,
      });
      const res = await runGrok({ data: { task, materials } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReview(res.text);
      await store.addNote({
        projectId: project.id,
        kind:
          task === "scope"
            ? "scope-extract"
            : task === "safety"
              ? "safety-gaps"
              : task === "cost"
                ? "cost-flags"
                : task === "commissioning"
                  ? "commissioning"
                  : task === "register"
                    ? "doc-register"
                    : "custom",
        title,
        content: res.text,
        sources: extraDocs.map((d) => d.filename),
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {!project && (
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Portfolio inbox</h1>
          <p className="text-sm text-muted">Unassigned files. Categorize and attach them to a project.</p>
        </div>
      )}

      {complete && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {complete.items.map((item) => (
            <div key={item.key} className="rounded-md border border-border bg-surface px-3 py-2">
              <div className="text-[11px] text-muted">{item.label}</div>
              <div className={`text-sm font-medium ${item.present ? "text-ontrack-fg" : "text-critical-fg"}`}>
                {item.present ? (item.controlling ? "Controlling" : "Present") : "Missing"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <FileDrop
          onFiles={(files) => void store.ingestFiles(files, { projectId, category: cat === "ALL" ? undefined : cat })}
          label={project ? "Drop project files" : "Drop files into the portfolio inbox"}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-md border border-input bg-surface px-2 text-xs"
          value={cat}
          onChange={(e) => setCat(e.target.value as DocCategory | "ALL")}
        >
          <option value="ALL">All categories</option>
          {DOC_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        {project && (
          <>
            <Button size="xs" variant="outline" disabled={!!busy} onClick={() => void run("scope", "Scope commitments")}>
              Extract scope (PSOW + AMs)
            </Button>
            <Button size="xs" variant="outline" disabled={!!busy} onClick={() => void run("safety", "Safety plan gaps")}>
              Safety gaps
            </Button>
            <Button size="xs" variant="outline" disabled={!!busy} onClick={() => void run("cost", "Cost-control red flags")}>
              Cost red flags
            </Button>
            <Button size="xs" variant="outline" disabled={!!busy} onClick={() => void run("commissioning", "Commissioning prerequisites")}>
              Commissioning gaps
            </Button>
            <Button size="xs" variant="outline" disabled={!!busy} onClick={() => void run("register", "Document-control register")}>
              Build register
            </Button>
          </>
        )}
      </div>

      {visible.length === 0 && (
        <div className="rounded-lg border border-dashed border-border-strong p-8 text-center text-sm text-muted">
          {project ? "Upload PSOW to start the document library." : "Inbox is empty."}
        </div>
      )}

      <div className={project ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}>
        <div className={project ? "order-2 min-w-0 lg:order-1" : ""}>
      {visible.length > 0 && (
        <div className="overflow-auto rounded-lg border border-border bg-surface">
          <table className="dpm-table">
            <thead>
              <tr>
                <th></th>
                <th>File</th>
                <th>Cat</th>
                <th>Rev</th>
                <th>Uploaded</th>
                <th>Parse</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(d.id);
                        else next.delete(d.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td>
                    <div className="font-medium">{d.filename}</div>
                    <div className="text-[11px] text-muted">
                      {fileSizeLabel(d.size)} {d.isControlling ? "· controlling" : ""}
                    </div>
                  </td>
                  <td>
                    <Select
                      value={d.category}
                      onValueChange={(v) => void store.updateDocument(d.id, { category: v as DocCategory })}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_CATEGORIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <Input
                      className="h-7 w-20 text-xs"
                      value={d.version}
                      onChange={(e) => void store.updateDocument(d.id, { version: e.target.value })}
                    />
                  </td>
                  <td className="num">{formatDateTime(d.uploadedAt)}</td>
                  <td>
                    <Badge tone={d.parseStatus === "ok" ? "green" : d.parseStatus === "limited" ? "yellow" : "gray"}>
                      {d.parseStatus === "ok" ? "text" : d.parseStatus === "limited" ? "parse limited" : "binary / parse limited"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap">
                    <Button size="xs" variant="ghost" onClick={() => void store.setControlling(d.id)}>
                      Controlling
                    </Button>
                    {d.parseStatus !== "ok" && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setPasteId(d.id);
                          setPaste(d.excerpt);
                        }}
                      >
                        Paste text
                      </Button>
                    )}
                    {!d.projectId && (
                      <select
                        className="h-7 rounded-md border border-input px-1 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) void store.updateDocument(d.id, { projectId: e.target.value });
                        }}
                      >
                        <option value="" disabled>
                          Assign
                        </option>
                        {store.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => void store.removeDocument(d.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
        {project && (
          <div className="order-1 lg:sticky lg:top-3 lg:order-2">
            <DocumentChat project={project} documents={docs} focus={extraDocs} />
          </div>
        )}
      </div>

      {pasteId && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
          <p className="mb-2 text-sm">Paste key text for this file. Stored as a searchable excerpt.</p>
          <Textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                void store.updateDocument(pasteId, { excerpt: paste, parseStatus: paste.trim() ? "ok" : "limited" });
                setPasteId(null);
                toast.success("Excerpt saved");
              }}
            >
              Save excerpt
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPasteId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {(review || busy) && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">{busy ? "Running Grok…" : "Latest review"}</h3>
          {review && <Markdown text={review} />}
        </div>
      )}
    </div>
  );
}
