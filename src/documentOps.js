const prefixes = { quote: "Q", order: "O", invoice: "INV", pickup: "PU" };

export function allocateDocumentNumber(data, kind, date) {
  const year = String(date || new Date().getFullYear()).slice(0, 4);
  const counterKey = `${kind}-${year}`;
  const next = ((data.documentCounters || {})[counterKey] || 0) + 1;
  return {
    number: `${prefixes[kind] || kind.toUpperCase()}-${year}-${String(next).padStart(4, "0")}`,
    documentCounters: { ...(data.documentCounters || {}), [counterKey]: next },
  };
}

export function displayDocumentNumber(record, kind) {
  const field = kind === "quote" ? "quoteNumber" : `${kind}Number`;
  return record?.[field] || `${(prefixes[kind] || kind).toUpperCase()}-${String(record?.id || "DRAFT").slice(0, 8)}`;
}
