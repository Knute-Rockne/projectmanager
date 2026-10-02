import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "./markdown";
import { runGrok, type ChatTurn } from "@/lib/dpm/grok";
import { assemblePortfolioMaterials, assembleProjectMaterials } from "@/lib/dpm/context";
import { useDpm } from "@/lib/dpm/store";
import { EMAIL_AUDIENCES, EMAIL_TONES, type EmailAudience, type EmailTone } from "@/lib/dpm/types";
import { uid } from "@/lib/utils";

type ChatMessage = ChatTurn & { id: string };

export function EmailDrafter({ defaultProjectIds }: { defaultProjectIds: string[] }) {
  const store = useDpm();
  const [scope, setScope] = useState<"one" | "several" | "portfolio">(
    defaultProjectIds.length > 1 ? "several" : "one",
  );
  const [selected, setSelected] = useState<string[]>(defaultProjectIds);
  const [audience, setAudience] = useState<EmailAudience>("Leadership");
  const [tone, setTone] = useState<EmailTone>("concise executive");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const projectOptions = store.projects;
  const projectIds = scope === "portfolio" ? store.projects.map((p) => p.id) : selected;
  const projects = store.projects.filter((p) => projectIds.includes(p.id));
  const scopeKey = `${scope}:${projectIds.slice().sort().join(",")}`;

  useEffect(() => {
    setMessages([]);
  }, [scopeKey]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const materials = useMemo(() => {
    if (!projects.length) return "";
    if (projects.length === 1) {
      return assembleProjectMaterials({
        project: projects[0]!,
        settings: store.settings,
        documents: store.documents,
        snapshots: store.snapshots,
        activities: store.activities,
        risks: store.risks,
      });
    }
    return assemblePortfolioMaterials({
      settings: store.settings,
      projects,
      documents: store.documents,
      snapshots: store.snapshots,
      activities: store.activities,
      risks: store.risks,
    });
  }, [projects, store.settings, store.documents, store.snapshots, store.activities, store.risks]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    if (!projects.length) return;
    const userMsg: ChatMessage = { id: uid("msg"), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const extra = `Audience: ${audience}\nTone: ${tone}\nProjects: ${projects.map((p) => p.code).join(", ")}\nSign-off:\n${store.settings.emailSignOff}\nConfidentiality:\n${store.settings.confidentialityBanner}`;
      const res = await runGrok({
        data: {
          task: "chat",
          materials,
          extra,
          messages: next.map(({ role, content }) => ({ role, content })),
        },
      });
      setMessages((cur) => [
        ...cur,
        {
          id: uid("msg"),
          role: "assistant",
          content: res.ok ? res.text : res.error,
        },
      ]);
      if (res.ok) {
        void store.auditLog("Grok chat", text.slice(0, 120), projects[0]?.id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="grid h-fit gap-3 rounded-lg border border-border bg-surface p-4">
        <Field label="Scope">
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one">One project</SelectItem>
              <SelectItem value="several">Several projects</SelectItem>
              <SelectItem value="portfolio">Whole portfolio</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {scope !== "portfolio" && (
          <Field label="Projects">
            <div className="grid max-h-40 gap-1 overflow-auto rounded-md border border-border p-2">
              {projectOptions.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((cur) => (e.target.checked ? [...cur, p.id] : cur.filter((id) => id !== p.id)))
                    }
                  />
                  {p.code}
                </label>
              ))}
            </div>
          </Field>
        )}
        <Field label="Audience">
          <Select value={audience} onValueChange={(v) => setAudience(v as EmailAudience)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tone">
          <Select value={tone} onValueChange={(v) => setTone(v as EmailTone)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TONES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <p className="text-xs text-muted">
          Ask in the chat what you need. Grok only uses files already in this browser. Nothing is emailed.
        </p>
      </aside>

      <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div ref={scroller} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Ask a question — a weekly status, a recovery note, a document gap, or anything else in the files.
              {projects.length ? ` Context: ${projects.map((p) => p.code).join(", ")}.` : " Select a project first."}
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "ml-8 self-end" : "mr-8 self-start"}>
              <div
                className={
                  m.role === "user"
                    ? "rounded-lg bg-steel px-3 py-2 text-sm text-steel-fg"
                    : "rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
                }
              >
                {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
              {m.role === "assistant" && (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-muted hover:text-fg"
                  onClick={() => void navigator.clipboard.writeText(m.content)}
                >
                  Copy
                </button>
              )}
            </div>
          ))}
          {busy && <p className="text-xs text-muted">Grok is reading the project files…</p>}
        </div>
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Textarea
            rows={2}
            value={draft}
            disabled={busy || !projects.length}
            placeholder={projects.length ? "Ask Grok…" : "Select a project first"}
            className="min-h-16 flex-1"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="submit" size="icon" disabled={busy || !draft.trim() || !projects.length} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
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
