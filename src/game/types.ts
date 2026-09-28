export type GamePhase =
  | 'menu'
  | 'pawn-placement'
  | 'pawn-reveal'
  | 'piece-placement'
  | 'piece-reveal'
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
    id: 'legend',
    name: 'The Legend',
    title: 'Depth 5, Minimal Blunder',
    description: 'World-class calculation. Almost never misses tactics.',
    depth: 5,
    blunderRate: 0.01,
    aggression: 0.5,
    elo: 2600,
    emoji: '👑',
    used: false,
  },
  {
    id: 'master',
    name: 'The Master',
    title: 'Depth 4, Low Blunder',
    description: 'Elite calculation. Rarely misses tactics.',
    depth: 4,
    blunderRate: 0.02,
    aggression: 0.5,
    elo: 2400,
    emoji: '🧠',
    used: false,
  },
  {
    id: 'grandmaster',
    name: 'The Grandmaster',
    title: 'Depth 4, Positional',
    description: 'Strong positional player. Builds advantages methodically.',
    depth: 4,
    blunderRate: 0.04,
    aggression: 0.4,
    elo: 2200,
    emoji: '📚',
    used: false,
  },
  {
    id: 'expert',
    name: 'The Expert',
    title: 'Depth 3, Tactical',
    description: 'Sharp tactical vision. Loves complications.',
    depth: 3,
    blunderRate: 0.08,
    aggression: 0.7,
    elo: 2000,
    emoji: '🎮',
    used: false,
  },
  {
    id: 'advanced',
    name: 'The Advanced',
    title: 'Depth 3, Developing',
    description: 'Solid fundamentals. Still improving.',
    depth: 3,
    blunderRate: 0.12,
    aggression: 0.5,
    elo: 1800,
    emoji: '🌱',
    used: false,
  },
];
