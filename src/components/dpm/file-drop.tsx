import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTR } from "@/lib/dpm/parse-file";

export function FileDrop({
  onFiles,
  label = "Drop files or click to upload",
  hint = "PDF, DOCX, XLSX, CSV, TXT, XML, XER, ZIP",
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function take(list: FileList | File[] | null) {
    if (!list) return;
    const files = Array.from(list);
    if (!files.length) return;
    onFiles(files);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors",
        compact ? "gap-1 px-3 py-4" : "gap-2 px-6 py-8",
        over ? "border-steel bg-steel-soft" : "border-border-strong bg-surface hover:bg-steel-soft/60",
      )}
    >
      <Upload className="size-4 text-steel" />
      <div className="text-sm font-medium text-fg">{label}</div>
      <div className="text-xs text-muted">{hint}</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
