export const storageKey = "bakery-ledger-v1",
  backupKey = "bakery-ledger-backups-v1";
export function readBackups(storage) {
  const list = JSON.parse(storage.getItem(backupKey) || "[]");
  if (!Array.isArray(list))
    throw Error(
      "Backup history is invalid. Export your workspace before making changes.",
    );
  return list;
}
export function persistWorkspace(storage, next, day, restoring = false) {
  const previous = storage.getItem(storageKey),
    history = readBackups(storage);
  if (previous) {
    let old;
    try {
      old = JSON.parse(previous);
    } catch {
      if (!restoring)
        throw Error("Saved workspace is unreadable; restore a valid backup.");
      storage.setItem("bakery-ledger-unreadable-v1", previous);
    }
    if (old && !history.some((b) => b.day === day))
      storage.setItem(
        backupKey,
        JSON.stringify(
          [
            ...history,
            {
              day,
              savedAt: new Date().toISOString(),
              data: old,
            },
          ].slice(-14),
        ),
      );
  }
  storage.setItem(storageKey, JSON.stringify(next));
}
