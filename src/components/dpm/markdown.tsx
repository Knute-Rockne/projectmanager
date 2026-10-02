export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-dpm">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines[0]?.startsWith("## ")) return <h2 key={i}>{lines[0].slice(3)}</h2>;
        if (lines[0]?.startsWith("# ")) return <h2 key={i}>{lines[0].slice(2)}</h2>;
        const isList = lines.every((l) => /^[-*•]\s/.test(l) || l.trim() === "");
        if (isList) {
          return (
            <ul key={i}>
              {lines.filter(Boolean).map((l, j) => (
                <li key={j}>{l.replace(/^[-*•]\s/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  );
}
