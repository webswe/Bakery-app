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

function plainReleaseNote(value) {
  return decodeEntities(String(value || ""))
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*li(?:\s[^>]*)?>/gi, "• ")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|ul|ol)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function releaseNotes(info) {
  const notes = info?.releaseNotes;
  if (Array.isArray(notes)) return notes.map((entry) => plainReleaseNote(entry?.note ?? entry)).filter(Boolean).join("\n\n");
  return plainReleaseNote(notes);
}

module.exports = { plainReleaseNote, releaseNotes };
