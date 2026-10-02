import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PHASES, RAG_STATUSES, type Phase, type RagStatus } from "@/lib/dpm/types";
import { useDpm } from "@/lib/dpm/store";
import { useNavigate } from "@tanstack/react-router";

export function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const addProject = useDpm((s) => s.addProject);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [client, setClient] = useState("SPS Transmission — Capital Delivery");
  const [location, setLocation] = useState("");
  const [pm, setPm] = useState("");
  const [phase, setPhase] = useState<Phase>("Planning");
  const [status, setStatus] = useState<RagStatus>("Green");
  const [start, setStart] = useState("");
  const [finish, setFinish] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const p = await addProject({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      client,
      location,
      pm,
      phase,
      status,
      start,
      finish,
      percentComplete: 0,
    });
    onOpenChange(false);
    setCode("");
    setName("");
    navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Adds a project to this browser workspace. Files stay local unless you export a backup.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Project code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HARE" required />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Greenfield substation" required />
          </Field>
          <Field label="Client / owner">
            <Input value={client} onChange={(e) => setClient(e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="PM">
            <Input value={pm} onChange={(e) => setPm(e.target.value)} />
          </Field>
          <Field label="Phase">
            <Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="RAG">
            <Select value={status} onValueChange={(v) => setStatus(v as RagStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RAG_STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Finish">
            <Input type="date" value={finish} onChange={(e) => setFinish(e.target.value)} />
          </Field>
          <div className="col-span-full flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create project</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
