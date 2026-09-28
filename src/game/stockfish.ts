// Stockfish Engine Wrapper using Web Worker
// Loads Stockfish from CDN for reliable browser integration

const STOCKFISH_CDN_URL = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

class StockfishEngine {
  private worker: Worker | null = null;
  private ready: boolean = false;
  private onMessage: ((msg: string) => void) | null = null;
  private useFallback: boolean = false;

  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create worker code that loads Stockfish from CDN
        const workerCode = `
          importScripts('${STOCKFISH_CDN_URL}');
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        this.worker = new Worker(workerUrl);
        
        this.worker.onmessage = (e) => {
          const msg = typeof e.data === 'string' ? e.data : '';
          
          if (msg.includes('uciok')) {
            this.ready = true;
            resolve(true);
          }
          
          if (this.onMessage) {
            this.onMessage(msg);
          }
        };
        
        this.worker.onerror = (e) => {
          console.warn('Stockfish worker error, using fallback:', e);
          this.useFallback = true;
          resolve(false);
        };
        
        // Initialize UCI
        this.send('uci');
        
        // Timeout fallback
        setTimeout(() => {
          if (!this.ready) {
            console.warn('Stockfish initialization timeout, using fallback');
            this.useFallback = true;
            resolve(false);
          }
        }, 5000);
        
      } catch (error) {
        console.warn('Failed to initialize Stockfish:', error);
        this.useFallback = true;
        resolve(false);
      }
    });
  }

  send(command: string): void {
    if (this.worker && !this.useFallback) {
      this.worker.postMessage(command);
    }
  }

  setOnMessage(handler: (msg: string) => void): void {
    this.onMessage = handler;
  }

  isReady(): boolean {
    return this.ready && !this.useFallback;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
  }
}

export interface StockfishResult {
  bestMove: string;
  evaluation: number; // in centipawns
  depth: number;
  isMate: boolean;
  mateIn?: number;
}

export class StockfishService {
  private engine: StockfishEngine;
  private initialized: boolean = false;

  constructor() {
    this.engine = new StockfishEngine();
  }

  async initialize(): Promise<boolean> {
    this.initialized = await this.engine.initialize();
    if (this.initialized) {
      this.engine.send('setoption name MultiPV value 1');
      this.engine.send('isready');
    }
    return this.initialized;
  }

  async getBestMove(fen: string, depth: number, skillLevel: number = 20): Promise<StockfishResult | null> {
    if (!this.initialized) return null;

    return new Promise((resolve) => {
      let result: StockfishResult | null = null;
      let resolved = false;

      const handler = (msg: string) => {
        // Parse "info depth X score cp Y" or "info depth X score mate Y"
        if (msg.startsWith('info') && msg.includes('depth')) {
          const depthMatch = msg.match(/depth (\d+)/);
          const cpMatch = msg.match(/score cp (-?\d+)/);
          const mateMatch = msg.match(/score mate (-?\d+)/);
          const pvMatch = msg.match(/pv (\S+)/);

          if (depthMatch && (cpMatch || mateMatch)) {
            const currentDepth = parseInt(depthMatch[1]);
            
            if (currentDepth >= depth) {
              result = {
                bestMove: pvMatch ? pvMatch[1] : '',
                evaluation: cpMatch ? parseInt(cpMatch[1]) : (mateMatch ? (parseInt(mateMatch[1]) > 0 ? 10000 : -10000) : 0),
                depth: currentDepth,
                isMate: !!mateMatch,
                mateIn: mateMatch ? parseInt(mateMatch[1]) : undefined,
              };
            }
          }
        }

        // Parse "bestmove" response
        if (msg.startsWith('bestmove')) {
          const parts = msg.split(' ');
          const bestMove = parts[1];
          
          if (result) {
            result.bestMove = bestMove;
          } else {
            result = {
              bestMove: bestMove,
              evaluation: 0,
              depth: 0,
              isMate: false,
            };
          }

          if (!resolved) {
            resolved = true;
            this.engine.setOnMessage(() => {});
            resolve(result);
          }
        }
      };

      this.engine.setOnMessage(handler);
      
      // Set skill level (0-20, where 20 is full strength)
      this.engine.send(`setoption name Skill Level value ${skillLevel}`);
      this.engine.send(`setoption name Threads value 1`);
      this.engine.send(`setoption name Hash value 16`);
      this.engine.send('ucinewgame');
      this.engine.send(`position fen ${fen}`);
      this.engine.send(`go depth ${depth}`);

      // Timeout fallback (increased for deeper searches)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.engine.setOnMessage(() => {});
          resolve(result);
        }
      }, 30000);
    });
  }

  async getEvaluation(fen: string, depth: number = 12): Promise<number> {
    const result = await this.getBestMove(fen, depth);
    return result ? result.evaluation : 0;
  }

  destroy(): void {
    this.engine.destroy();
    this.initialized = false;
  }
}

// Singleton instance
let stockfishInstance: StockfishService | null = null;

export async function getStockfish(): Promise<StockfishService | null> {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishService();
    const success = await stockfishInstance.initialize();
    if (!success) {
      stockfishInstance = null;
    }
  }
  return stockfishInstance;
}
