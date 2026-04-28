export function parseFrontmatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---")) {
    return {};
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return {};
  }

  const raw = markdown.slice(3, end);
  const result: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    result[key] = value.trim().replace(/^["']|["']$/g, "");
  }

  return result;
}
