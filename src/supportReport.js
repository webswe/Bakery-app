export function supportReportText(input = {}) {
  const clean = (value) => String(value || "").trim();
  const lines = [
    "Bakery Ledger support report",
    "",
    `Created: ${clean(input.createdAt)}`,
    `App version: ${clean(input.appVersion) || "Not available"}`,
    `Operating system: ${clean(input.platform) || "Not available"}`,
    `Current page: ${clean(input.page) || "Not available"}`,
    "",
    "What I was trying to do:",
    clean(input.action) || "Not provided",
    "",
    "What happened:",
    clean(input.actual) || "Not provided",
    "",
    "What I expected:",
    clean(input.expected) || "Not provided",
    "",
    "Steps to reproduce:",
    clean(input.steps) || "Not provided",
  ];
  if (clean(input.redoResult))
    lines.push("", "Result after trying again:", clean(input.redoResult));
  if (clean(input.contact))
    lines.push("", "Contact details:", clean(input.contact));
  return lines.join("\n");
}

export function supportEmailBody(report) {
  return (
    "Hello,\n\nI found a problem in Bakery Ledger. I saved the support report created by the app and can attach it to this message.\n\nSummary:\n" +
    String(report || "").slice(0, 900)
  );
}
