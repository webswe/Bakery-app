const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes) => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

async function deriveKey(password, salt, usage) {
  const source = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    source,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export async function encryptWorkspace(data, password) {
  if (String(password || "").length < 8)
    throw Error("Use a backup password with at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  return JSON.stringify({
    format: "bakery-ledger-encrypted-v1",
    createdAt: new Date().toISOString(),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  });
}

export async function decryptWorkspace(contents, password) {
  let envelope;
  try {
    envelope = JSON.parse(contents);
  } catch {
    throw Error("This is not a valid encrypted Bakery Ledger backup.");
  }
  if (envelope.format !== "bakery-ledger-encrypted-v1")
    throw Error("This backup uses an unsupported format.");
  try {
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(password, base64ToBytes(envelope.salt), [
      "decrypt",
    ]);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(envelope.data),
    );
    const data = JSON.parse(decoder.decode(decrypted));
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.recipes))
      throw Error("Backup data is incomplete.");
    return data;
  } catch (error) {
    if (error.message === "Backup data is incomplete.") throw error;
    throw Error("The password is incorrect or the backup is damaged.");
  }
}
