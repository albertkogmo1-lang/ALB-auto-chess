# Debugging Guide - Auto-Play and Eval Issues

## Issues Reported
1. **Auto-play not working** - Moves are not being made
2. **Eval always equal** - Evaluation bar stays near 0

## Debugging Added

I've added comprehensive logging throughout the system to help diagnose the issues. Open your browser's Developer Console (F12) to see these logs.

### 1. Stockfish Initialization Logs

When the game starts auto-play, you should see:

```
🔄 Initializing Stockfish from CDN...
✅ Worker created
📤 Sending UCI command
📨 Stockfish message: Stockfish 10...
📨 Stockfish message: id name Stockfish 10...
...
📨 Stockfish message: uciok
✅ Stockfish ready (uciok received)
✅ Stockfish initialized successfully
```

**If you see this instead:**
```
❌ Stockfish worker error: [error details]
⏱️ Stockfish initialization timeout (5s), using fallback
⚠️ Stockfish failed to initialize, using fallback engine
```

This means Stockfish failed to load from the CDN and the system is using the fallback engine.

### 2. Move Generation Logs

For each move, you should see:

```
🎬 makeMove called - Move 1, Turn: w
🎯 White to move: The Legend
🎯 The Legend (2600 ELO) has 20 legal moves
🧠 The Legend (ELO 2600) thinking with Stockfish: depth=14, skill=20
📨 Stockfish message: info depth 1...
📨 Stockfish message: info depth 2...
...
📨 Stockfish message: bestmove e2e4
✅ The Legend plays: e4 (eval: 15cp, depth: 14)
✅ Move made: e4
📊 Stockfish eval: 15cp
📊 Normalized eval: 1.5
📊 Eval after move: 1.5
```

**If Stockfish fails, you'll see:**
```
⚠️ Stockfish not available
🎲 The Legend using fallback engine (depth 14)
✅ The Legend plays (fallback): e4
📊 Custom eval: 0.5
📊 Eval after move: 0.5
```

### 3. Interval Logs

You should see this every 1 second (MOVE_INTERVAL):

```
⏰ Interval triggered
```

If you don't see this, the interval isn't running.

## Common Issues and Solutions

### Issue 1: Stockfish CDN Blocked

**Symptoms:**
```
❌ Stockfish worker error: Error loading script
⏱️ Stockfish initialization timeout (5s), using fallback
```

**Cause:** The CDN URL `https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js` is being blocked by:
- Ad blockers
- Corporate firewalls
- Browser security policies
- Network issues

**Solutions:**
1. Disable ad blockers for this site
2. Try a different browser
3. Check network connectivity
4. Use the fallback engine (it will still work, just weaker)

### Issue 2: Eval Always Equal (Near 0)

**Symptoms:**
- Eval bar stays near center
- Logs show: `📊 Custom eval: 0` or `📊 Normalized eval: 0`

**Possible Causes:**

#### A. Using Fallback Engine with Weak Evaluation

The custom evaluation function is very simple:
- Material count (piece values)
- Basic piece-square tables
- Mobility bonus

In the opening, both sides have equal material, so eval ≈ 0.

**Solution:** This is expected behavior for the fallback engine. The eval will change as pieces are captured.

#### B. Stockfish Eval Not Being Parsed

**Symptoms:**
```
📨 Stockfish message: info depth 12 ...
📨 Stockfish message: bestmove e2e4
⚠️ Stockfish eval failed: [error]
📊 Custom eval: 0
```

**Cause:** The regex patterns in `stockfish.ts` aren't matching Stockfish's output format.

**Check:** Look at the Stockfish messages in the console. They should contain:
- `info depth X score cp Y` (for centipawn evaluation)
- `info depth X score mate Y` (for mate detection)

If the format is different, the parsing will fail.

#### C. Eval Normalization Too Aggressive

The normalization divides by 10:
```typescript
const normalized = Math.max(-100, Math.min(100, eval_ / 10));
```

So:
- Stockfish eval of 100cp → Normalized to 10
- Stockfish eval of 1000cp → Normalized to 100
- Stockfish eval of 15cp → Normalized to 1.5

**This is intentional** - Stockfish's centipawn scale is much larger than our -100 to 100 scale.

### Issue 3: No Moves Being Made

**Symptoms:**
- Game starts but no moves appear
- Console shows: `🎬 makeMove called` but no `✅ Move made`

**Possible Causes:**

#### A. getBestMove Returning null

**Check logs for:**
```
⚠️ No legal moves available
```
or
```
❌ No move returned from getBestMove!
```

**Cause:** The position has no legal moves (checkmate or stalemate) or the engine failed.

#### B. Interval Not Running

**Check logs for:**
```
⏱️ Starting auto-play interval: 1000ms
```

If you don't see this, `startAutoPlay()` isn't being called.

**Check:** Are both commanders selected? The auto-play only starts when:
```typescript
if (phase === 'commander-draft' && selectedCommanderWhite && selectedCommanderBlack)
```

#### C. Async/Await Issues

The `makeMove` function is async, but `setInterval` doesn't wait for it to complete. If a move takes longer than 1 second (e.g., Stockfish depth 14), multiple `makeMove` calls can overlap.

**Solution:** The code should handle this, but check for:
```
🎬 makeMove called - Move 1, Turn: w
🎬 makeMove called - Move 1, Turn: w  // Called again before first finished!
```

## Testing the System

### Test 1: Check Stockfish Loading

1. Open the game
2. Start a match (Bot vs Bot mode)
3. Open Developer Console (F12)
4. Look for Stockfish initialization logs

**Expected:**
```
✅ Stockfish initialized successfully
```

**If failed:**
```
⚠️ Stockfish failed to initialize, using fallback engine
```

### Test 2: Check Move Generation

1. Wait for auto-play to start
2. Look for move logs

**Expected:**
```
🎯 The Legend (2600 ELO) has 20 legal moves
✅ The Legend plays: e4 (eval: 15cp, depth: 14)
```

**If failed:**
```
❌ No move returned from getBestMove!
```

### Test 3: Check Evaluation

1. Watch the eval bar during gameplay
2. Check console logs

**Expected:**
```
📊 Stockfish eval: 150cp
📊 Normalized eval: 15
```

**If always 0:**
```
📊 Custom eval: 0
```

## Fallback Engine Behavior

If Stockfish fails to load, the system uses a custom minimax engine with:
- **Depth:** 4-14 (based on commander ELO)
- **Evaluation:** Simple material + piece-square tables
- **Strength:** Much weaker than Stockfish (~1200-1800 ELO)

The fallback engine will:
- Make legal moves
- Avoid obvious blunders (within its depth)
- Show eval changes when material is captured
- Play slower at higher depths

## Next Steps

1. **Open the game and check the console**
2. **Share the console logs** so I can see exactly what's happening
3. **Identify the failure point:**
   - Is Stockfish loading?
   - Are moves being generated?
   - Is the eval being calculated?

With the comprehensive logging now in place, we should be able to pinpoint the exact issue.
