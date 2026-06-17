import type { EngineSnapshot } from '../../engine';

export interface SaveSlot {
  snapshot: EngineSnapshot;
  savedAt: string;
  summary: string;
}

const keyFor = (storyId: string) => `branchworld:saves:${storyId}`;

export function loadSlots(storyId: string): Record<string, SaveSlot> {
  try {
    const raw = localStorage.getItem(keyFor(storyId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SaveSlot>) : {};
  } catch {
    return {};
  }
}

export function writeSlot(storyId: string, name: string, slot: SaveSlot): void {
  try {
    const slots = loadSlots(storyId);
    slots[name] = slot;
    localStorage.setItem(keyFor(storyId), JSON.stringify(slots));
  } catch {
    /* storage unavailable; ignore */
  }
}

export function deleteSlot(storyId: string, name: string): void {
  try {
    const slots = loadSlots(storyId);
    delete slots[name];
    localStorage.setItem(keyFor(storyId), JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}
