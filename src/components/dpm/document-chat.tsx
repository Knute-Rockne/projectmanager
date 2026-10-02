import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "./markdown";
import { runGrok, type ChatTurn } from "@/lib/dpm/grok";
import { assembleDocumentMaterials } from "@/lib/dpm/context";
import { useDpm } from "@/lib/dpm/store";
import type { DocumentRecord, Project } from "@/lib/dpm/types";
import { uid } from "@/lib/utils";

type ChatMessage = ChatTurn & { id: string };

export function DocumentChat({
  project,
  documents,
  focus,
}: {
  project: Project;
  documents: DocumentRecord[];
  focus: DocumentRecord[];
}) {
  const auditLog = useDpm((s) => s.auditLog);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const scoped = focus.length ? focus : documents;
  const scopeKey = project.id;

  useEffect(() => {
    setMessages([]);
  }, [scopeKey]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const materials = useMemo(
    () => assembleDocumentMaterials(project, scoped),
    [project, scoped],
  );

  async function send() {
    const text = draft.trim();
    if (!text || busy || !scoped.length) return;
    const userMsg: ChatMessage = { id: uid("msg"), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const names = scoped.map((d) => d.filename).join(", ");
      const extra = focus.length
        ? `Answer using only these selected files: ${names}`
        : `No files are checked. Answer using every uploaded file on ${project.code}: ${names}`;
      const res = await runGrok({
        data: {
          task: "doc-chat",
          materials,
          extra,
          messages: next.map(({ role, content }) => ({ role, content })),
        },
      });
      setMessages((cur) => [
        ...cur,
        { id: uid("msg"), role: "assistant", content: res.ok ? res.text : res.error },
      ]);
      if (res.ok) void auditLog("Document chat", text.slice(0, 120), project.id);
    } finally {
      setBusy(false);
    }
  }

  const scopeLabel = !documents.length
    ? "No files uploaded yet."
    : focus.length
      ? `Using ${focus.length} selected file${focus.length === 1 ? "" : "s"}.`
      : `Using all ${documents.length} file${documents.length === 1 ? "" : "s"} on ${project.code}. Check rows to narrow it.`;

  return (
    <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Ask about these files</h2>
        <p className="text-[11px] text-muted">{scopeLabel} Answers stay in this browser. Nothing is emailed.</p>
      </div>
      <div ref={scroller} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask what a PSOW commits to, what an amendment changed, or which controlling file is missing a fact.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-6 self-end" : "mr-6 self-start"}>
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
        {busy && <p className="text-xs text-muted">Grok is reading the uploaded files…</p>}
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
          disabled={busy || !scoped.length}
          placeholder={scoped.length ? "Ask about the uploaded files…" : "Upload a file first"}
          className="min-h-16 flex-1"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={busy || !draft.trim() || !scoped.length} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
