const MAX_REFERENCE_IMAGE_BYTES = 1_500_000;
export { localDay } from "./dateUtils.js";

export function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

export function downloadBlob(name, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function readReferenceImage(file) {
  if (!file) return Promise.resolve("");
  if (!file.type.startsWith("image/")) throw Error("Choose an image file.");
  if (file.size > MAX_REFERENCE_IMAGE_BYTES)
    throw Error("Choose an image smaller than 1.5 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}
