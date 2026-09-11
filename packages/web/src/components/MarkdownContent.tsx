import type { ReactNode } from "react";

function parseInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

type MarkdownContentProps = {
  source: string;
};

export function MarkdownContent({ source }: MarkdownContentProps) {
  const blocks = source.trim().split(/\n\n+/);

  return (
    <div className="markdown-content">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const firstLine = lines[0];

        if (firstLine.startsWith("# ")) {
          return <h1 key={index}>{parseInline(firstLine.slice(2))}</h1>;
        }

        if (firstLine.startsWith("## ")) {
          return <h2 key={index}>{parseInline(firstLine.slice(3))}</h2>;
        }

        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{parseInline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{parseInline(block.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}
