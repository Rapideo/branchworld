import type { Story, Location, Effect, Profile } from './types';

export const TRAVEL_PREFIX = '__travel_';

export function travelChoiceId(dest: string): string {
  return `${TRAVEL_PREFIX}${dest}`;
}

export function parseTravelDest(choiceId: string): string | undefined {
  return choiceId.startsWith(TRAVEL_PREFIX) ? choiceId.slice(TRAVEL_PREFIX.length) : undefined;
}

/** A node is a hub only FOR the player's current location: state.location's Location has this node as defaultNode. */
export function hubLocation(story: Story, location: string, currentId: string): Location | undefined {
  const here = story.locations.find((l) => l.id === location);
  return here && here.defaultNode === currentId ? here : undefined;
}

export function travelDests(loc: Location): string[] {
  return loc.connectedLocations ?? [];
}

export function destDefaultNode(story: Story, dest: string): string | undefined {
  return story.locations.find((l) => l.id === dest)?.defaultNode;
}

/** The effects a trip applies: pay travelTimes[dest] (monotonic add_minutes) then move to dest. */
export function travelTripEffects(loc: Location, dest: string): Effect[] {
  return [
    { op: 'add_minutes', field: 'time', value: String(loc.travelTimes?.[dest] ?? 0) },
    { op: 'change_location', field: 'location', value: dest },
  ];
}

/** Hub-node -> connected dest-hub-nodes WITH travel minutes, in declared connectedLocations order. The single
 *  source of truth for travel reachability. Empty unless travel:'free'. */
export function travelHops(story: Story, profile: Profile): Map<string, { dest: string; minutes: number }[]> {
  const hops = new Map<string, { dest: string; minutes: number }[]>();
  if (profile.travel !== 'free') return hops;
  for (const loc of story.locations) {
    if (!loc.defaultNode) continue;
    const out: { dest: string; minutes: number }[] = [];
    for (const d of travelDests(loc)) {
      const dn = destDefaultNode(story, d);
      if (dn) out.push({ dest: dn, minutes: loc.travelTimes?.[d] ?? 0 });
    }
    hops.set(loc.defaultNode, out);
  }
  return hops;
}

/** Dests only — derived from travelHops, for callers that don't need the minutes. */
export function travelNodeEdges(story: Story, profile: Profile): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const [from, hops] of travelHops(story, profile)) edges.set(from, hops.map((h) => h.dest));
  return edges;
}
