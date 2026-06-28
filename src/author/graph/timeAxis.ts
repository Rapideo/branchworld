import type { Story } from '../../engine';
import { parseTime } from '../../engine';

export interface TimeMark { id: string; label: string; triggerMin: number; frac: number; }
export interface TimeAxisData { startMin: number; deadlineMin: number; windowMin: number; marks: TimeMark[]; }

export function timeAxis(story: Story): TimeAxisData {
  const startMin = parseTime(story.startTime);
  const deadlineMin = story.deadline !== undefined ? parseTime(story.deadline) : parseTime(story.startTime);
  const windowMin = deadlineMin - startMin;
  const marks: TimeMark[] = [];
  for (const ev of story.events) {
    const t = ev.trigger.find((c) => c.op === 'time_after' || c.op === 'time_before');
    if (!t || t.value == null) continue;
    const triggerMin = parseTime(t.value);
    marks.push({ id: ev.id, label: ev.title, triggerMin, frac: windowMin > 0 ? (triggerMin - startMin) / windowMin : 0 });
  }
  return { startMin, deadlineMin, windowMin, marks };
}
