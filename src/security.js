const encoder = new TextEncoder();

export async function hashPin(pin, salt) {
  if (!/^\d{4,8}$/.test(pin || "")) throw Error("PIN must be 4 to 8 digits.");
  const bytes = encoder.encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function newSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createLock(pin, minutes = 5) {
  const salt = newSalt();
  return {
    salt,
    hash: await hashPin(pin, salt),
    minutes: Math.max(1, Number(minutes) || 5),
  };
}

export async function verifyPin(pin, config) {
  return !!config?.hash && (await hashPin(pin, config.salt)) === config.hash;
}
