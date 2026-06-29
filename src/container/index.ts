// The multi-chapter container — a game-agnostic layer over the engine: Game/Chapter types, the carry
// contract, chapter transitions, the GameRunner, the game + cross-chapter-contract linters, and the seeded
// walk. Promoted out of src/experiments/sump-line/ once a second game (the heist) consumed it.
//
// Games import from here (the barrel) OR by submodule. This barrel exports ONLY the container — no game
// content — so a consumer never drags another game into its module graph.
export * from './types';
export * from './carry';
export * from './transitions';
export * from './GameRunner';
export * from './lintGame';
export * from './lintGameContracts';
export * from './seededWalk';
export { exampleGame } from './exampleGame';
export { roamExample, roamExampleTimed, roamStranded } from './roamExample';
