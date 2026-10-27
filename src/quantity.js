const unicodeFractions = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

export function parseQuantity(value) {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    throw Error("Quantity must be greater than zero.");
  }
  const text = String(value || "").trim();
  if (!text) throw Error("Enter a quantity.");
  if (Object.hasOwn(unicodeFractions, text)) return unicodeFractions[text];
  const unicode = text.match(/^(\d+(?:\.\d+)?)\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/);
  if (unicode) return Number(unicode[1]) + unicodeFractions[unicode[2]];
  const mixed = text.match(/^(?:(\d+(?:\.\d+)?)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (!denominator) throw Error("Fraction denominator cannot be zero.");
    const result = Number(mixed[1] || 0) + Number(mixed[2]) / denominator;
    if (result > 0) return result;
  }
  const number = Number(text);
  if (Number.isFinite(number) && number > 0) return number;
  throw Error("Use a number or fraction such as 0.5, 1/2, or 1 1/2.");
}
