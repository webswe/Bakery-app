const entities = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

function noteValue(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  for (const key of ["note", "text", "content", "value", "body"]) {
    if (value[key] != null) return noteValue(value[key]);
  }
  return "";
}

function plainReleaseNote(value) {
  let text = noteValue(value);
  // electron-updater has used both HTML and XML-like <text> wrappers across
  // providers. Decode more than once so escaped wrappers are removed too.
  for (let count = 0; count < 3; count += 1) {
    const decoded = decodeEntities(text);
    if (decoded === text) break;
    text = decoded;
  }
  return text
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*li(?:\s[^>]*)?>/gi, "• ")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|ul|ol)\s*>/gi, "\n")
    .replace(/<\s*\/?\s*text(?:\s[^>]*)?>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function releaseNotes(info) {
  const notes = info?.releaseNotes;
  if (Array.isArray(notes)) return notes.map(plainReleaseNote).filter(Boolean).join("\n\n");
  return plainReleaseNote(notes);
}

module.exports = { plainReleaseNote, releaseNotes };
