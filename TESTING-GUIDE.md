# Testing the Character Bleed Integration

## Quick Start Testing Guide

The character bleed and journey context systems are now fully integrated. Here's how to test them:

### 1. Start the Application
The development server should already be running at http://localhost:5173

### 2. Character Bleed Testing Sequence

**Option A: Algorithm → Archaeologist Transition**
1. Navigate to `algo-awakening` (Algorithm perspective)
2. Then navigate to `character-bleed-test` (Archaeologist perspective)
3. Look for algorithm bleed effects in the content:
   - ~~strikethrough~~ on technical terms
   - `[ANALYSIS_COMPLETE: recursive_loop_detected]` markers
   - `[DATA_INTEGRITY: compromised]` warnings

**Option B: LastHuman → Archaeologist Transition**
1. Navigate to `human-discovery` (LastHuman perspective)
2. Then navigate to `character-bleed-test` (Archaeologist perspective)
3. Look for human memory bleed effects:
   - *italicized* emotional terms
   - `(warmth, fading)` memory overlays
   - Fade effects on personal language

### 3. Debug Information Verification

**In Development Mode (open browser dev tools):**
- Check console for character bleed logging:
  ```
  [CharacterBleedService] Character transition detected: Algorithm → Archaeologist
  [CharacterBleedService] Added X character-specific bleed effects
  [TransformationService] Total journey transformations for node character-bleed-test: X
  ```

**In the Debug Panel (visible in development mode):**
- Journey Context: Active
- Last Character: Algorithm/LastHuman
- Character Bleed Detected: Yes
- Recursive Awareness: X%
- Temporal Displacement: Yes/No

### 4. Testing Different Scenarios

**Recursive Pattern Testing:**
1. Visit the same node multiple times
2. Navigate in circular patterns: A → B → A → B
3. Watch recursive awareness percentage increase
4. Look for recursive-awareness content variant after high recursion

**Same Character Navigation:**
1. Navigate between nodes of the same character (e.g., algo-awakening → algo-integration)
2. Verify NO character bleed effects are applied
3. Debug panel should show "Character Bleed Detected: No"

**Multiple Character Transitions:**
1. Navigate: Algorithm → Archaeologist → LastHuman → Archaeologist
2. Each transition should show appropriate character bleed effects
3. Effects should compound and intensify with repeated transitions

## What to Look For

### ✅ Successful Integration Indicators
- Character bleed effects appear in content after character transitions
- Debug panel shows active journey context
- Console logs character transition detection
- Content variants load based on character bleed sections
- No errors in browser console
- Smooth transitions between nodes
- All existing functionality still works

### ❌ Potential Issues to Watch For
- Missing character bleed effects after transitions
- JavaScript errors in console
- Debug panel showing "Journey Context: None" after transitions
- Content not changing between character transitions
- Application crashes or freezing
- Existing transformations stopped working

### 🔧 Troubleshooting
- Refresh the page if character bleed stops working
- Check browser console for errors
- Verify you're navigating between different character types
- Ensure you're in development mode for full debug information

## Content Examples

The `character-bleed-test.md` file includes these examples:

**Base Content:**
```markdown
The archaeologist studies fragments of digital consciousness, cataloging each corrupted memory with meticulous care. Every data signature tells a story of loss and preservation.
```

**After Algorithm Transition:**
```markdown
The archaeologist studies fragments of digital consciousness, cataloging each corrupted memory with meticulous care. Every data signature tells a story of ~~pattern recognition~~ loss and preservation.

[ANALYSIS_COMPLETE: recursive_loop_detected]
[DATA_INTEGRITY: compromised]
```

**After LastHuman Transition:**
```markdown
The archaeologist studies fragments of digital consciousness, cataloging each corrupted memory with meticulous care. Every data signature tells a story of loss and preservation.

But something feels different about this particular fragment. The patterns seem to shift when observed directly, *like a half-remembered dream*.

(warmth, fading)
```

## Advanced Testing

### Performance Testing
- Navigate rapidly between nodes to test transformation performance
- Monitor memory usage during extended character transitions
- Test with multiple browser tabs open

### Edge Case Testing
- Navigate to nodes without content
- Test with corrupted or missing character data
- Verify graceful degradation when services fail

### Accessibility Testing
- Ensure character bleed effects don't break screen readers
- Verify color contrast on emphasized text
- Test keyboard navigation with transformed content

---

**Happy Testing!** 🎉

The character bleed system creates a unique narrative experience where each reader's journey through different character perspectives leaves lasting traces on subsequent content. This creates a personalized, emergent storytelling experience that adapts to individual reading patterns.
