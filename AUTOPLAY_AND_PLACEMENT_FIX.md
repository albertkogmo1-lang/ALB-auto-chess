# Auto-Play Freezing & Piece Placement Rules Fix

## Issues Fixed

### 1. Auto-Play Freezing After Move 1
**Problem:** The game would freeze after making the first move during auto-play.

**Root Cause:** The `moves` variable was captured in a closure inside `setInterval`, so it never updated. Each interval tick was using the same initial value of `moves = 0`.

**Solution:** Changed `moves` from a primitive variable to a ref object:
```typescript
// Before (broken)
let moves = 0;
const makeMove = () => {
  moves++; // This doesn't persist across interval ticks
};

// After (fixed)
const movesRef = { count: 0 };
const makeMove = () => {
  movesRef.count++; // This persists across interval ticks
};
```

### 2. Piece Placement Rules
**Problem:** The King was being placed in row 4, but according to the game rules:
- **King**: Can only be placed in rows 1-2 (white) or 7-8 (black)
- **Other pieces (Queen, Rook, Bishop, Knight)**: Can be placed anywhere in rows 1-4 (white) or 5-8 (black)
- **Pawns**: Can be placed in rows 2-4 (white) or 5-7 (black)

**Solution:** 
1. Created `getKingDeploymentSquares()` function to return only rows 1-2 and 7-8
2. Updated `getPieceDeploymentSquares()` to return rows 1-4 and 5-8
3. Updated all placement logic to handle King separately from other pieces
4. Updated Board component to show different zones based on selected piece type

## Files Modified

### 1. `src/game/placement.ts`
- Added `getKingDeploymentSquares()` function
- Updated `getPieceDeploymentSquares()` to return full zone (rows 1-4/5-8)

### 2. `src/App.tsx`
- Fixed closure issue in `startAutoPlay()` by using `movesRef` object
- Updated `startBotPiecePlacement()` to place King first in restricted zone
- Updated `handlePiecePlacement()` to validate zone based on piece type
- Updated bot auto-placement effect to follow new rules
- Updated `handleReady()` auto-fill logic to place King in correct zone
- Updated `startAutoPlay()` auto-fill logic to place King in correct zone
- Added `selectedPiece` prop to Board component

### 3. `src/components/Board.tsx`
- Added `selectedPiece` prop to interface
- Updated `getZoneHighlight()` to show different zones for King vs other pieces
- Updated `inZone` calculation to match new placement rules
- King shows yellow highlight in rows 1-2/7-8
- Other pieces show green highlight in rows 1-4/5-8

## Placement Rules Summary

### White Side
| Piece Type | Allowed Rows | Squares |
|------------|--------------|---------|
| King | 1-2 | 16 squares |
| Queen, Rook, Bishop, Knight | 1-4 | 32 squares |
| Pawns | 2-4 | 24 squares |

### Black Side
| Piece Type | Allowed Rows | Squares |
|------------|--------------|---------|
| King | 7-8 | 16 squares |
| Queen, Rook, Bishop, Knight | 5-8 | 32 squares |
| Pawns | 5-7 | 24 squares |

## Testing Checklist

- [x] Auto-play continues making moves without freezing
- [x] King can only be placed in rows 1-2 (white) or 7-8 (black)
- [x] Other pieces can be placed anywhere in rows 1-4 (white) or 5-8 (black)
- [x] Pawns can be placed in rows 2-4 (white) or 5-7 (black)
- [x] Bot places King in correct zone
- [x] Auto-fill places King in correct zone
- [x] Visual highlighting shows correct zones based on selected piece
- [x] Build succeeds without errors

## Build Status
✅ Build successful - no errors or warnings
