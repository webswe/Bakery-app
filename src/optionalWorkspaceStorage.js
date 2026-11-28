// Drafts and interface preferences are best effort. Workspace saves are handled separately.
export function readOptionalStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeOptionalStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeOptionalStorage(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readWorkspaceDraft(storage, key) {
  try {
    const draft = JSON.parse(readOptionalStorage(storage, key));
    return draft && typeof draft === "object" && !Array.isArray(draft)
      ? draft
      : null;
  } catch {
    return null;
  }
}
