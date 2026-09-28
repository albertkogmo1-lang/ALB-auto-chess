export type GamePhase =
  | 'menu'
  | 'pawn-placement'
  | 'piece-placement'
  | 'reveal'
  | 'commander-draft'
  | 'auto-play'
  | 'round-result'
  | 'match-result';

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface Commander {
  id: string;
  name: string;
  title: string;
  description: string;
  depth: number; // search depth for AI
  blunderRate: number; // 0-1, chance of making a random move
  aggression: number; // 0-1, preference for captures/attacks
  elo: number;
  emoji: string;
  used: boolean;
}

export interface RoundResult {
  round: number;
  winner: Color | 'draw';
  whiteCommander: Commander;
  blackCommander: Commander;
  moves: number;
  evalHistory: number[];
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  whiteScore: number;
  blackScore: number;
  whiteCommanders: Commander[];
  blackCommanders: Commander[];
  roundResults: RoundResult[];
  evalBar: number; // -100 to 100, negative = black advantage
  evalHistory: number[];
  phaseTimer: number;
  whitePawns: Record<string, string>; // square -> piece type
  blackPawns: Record<string, string>;
  whitePieces: Record<string, string>;
  blackPieces: Record<string, string>;
  selectedCommanderWhite: Commander | null;
  selectedCommanderBlack: Commander | null;
  moveLog: string[];
}

export const INITIAL_COMMANDERS: Commander[] = [
  {
    id: 'grandmaster',
    name: 'The Grandmaster',
    title: 'Depth 4, Low Blunder',
    description: 'A calculating mind. Rarely misses tactics.',
    depth: 4,
    blunderRate: 0.02,
    aggression: 0.5,
    elo: 2200,
    emoji: '🧠',
    used: false,
  },
  {
    id: 'boxer',
    name: 'The Boxer',
    title: 'Depth 2, High Aggression',
    description: 'Swings hard, trades often. Loves complications.',
    depth: 2,
    blunderRate: 0.15,
    aggression: 0.9,
    elo: 1600,
    emoji: '🥊',
    used: false,
  },
  {
    id: 'streamer',
    name: 'The Streamer',
    title: 'Depth 3, Unpredictable',
    description: 'Entertaining and chaotic. Never boring.',
    depth: 3,
    blunderRate: 0.1,
    aggression: 0.7,
    elo: 1800,
    emoji: '🎮',
    used: false,
  },
  {
    id: 'professor',
    name: 'The Professor',
    title: 'Depth 3, Positional',
    description: 'Slow and methodical. Builds advantages over time.',
    depth: 3,
    blunderRate: 0.05,
    aggression: 0.3,
    elo: 1900,
    emoji: '📚',
    used: false,
  },
  {
    id: 'rookie',
    name: 'The Rookie',
    title: 'Depth 1, Wildcard',
    description: 'Inexperienced but full of surprises.',
    depth: 1,
    blunderRate: 0.25,
    aggression: 0.5,
    elo: 1200,
    emoji: '🌱',
    used: false,
  },
];
