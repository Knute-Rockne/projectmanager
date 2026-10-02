import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileDrop } from "./file-drop";
import { parseP6Xml, parseXerText, xlsxToTable, extOf } from "@/lib/dpm/parse-file";
import {
  guessColumnMap,
  parseNotesForMap,
  rowsToActivities,
  splitTable,
} from "@/lib/dpm/schedule";
import { SCHEDULE_FIELD_LABELS, SCHEDULE_FIELDS, type ScheduleField } from "@/lib/dpm/types";
import { useDpm } from "@/lib/dpm/store";
import { todayISO, uid } from "@/lib/utils";

type ParsedTable = { headers: string[]; rows: string[][]; source: string; notes: string[] };

export function ScheduleWizard({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}) {
  const projects = useDpm((s) => s.projects);
  const settings = useDpm((s) => s.settings);
  const saveSnapshot = useDpm((s) => s.saveSnapshot);
  const ingestFiles = useDpm((s) => s.ingestFiles);
  const [pid, setPid] = useState(projectId);
  const [step, setStep] = useState(1);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [name, setName] = useState(`Data Date ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`);
  const [dataDate, setDataDate] = useState(todayISO());
  const [paste, setPaste] = useState("");

  const project = projects.find((p) => p.id === pid);

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    try {
      const parsed = await parseScheduleFile(file);
      applyTable(parsed);
      await ingestFiles([file], { projectId: pid, category: "SCH" });
    } catch (err) {
      toast.error("Could not parse schedule file", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function applyTable(parsed: ParsedTable) {
    setTable(parsed);
    setMap(guessColumnMap(parsed.headers));
    setStep(3);
  }

  function handlePaste() {
    if (!paste.trim()) return;
    const xml = parseP6Xml(paste);
    if (xml) {
      applyTable({ ...xml, source: "pasted XML", notes: ["Parsed as Primavera XML."] });
      return;
    }
    const xer = parseXerText(paste);
    if (xer) {
      applyTable({ ...xer, source: "pasted XER", notes: ["Parsed as XER TASK table."] });
      return;
    }
    const t = splitTable(paste);
    if (!t.headers.length) {
      toast.error("Could not detect a table in the pasted text");
      return;
    }
    applyTable({ ...t, source: "pasted table", notes: ["Parsed pasted rows."] });
  }

  const preview = useMemo(() => {
    if (!table) return null;
    return rowsToActivities(table.headers, table.rows, map, { snapshotId: "preview", projectId: pid }, settings, dataDate);
  }, [table, map, pid, settings, dataDate]);

  async function save() {
    if (!table || !preview) return;
    const id = uid("snap");
    const acts = preview.activities.map((a) => ({ ...a, id: `${id}_${a.activityId}`, snapshotId: id }));
    const notes = [
      ...table.notes,
      ...parseNotesForMap(map, preview.parsed, preview.parsed + preview.skipped),
    ];
    await saveSnapshot(
      {
        id,
        projectId: pid,
        name,
        dataDate,
        sourceFilename: table.source,
        importedAt: new Date().toISOString(),
        parseNotes: notes,
        activityCount: preview.parsed + preview.skipped,
        parsedCount: preview.parsed,
        columnMap: map,
      },
      acts,
    );
    onOpenChange(false);
    setStep(1);
    setTable(null);
    setPaste("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(880px,calc(100%-1.5rem))]">
        <DialogHeader>
          <DialogTitle>Schedule import</DialogTitle>
          <DialogDescription>
            P6 XML, XLSX/CSV activity exports, XER (best-effort), or a pasted table. Snapshot is stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 text-xs text-muted">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n === step ? "font-medium text-fg" : ""}>
              {n}. {["Project", "File", "Map columns", "Save"][n - 1]}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-3">
            <Label>Project</Label>
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!project}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <FileDrop onFiles={handleFiles} label="Upload P6 XML / XLSX / CSV / XER" compact />
            <Label>Or paste an activity table</Label>
            <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} placeholder="Activity ID, Activity Name, Start, Finish, Total Float…" />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button variant="secondary" onClick={handlePaste} disabled={!paste.trim()}>Parse paste</Button>
            </div>
          </div>
        )}

        {step === 3 && table && (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              {table.source}. {table.headers.length} columns, {table.rows.length} rows.
            </p>
            <div className="grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
              {SCHEDULE_FIELDS.map((field) => (
                <label key={field} className="grid gap-1">
                  <Label>{SCHEDULE_FIELD_LABELS[field as ScheduleField]}</Label>
                  <Select
                    value={map[field] ?? "__none"}
                    onValueChange={(v) =>
                      setMap((m) => {
                        const next = { ...m };
                        if (v === "__none") delete next[field];
                        else next[field] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Not mapped" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not mapped</SelectItem>
                      {table.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h || "(blank)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={!map.activityId && !map.name}>Continue</Button>
            </div>
          </div>
        )}

        {step === 4 && preview && (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <Label>Snapshot name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <Label>Data date</Label>
                <Input type="date" value={dataDate} onChange={(e) => setDataDate(e.target.value)} />
              </label>
            </div>
            <p className="text-sm text-muted">
              Parsed {preview.parsed} of {preview.parsed + preview.skipped} rows
              {map.totalFloat ? `. Total Float from “${map.totalFloat}”.` : ". Total Float not mapped."}
            </p>
            <div className="max-h-40 overflow-auto rounded-md border border-border">
              <table className="dpm-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Finish</th><th>TF</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.activities.slice(0, 12).map((a) => (
                    <tr key={a.id}>
                      <td className="num">{a.activityId}</td>
                      <td>{a.name}</td>
                      <td className="num">{a.finish ?? "—"}</td>
                      <td className="num">{a.totalFloat ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={save}>Save snapshot</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function parseScheduleFile(file: File): Promise<ParsedTable> {
  const ext = extOf(file.name);
  if (ext === "xlsx" || ext === "xls") {
    const t = await xlsxToTable(file);
    return { ...t, source: `${file.name} / ${t.sheet}`, notes: [`Read sheet “${t.sheet}”.`] };
  }
  const text = await file.text();
  if (ext === "xml" || text.trim().startsWith("<")) {
    const xml = parseP6Xml(text);
    if (xml) return { ...xml, source: file.name, notes: ["Parsed as Primavera XML."] };
  }
  if (ext === "xer" || text.includes("%T\tTASK") || text.includes("%T TASK")) {
    const xer = parseXerText(text);
    if (xer) return { ...xer, source: file.name, notes: ["Parsed XER TASK table (best-effort)."] };
  }
  const t = splitTable(text);
  if (!t.headers.length) throw new Error("No header row detected.");
  return { ...t, source: file.name, notes: ["Parsed as delimited text."] };
}
