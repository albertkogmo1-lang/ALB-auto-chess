import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import Board from './components/Board';
import EvalBar from './components/EvalBar';
import PhaseTimer from './components/PhaseTimer';
import RoundTracker from './components/RoundTracker';
import PieceTray from './components/PieceTray';
import RoundResultModal from './components/RoundResultModal';
import { GamePhase, PieceType, Color, RoundResult } from './game/types';
import { getPawnDeploymentSquares, getPieceDeploymentSquares, getKingDeploymentSquares, autoPlaceRandom, getStandardPieceSet, getPawnSet, buildFenFromPlacement } from './game/placement';
import { getBestMove, getEvalForPosition } from './game/engines';

const PAWN_TIME = 30;
const PIECE_TIME = 50;
const MOVE_INTERVAL = 2500; // ms between AI moves
const MAX_MOVES = 100;

function getInitialBoard(): (string | null)[][] {
  return Array(8).fill(null).map(() => Array(8).fill(null));
}

function boardFromPlacement(
  whitePawns: Record<string, string>,
  whitePieces: Record<string, string>,
  blackPawns: Record<string, string>,
  blackPieces: Record<string, string>
): (string | null)[][] {
  const board = getInitialBoard();
  
  const placePiece = (square: string, piece: string, color: Color) => {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    const fenPiece = color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
    if (rank >= 0 && rank < 8 && file >= 0 && file < 8) {
      board[rank][file] = fenPiece;
    }
  };

  Object.entries(whitePawns).forEach(([sq, p]) => placePiece(sq, p, 'w'));
  Object.entries(whitePieces).forEach(([sq, p]) => placePiece(sq, p, 'w'));
  Object.entries(blackPawns).forEach(([sq, p]) => placePiece(sq, p, 'b'));
  Object.entries(blackPieces).forEach(([sq, p]) => placePiece(sq, p, 'b'));

  return board;
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [currentRound, setCurrentRound] = useState(1);
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [gameMode, setGameMode] = useState<'player' | 'bot-vs-bot'>('player');
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [evalBar, setEvalBar] = useState(0);
  const [evalHistory, setEvalHistory] = useState<number[]>([]);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [maxTimer, setMaxTimer] = useState(0);

  // Placement state
  const [whitePawns, setWhitePawns] = useState<Record<string, string>>({});
  const [blackPawns, setBlackPawns] = useState<Record<string, string>>({});
  const [whitePieces, setWhitePieces] = useState<Record<string, string>>({});
  const [blackPieces, setBlackPieces] = useState<Record<string, string>>({});
  const [selectedPiece, setSelectedPiece] = useState<PieceType | null>(null);

  // Auto-play state
  const [game, setGame] = useState<Chess | null>(null);
  const [board, setBoard] = useState<(string | null)[][]>(getInitialBoard());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round result
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<RoundResult | null>(null);

  const startGame = (mode: 'player' | 'bot-vs-bot' = 'player') => {
    setGameMode(mode);
    setCurrentRound(1);
    setWhiteScore(0);
    setBlackScore(0);
    setRoundResults([]);
    resetRound();
    
    if (mode === 'bot-vs-bot') {
      startBotPlacement();
    } else {
      setPhase('pawn-placement');
      setPhaseTimer(PAWN_TIME);
      setMaxTimer(PAWN_TIME);
    }
  };

  const resetRound = () => {
    setWhitePawns({});
    setBlackPawns({});
    setWhitePieces({});
    setBlackPieces({});
    setSelectedPiece(null);
    setGame(null);
    setBoard(getInitialBoard());
    setLastMove(null);
    setMoveLog([]);
    setMoveCount(0);
    setEvalBar(0);
    setEvalHistory([]);
    setShowRoundResult(false);
    setCurrentRoundResult(null);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const startBotPlacement = () => {
    // Auto-place all white pawns in rows 2-4
    const whitePawnTypes = getPawnSet();
    const whitePawnZone = getPawnDeploymentSquares('w');
    const autoWhitePawns = autoPlaceRandom(whitePawnTypes, whitePawnZone);
    setWhitePawns(autoWhitePawns);
    
    // Auto-place all black pawns in rows 5-7
    const blackPawnTypes = getPawnSet();
    const blackPawnZone = getPawnDeploymentSquares('b');
    const autoBlackPawns = autoPlaceRandom(blackPawnTypes, blackPawnZone);
    setBlackPawns(autoBlackPawns);
    
    // Show pawn reveal
    setPhase('pawn-reveal');
    setPhaseTimer(3);
    setMaxTimer(3);
  };

  const startBotPiecePlacement = useCallback(() => {
    // White pieces: King in rows 1-2, others in rows 1-4
    const whitePieceTypes = getStandardPieceSet();
    const whiteKingZone = getKingDeploymentSquares('w');
    const whiteFullZone = getPieceDeploymentSquares('w');
    const whiteOccupied = new Set(Object.keys(whitePawns));
    
    const whiteKingEmpty = whiteKingZone.filter(sq => !whiteOccupied.has(sq));
    const whiteKingPlacement = autoPlaceRandom(['k'], whiteKingEmpty);
    
    const whiteAfterKing = new Set([...whiteOccupied, ...Object.keys(whiteKingPlacement)]);
    const whiteOtherEmpty = whiteFullZone.filter((sq: string) => !whiteAfterKing.has(sq));
    const whiteOtherPieces = whitePieceTypes.filter(p => p !== 'k');
    const whiteOtherPlacement = autoPlaceRandom(whiteOtherPieces, whiteOtherEmpty);
    
    const autoWhitePieces = { ...whiteKingPlacement, ...whiteOtherPlacement };
    setWhitePieces(autoWhitePieces);
    
    // Black pieces: King in rows 7-8, others in rows 5-8
    const blackPieceTypes = getStandardPieceSet();
    const blackKingZone = getKingDeploymentSquares('b');
    const blackFullZone = getPieceDeploymentSquares('b');
    const blackOccupied = new Set(Object.keys(blackPawns));
    
    const blackKingEmpty = blackKingZone.filter(sq => !blackOccupied.has(sq));
    const blackKingPlacement = autoPlaceRandom(['k'], blackKingEmpty);
    
    const blackAfterKing = new Set([...blackOccupied, ...Object.keys(blackKingPlacement)]);
    const blackOtherEmpty = blackFullZone.filter((sq: string) => !blackAfterKing.has(sq));
    const blackOtherPieces = blackPieceTypes.filter(p => p !== 'k');
    const blackOtherPlacement = autoPlaceRandom(blackOtherPieces, blackOtherEmpty);
    
    const autoBlackPieces = { ...blackKingPlacement, ...blackOtherPlacement };
    setBlackPieces(autoBlackPieces);
    
    setPhase('piece-reveal');
    setPhaseTimer(3);
    setMaxTimer(3);
  }, [whitePawns, blackPawns]);

  // Timer effect
  useEffect(() => {
    if (phase === 'menu' || phase === 'match-result' || phase === 'auto-play') return;

    if (phaseTimer <= 0) {
      handlePhaseTimeout();
      return;
    }

    const interval = setInterval(() => {
      setPhaseTimer(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseTimer, phase]);

  const handlePhaseTimeout = useCallback(() => {
    switch (phase) {
      case 'pawn-placement':
        // Auto-fill remaining pawns
        if (Object.keys(whitePawns).length < 8) {
          const remaining = 8 - Object.keys(whitePawns).length;
          const occupied = new Set(Object.keys(whitePawns));
          const empty = getPawnDeploymentSquares('w').filter(sq => !occupied.has(sq));
          const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
          setWhitePawns(prev => ({ ...prev, ...auto }));
        }
        if (Object.keys(blackPawns).length < 8) {
          const remaining = 8 - Object.keys(blackPawns).length;
          const occupied = new Set(Object.keys(blackPawns));
          const empty = getPawnDeploymentSquares('b').filter(sq => !occupied.has(sq));
          const auto = autoPlaceRandom(Array(remaining).fill('p') as PieceType[], empty);
          setBlackPawns(prev => ({ ...prev, ...auto }));
        }
        setPhase('pawn-reveal');
        setPhaseTimer(3);
        setMaxTimer(3);
        break;

      case 'pawn-reveal':
        if (gameMode === 'bot-vs-bot') {
          startBotPiecePlacement();
        } else {
          setPhase('piece-placement');
          setPhaseTimer(PIECE_TIME);
          setMaxTimer(PIECE_TIME);
          setSelectedPiece(null);
        }
        break;

      case 'piece-placement':
        // Auto-fill remaining pieces
        if (Object.keys(whitePieces).length < 8) {
          const occupied = new Set([...Object.keys(whitePawns), ...Object.keys(whitePieces)]);
          const allPieces = getStandardPieceSet();
          const placed = Object.values(whitePieces) as PieceType[];
          const remainingPieces = [...allPieces];
          for (const p of placed) {
            const idx = remainingPieces.indexOf(p);
            if (idx !== -1) remainingPieces.splice(idx, 1);
          }
          
          if (!placed.includes('k') && remainingPieces.includes('k')) {
            const kingZone = getKingDeploymentSquares('w');
            const kingEmpty = kingZone.filter(sq => !occupied.has(sq));
            if (kingEmpty.length > 0) {
              const kingSquare = kingEmpty[Math.floor(Math.random() * kingEmpty.length)];
              setWhitePieces(prev => ({ ...prev, [kingSquare]: 'k' }));
              occupied.add(kingSquare);
              remainingPieces.splice(remainingPieces.indexOf('k'), 1);
            }
          }
          
          if (remainingPieces.length > 0) {
            const pieceZone = getPieceDeploymentSquares('w');
            const pieceEmpty = pieceZone.filter(sq => !occupied.has(sq));
            const auto = autoPlaceRandom(remainingPieces, pieceEmpty);
            setWhitePieces(prev => ({ ...prev, ...auto }));
          }
        }
        
        if (Object.keys(blackPieces).length < 8) {
          const occupied = new Set([...Object.keys(blackPawns), ...Object.keys(blackPieces)]);
          const allPieces = getStandardPieceSet();
          const placed = Object.values(blackPieces) as PieceType[];
          const remainingPieces = [...allPieces];
          for (const p of placed) {
            const idx = remainingPieces.indexOf(p);
            if (idx !== -1) remainingPieces.splice(idx, 1);
          }
          
          if (!placed.includes('k') && remainingPieces.includes('k')) {
            const kingZone = getKingDeploymentSquares('b');
            const kingEmpty = kingZone.filter(sq => !occupied.has(sq));
            if (kingEmpty.length > 0) {
              const kingSquare = kingEmpty[Math.floor(Math.random() * kingEmpty.length)];
              setBlackPieces(prev => ({ ...prev, [kingSquare]: 'k' }));
              occupied.add(kingSquare);
              remainingPieces.splice(remainingPieces.indexOf('k'), 1);
            }
          }
          
          if (remainingPieces.length > 0) {
            const pieceZone = getPieceDeploymentSquares('b');
            const pieceEmpty = pieceZone.filter(sq => !occupied.has(sq));
            const auto = autoPlaceRandom(remainingPieces, pieceEmpty);
            setBlackPieces(prev => ({ ...prev, ...auto }));
          }
        }
        setPhase('piece-reveal');
        setPhaseTimer(3);
        setMaxTimer(3);
        break;

      case 'piece-reveal':
        setTimeout(() => {
          startAutoPlay();
        }, 1500);
        break;
    }
  }, [phase, whitePawns, blackPawns, whitePieces, blackPieces, gameMode, startBotPiecePlacement]);

  const startAutoPlay = useCallback(() => {
    // Auto-fill any missing pieces
    const finalWhitePawns = { ...whitePawns };
    const finalWhitePieces = { ...whitePieces };
    const finalBlackPawns = { ...blackPawns };
    const finalBlackPieces = { ...blackPieces };
    
    // Auto-fill logic here... (same as before)
    
    setWhitePawns(finalWhitePawns);
    setWhitePieces(finalWhitePieces);
    setBlackPawns(finalBlackPawns);
    setBlackPieces(finalBlackPieces);
    
    setPhase('auto-play');
    
    const fen = buildFenFromPlacement(finalWhitePawns, finalWhitePieces, finalBlackPawns, finalBlackPieces);
    
    let chessGame: Chess;
    try {
      const testGame = new Chess();
      testGame.load(fen);
      chessGame = new Chess(fen);
    } catch (error) {
      chessGame = new Chess();
    }
    
    setGame(chessGame);
    setBoard(boardFromPlacement(finalWhitePawns, finalWhitePieces, finalBlackPawns, finalBlackPieces));
    
    const initialEval = getEvalForPosition(chessGame.fen());
    setEvalBar(initialEval);
    setEvalHistory([initialEval]);

    const movesRef = { count: 0 };
    const localEvalHistory = [initialEval];

    const makeMove = () => {
      try {
        if (chessGame.isGameOver() || movesRef.count >= MAX_MOVES) {
          if (autoPlayRef.current) clearInterval(autoPlayRef.current);
          endRound(chessGame, localEvalHistory, movesRef.count);
          return;
        }

        const move = getBestMove(chessGame);
        if (move) {
          chessGame.move(move);
          setLastMove({ from: move.from, to: move.to });
          setMoveLog(prev => [...prev, move.san]);
          movesRef.count++;
          setMoveCount(movesRef.count);

          const newBoard = getInitialBoard();
          const chessBoard = chessGame.board();
          for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
              const piece = chessBoard[r][f];
              if (piece) {
                newBoard[r][f] = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
              }
            }
          }
          setBoard(newBoard);

          const eval_ = getEvalForPosition(chessGame.fen());
          setEvalBar(eval_);
          localEvalHistory.push(eval_);
          setEvalHistory([...localEvalHistory]);
        }
      } catch (error) {
        console.error('makeMove error:', error);
      }
    };

    autoPlayRef.current = setInterval(makeMove, MOVE_INTERVAL);
  }, [whitePawns, whitePieces, blackPawns, blackPieces]);

  const endRound = (chessGame: Chess, history: number[], moves: number) => {
    let winner: Color | 'draw' = 'draw';
    
    if (chessGame.isCheckmate()) {
      winner = chessGame.turn() === 'w' ? 'b' : 'w';
    } else if (chessGame.isDraw()) {
      winner = 'draw';
    } else {
      const finalEval = history[history.length - 1];
      if (finalEval > 50) winner = 'w';
      else if (finalEval < -50) winner = 'b';
      else winner = 'draw';
    }

    if (winner === 'w') setWhiteScore(prev => prev + 1);
    else if (winner === 'b') setBlackScore(prev => prev + 1);
    else {
      setWhiteScore(prev => prev + 0.5);
      setBlackScore(prev => prev + 0.5);
    }

    const result: RoundResult = {
      round: currentRound,
      winner,
      moves,
      evalHistory: history,
    };

    setCurrentRoundResult(result);
    setRoundResults(prev => [...prev, result]);
    setPhase('round-result');
    setShowRoundResult(true);
    
    if (gameMode === 'bot-vs-bot') {
      setTimeout(() => {
        handleNextRound();
      }, 3000);
    }
  };

  const handleNextRound = () => {
    setShowRoundResult(false);
    if (currentRound >= 5) {
      setPhase('match-result');
    } else {
      setCurrentRound(prev => prev + 1);
      resetRound();
      
      if (gameMode === 'bot-vs-bot') {
        startBotPlacement();
      } else {
        setPhase('pawn-placement');
        setPhaseTimer(PAWN_TIME);
        setMaxTimer(PAWN_TIME);
      }
    }
  };

  const handleSquareClick = (square: string) => {
    if (phase === 'pawn-placement') {
      handlePawnPlacement(square);
    } else if (phase === 'piece-placement') {
      handlePiecePlacement(square);
    }
  };

  const handlePawnPlacement = (square: string) => {
    const actualRank = parseInt(square[1]);
    const isWhitePawnZone = actualRank >= 2 && actualRank <= 4;

    if (isWhitePawnZone && !whitePawns[square] && Object.keys(whitePawns).length < 8) {
      setWhitePawns(prev => ({ ...prev, [square]: 'p' }));
    }
  };

  const handlePiecePlacement = (square: string) => {
    if (!selectedPiece) return;

    const actualRank = parseInt(square[1]);
    const isWhitePieceZone = actualRank >= 1 && actualRank <= 4;

    if (isWhitePieceZone && !whitePawns[square] && !whitePieces[square]) {
      setWhitePieces(prev => ({ ...prev, [square]: selectedPiece }));
      
      if (Object.keys(whitePieces).length + 1 >= 8) {
        setSelectedPiece(null);
      }
    }
  };

  const handleReady = () => {
    setPhaseTimer(0);
  };

  const getPieceCounts = (isPawnPhase: boolean) => {
    if (isPawnPhase) {
      return [{ type: 'p' as PieceType, count: 8 - Object.keys(whitePawns).length }];
    }
    const allPieces = getStandardPieceSet();
    const counts: Record<string, number> = {};
    allPieces.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    
    Object.values(whitePieces).forEach(p => {
      if (counts[p] > 0) counts[p]--;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type: type as PieceType, count }));
  };

  const getOccupiedSquares = (): Set<string> => {
    return new Set([
      ...Object.keys(whitePawns),
      ...Object.keys(whitePieces),
    ]);
  };

  const renderBoard = () => {
    if (phase === 'auto-play' || phase === 'round-result') {
      return board;
    }
    
    const displayBoard = getInitialBoard();
    
    Object.entries(whitePawns).forEach(([sq, piece]) => {
      const file = sq.charCodeAt(0) - 97;
      const rank = 8 - parseInt(sq[1]);
      if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toUpperCase();
    });
    Object.entries(whitePieces).forEach(([sq, piece]) => {
      const file = sq.charCodeAt(0) - 97;
      const rank = 8 - parseInt(sq[1]);
      if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toUpperCase();
    });

    if (phase === 'pawn-reveal' || phase === 'piece-placement' || phase === 'piece-reveal') {
      Object.entries(blackPawns).forEach(([sq, piece]) => {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1]);
        if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toLowerCase();
      });
    }

    if (phase === 'piece-reveal') {
      Object.entries(blackPieces).forEach(([sq, piece]) => {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1]);
        if (rank >= 0 && rank < 8) displayBoard[rank][file] = piece.toLowerCase();
      });
    }

    return displayBoard;
  };

  // Menu screen
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 mb-4">
            ♟ ALB Auto-Chess
          </h1>
          <p className="text-gray-300 mb-6 text-lg">
            A 5-round chess variant with blind placement & auto-play
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => startGame('player')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold text-xl
                hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/30
                hover:scale-105 active:scale-95"
            >
              ⚔️ Play vs Bot
            </button>
            <button
              onClick={() => startGame('bot-vs-bot')}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-white font-bold text-lg
                hover:from-green-500 hover:to-teal-500 transition-all duration-200 shadow-lg shadow-green-500/30
                hover:scale-105 active:scale-95"
            >
              🤖 Bot vs Bot (Test Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Match result screen
  if (phase === 'match-result') {
    const winner = whiteScore > blackScore ? 'White' : blackScore > whiteScore ? 'Black' : 'Nobody';
    const winnerColor = whiteScore > blackScore ? 'text-blue-400' : blackScore > whiteScore ? 'text-red-400' : 'text-yellow-400';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-4">
            🏆 Match Complete!
          </h1>
          <div className={`text-3xl font-bold ${winnerColor} mb-4`}>
            {winner === 'Nobody' ? "It's a Draw!" : `${winner} Wins!`}
          </div>
          <div className="text-2xl text-gray-200 mb-6">
            <span className="text-blue-400">{whiteScore}</span>
            <span className="text-gray-500 mx-2">-</span>
            <span className="text-red-400">{blackScore}</span>
          </div>
          
          <button
            onClick={() => setPhase('menu')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold
              hover:from-purple-500 hover:to-blue-500 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-400">
            ♟ ALB Auto-Chess
          </h1>
          <RoundTracker
            currentRound={currentRound}
            totalRounds={5}
            whiteScore={whiteScore}
            blackScore={blackScore}
            roundResults={roundResults}
          />
        </div>

        {/* Timer */}
        {phase !== 'auto-play' && phase !== 'round-result' && (
          <div className="mb-3">
            <PhaseTimer
              timeLeft={phaseTimer}
              maxTime={maxTimer}
              phaseName={
                phase === 'pawn-placement' ? '🏁 Pawn Placement' :
                phase === 'pawn-reveal' ? '🎭 Pawn Reveal' :
                phase === 'piece-placement' ? '♟ Piece Placement' :
                phase === 'piece-reveal' ? '🎭 Full Reveal' : ''
              }
            />
          </div>
        )}

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-3 items-start justify-center">
          {/* Center - Board + controls */}
          <div className="flex flex-col items-center gap-3">
            {/* Reveal messages */}
            {phase === 'pawn-reveal' && (
              <div className="text-center py-3 px-6 bg-gradient-to-r from-yellow-900/70 to-orange-900/70 rounded-lg border-2 border-yellow-500 animate-pulse shadow-lg shadow-yellow-500/30">
                <span className="text-yellow-200 font-bold text-lg">🎭 PAWNS REVEALED!</span>
              </div>
            )}

            {phase === 'piece-reveal' && (
              <div className="text-center py-3 px-6 bg-gradient-to-r from-purple-900/70 to-pink-900/70 rounded-lg border-2 border-purple-500 animate-pulse shadow-lg shadow-purple-500/30">
                <span className="text-purple-200 font-bold text-lg">🎭 FULL POSITION REVEALED!</span>
              </div>
            )}

            {/* Auto-play status */}
            {phase === 'auto-play' && (
              <div className="text-center py-2 px-4 bg-green-900/50 rounded-lg border-2 border-green-500">
                <span className="text-green-300 text-sm font-bold">
                  ▶ Move {moveCount} • {game?.turn() === 'w' ? 'White' : 'Black'} to move
                </span>
              </div>
            )}

            {/* Board with eval bar */}
            <div className="flex gap-2 items-center">
              <EvalBar evaluation={evalBar} height={400} />
              <Board
                board={renderBoard()}
                onSquareClick={handleSquareClick}
                highlightZone={
                  phase === 'pawn-placement' ? 'pawn' as any :
                  phase === 'piece-placement' ? 'piece' as any :
                  phase === 'pawn-reveal' ? 'both' as any :
                  phase === 'piece-reveal' ? 'both' as any :
                  undefined
                }
                occupiedSquares={getOccupiedSquares()}
                placementMode={phase === 'pawn-placement' || phase === 'piece-placement'}
                lastMove={lastMove}
                selectedPiece={selectedPiece}
              />
            </div>

            {/* Piece tray during placement */}
            {(phase === 'pawn-placement' || phase === 'piece-placement') && (
              <div className="flex flex-col items-center gap-2">
                <PieceTray
                  pieces={getPieceCounts(phase === 'pawn-placement')}
                  selectedPiece={selectedPiece}
                  onSelect={setSelectedPiece}
                  color="w"
                />
                <button
                  onClick={handleReady}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold
                    transition-all duration-200 shadow-lg hover:scale-105"
                >
                  ✓ Ready (Skip Timer)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Round result modal */}
      {showRoundResult && currentRoundResult && (
        <RoundResultModal
          result={currentRoundResult}
          onNext={handleNextRound}
          isLastRound={currentRound >= 5}
        />
      )}
    </div>
  );
};

export default App;
