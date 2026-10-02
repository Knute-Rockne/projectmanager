import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "./markdown";
import { runGrok, type ChatTurn } from "@/lib/dpm/grok";
import { useDpm } from "@/lib/dpm/store";
import type { Project } from "@/lib/dpm/types";
import { uid } from "@/lib/utils";

type ChatMessage = ChatTurn & { id: string };

export function CostChat({ project, materials }: { project: Project; materials: string }) {
  const auditLog = useDpm((s) => s.auditLog);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [project.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const userMsg: ChatMessage = { id: uid("msg"), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await runGrok({
        data: {
          task: "cost-chat",
          materials,
          extra: `Project: ${project.code}. Ask about a design gate (30%, 60%, 90%, IFC), a phase subtotal, a milestone cumulative, or a gap versus uploaded cost files.`,
          messages: next.map(({ role, content }) => ({ role, content })),
        },
      });
      setMessages((cur) => [
        ...cur,
        { id: uid("msg"), role: "assistant", content: res.ok ? res.text : res.error },
      ]);
      if (res.ok) void auditLog("Cost chat", text.slice(0, 120), project.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Ask about this estimate</h2>
        <p className="text-[11px] text-muted">
          Uses the working register on this page and any uploaded cost files. Nothing is emailed.
        </p>
      </div>
      <div ref={scroller} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask what a phase totals, what is included through a milestone, or where the register is still unpriced.
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
        {busy && <p className="text-xs text-muted">Grok is reading the cost register…</p>}
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
          disabled={busy}
          placeholder="Ask about the estimate…"
          className="min-h-16 flex-1"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
