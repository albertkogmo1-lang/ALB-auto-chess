# Auto-Play Fix: useEffect Dependency Issue

## Problem Identified

The auto-play was not starting because of a React hooks dependency issue:

### Root Cause
The `useEffect` that triggers auto-play had `startAutoPlay` in its dependency array:

```typescript
useEffect(() => {
  if (phase === 'commander-draft' && selectedCommanderWhite && selectedCommanderBlack) {
    const timeout = setTimeout(() => {
      startAutoPlay();
    }, 1500);
    
    return () => clearTimeout(timeout);
  }
}, [phase, selectedCommanderWhite, selectedCommanderBlack, startAutoPlay]); // ❌ Problem!
```

### Why This Broke Auto-Play

1. `startAutoPlay` is a `useCallback` that depends on many state variables:
   - `whitePawns`, `whitePieces`, `blackPawns`, `blackPieces`
   - `selectedCommanderWhite`, `selectedCommanderBlack`
   - `whiteCommanders`, `blackCommanders`

2. Every time any of these state variables change, `startAutoPlay` gets a new reference

3. When `startAutoPlay` changes, the `useEffect` re-runs

4. When the `useEffect` re-runs, it **clears the timeout** in the cleanup function

5. This creates a race condition where the timeout is constantly being cleared before it can fire

6. Result: Auto-play never starts!

## Solution: Use useRef

The fix is to use a `useRef` to store the `startAutoPlay` function, which doesn't trigger re-renders:

### Step 1: Create the Ref
```typescript
const startAutoPlayRef = useRef<() => void>(() => {});
```

### Step 2: Keep Ref in Sync
```typescript
useEffect(() => {
  startAutoPlayRef.current = startAutoPlay;
}, [startAutoPlay]);
```

### Step 3: Use Ref in Auto-Play Effect
```typescript
useEffect(() => {
  if (phase === 'commander-draft' && selectedCommanderWhite && selectedCommanderBlack) {
    const timeout = setTimeout(() => {
      startAutoPlayRef.current(); // ✅ Use ref instead of function
    }, 1500);
    
    return () => clearTimeout(timeout);
  }
}, [phase, selectedCommanderWhite, selectedCommanderBlack]); // ✅ No startAutoPlay dependency!
```

## Why This Works

1. **Ref doesn't trigger re-renders**: Changing `startAutoPlayRef.current` doesn't cause the component to re-render

2. **Ref always has latest function**: The sync `useEffect` ensures `startAutoPlayRef.current` always points to the latest `startAutoPlay` function

3. **No dependency cycle**: The auto-play `useEffect` no longer depends on `startAutoPlay`, so it doesn't re-run when the function changes

4. **Timeout can fire**: The timeout is set once and not cleared until the component unmounts or dependencies change

## Code Changes

### File: `src/App.tsx`

**Added:**
```typescript
const startAutoPlayRef = useRef<() => void>(() => {});

// Keep ref in sync with startAutoPlay
useEffect(() => {
  startAutoPlayRef.current = startAutoPlay;
}, [startAutoPlay]);
```

**Modified:**
```typescript
// Before:
startAutoPlay();

// After:
startAutoPlayRef.current();
```

**Removed from dependencies:**
```typescript
// Before:
}, [phase, selectedCommanderWhite, selectedCommanderBlack, startAutoPlay]);

// After:
}, [phase, selectedCommanderWhite, selectedCommanderBlack]);
```

## Expected Behavior Now

When you start a Bot vs Bot game, you should see these logs in sequence:

```
🎯 Auto-play useEffect triggered {phase: 'commander-draft', white: 'The Legend', black: 'The Advanced'}
✅ Both commanders selected, starting auto-play in 1.5s
⏰ Timeout fired, calling startAutoPlay()
🚀 startAutoPlay() called
=== START AUTO PLAY ===
🚀 Starting auto-play
⏱️ Auto-play interval created, ID: [number] interval: 1000 ms
💓 makeMove() called, move count: 0
🎯 Current commander: The Legend ELO: 2600
🤖 getBestMove called for The Legend ELO: 2600
📊 Legal moves: 20
✅ getBestMove returning: e4
🤖 getBestMove returned: e4
💓 makeMove() called, move count: 1
💓 makeMove() called, move count: 2
...
```

## Testing

1. Open browser console (F12)
2. Start a Bot vs Bot game
3. Watch for the logs above
4. Verify moves are being made every second
5. Verify eval bar is updating

## Build Status
✅ Build successful

## Summary

The auto-play was failing because of a React hooks dependency cycle. By using `useRef` to store the `startAutoPlay` function, we broke the cycle and allowed the timeout to fire properly. The auto-play should now work correctly!
