import { useCallback, useState } from "react";

// Persisted across sessions so your common behaviors stay on top. Behavior
// local ids are stable per keyboard; ids from a different keyboard simply won't
// match the live behavior list and are filtered out where the recents render.
const STORAGE_KEY = "zmk-studio:recent-behaviors";
const MAX_RECENTS = 5;

function readStored(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

function writeStored(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore: a full / unavailable store just means recents won't persist.
  }
}

/**
 * Most-recently-used behavior ids, newest first, de-duplicated and capped. Call
 * {@link recordUse} when the user picks a behavior; the list reorders so the
 * picker can surface a "Recently used" group instead of making them scroll the
 * full behavior list each time.
 */
export function useRecentBehaviors() {
  const [recentIds, setRecentIds] = useState<number[]>(readStored);

  const recordUse = useCallback((id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENTS);
      writeStored(next);
      return next;
    });
  }, []);

  return { recentIds, recordUse };
}
