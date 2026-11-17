export const storageKey = "bakery-ledger-v1";
const backupKey = "bakery-ledger-backups-v1";
const unreadableBackupKey = "bakery-ledger-backups-unreadable-v1";
const backupLimit = 14;
const backupBudget = 1_500_000;

export function readBackups(storage) {
  const list = JSON.parse(storage.getItem(backupKey) || "[]");
  if (!Array.isArray(list))
    throw Error(
      "Backup history is invalid. Export your workspace before making changes.",
    );
  return list;
}

function compactBackups(list) {
  const next = list.slice(-backupLimit);
  while (next.length > 1 && JSON.stringify(next).length > backupBudget)
    next.shift();
  return next;
}

function preserveUnreadableBackupHistory(storage) {
  const unreadable = storage.getItem(backupKey);
  if (!unreadable) return;
  try {
    storage.setItem(unreadableBackupKey, unreadable);
  } catch {
    /* the active workspace must remain usable even when storage is full */
  }
}

function saveBackupHistory(storage, history) {
  try {
    storage.setItem(backupKey, JSON.stringify(compactBackups(history)));
  } catch {
    try {
      storage.setItem(backupKey, JSON.stringify(history.slice(-2)));
    } catch {
      /* daily history is best effort; the current workspace was already saved */
    }
  }
}

export function persistWorkspace(storage, next, day, restoring = false) {
  const previous = storage.getItem(storageKey);
  let history;
  try {
    history = readBackups(storage);
  } catch {
    preserveUnreadableBackupHistory(storage);
    history = [];
  }

  let old;
  if (previous) {
    try {
      old = JSON.parse(previous);
    } catch {
      if (!restoring)
        throw Error("Saved workspace is unreadable; restore a valid backup.");
      try {
        storage.setItem("bakery-ledger-unreadable-v1", previous);
      } catch {
        /* replacing a broken workspace is more important than archiving it */
      }
    }
  }

  storage.setItem(storageKey, JSON.stringify(next));

  if (old && !history.some((backup) => backup.day === day))
    saveBackupHistory(storage, [
      ...history,
      {
        day,
        savedAt: new Date().toISOString(),
        data: old,
      },
    ]);
}
