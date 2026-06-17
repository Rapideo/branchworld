import { useState } from 'react';
import type { EngineSnapshot } from '../../engine';
import { loadSlots, writeSlot, deleteSlot, type SaveSlot } from './storage';

interface Props {
  storyId: string;
  makeSnapshot: () => EngineSnapshot;
  onRestore: (snap: EngineSnapshot) => void;
  summary: string;
}

export function SaveSlots({ storyId, makeSnapshot, onRestore, summary }: Props) {
  const [slots, setSlots] = useState<Record<string, SaveSlot>>(() => loadSlots(storyId));
  const [name, setName] = useState('');
  const refresh = () => setSlots(loadSlots(storyId));

  const save = () => {
    const slotName = name.trim() || `Save ${Object.keys(slots).length + 1}`;
    writeSlot(storyId, slotName, { snapshot: makeSnapshot(), savedAt: new Date().toISOString(), summary });
    setName('');
    refresh();
  };

  return (
    <section aria-label="Save slots" className="border-t border-stone-200 bg-white px-4 py-3 text-sm">
      <div className="flex gap-2">
        <input
          aria-label="Slot name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Slot name"
          className="flex-1 rounded border border-stone-300 px-2 py-1"
        />
        <button onClick={save} className="rounded bg-stone-800 px-3 py-1 text-white">Save</button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {Object.entries(slots).map(([slotName, s]) => (
          <li key={slotName} className="flex items-center justify-between gap-2">
            <span className="truncate">{slotName} — {s.summary}</span>
            <span className="flex gap-1">
              <button onClick={() => onRestore(s.snapshot)} className="rounded border border-stone-300 px-2 py-0.5">Load</button>
              <button onClick={() => { deleteSlot(storyId, slotName); refresh(); }} className="rounded border border-stone-300 px-2 py-0.5">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
