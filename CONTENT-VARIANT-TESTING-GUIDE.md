# Content Variant System Testing Guide

## System Status: ✅ READY FOR TESTING

The content variant system has been successfully implemented and all TypeScript compilation errors have been resolved. Here's what we've accomplished:

## ✅ Completed Implementation

### 1. Enhanced Type System
- Extended `NodeState` interface with `enhancedContent: EnhancedNarramorphContent | null`
- Added `ContentVariant` interface for structured variant definitions
- Added `JourneyContext` interface for character bleed tracking

### 2. Content Parsing & Selection Service
- **ContentVariantService.ts**: Core service with regex-based parsing for both `---[number]` and `---section-name---` delimiters
- **Priority-based selection algorithm**: Character bleed > Recursive awareness > Journey patterns > Attractor engagement > Visit count > Base content

### 3. Redux Integration
- **Enhanced nodesSlice.ts**: Added `updateContentVariant` action and modified `loadNodeContent` to support enhanced content structure
- **Backwards compatibility**: Maintains support for existing `---[number]` format

### 4. React Hook Integration
- **useContentVariants.ts**: Custom hook for content variant management
- **Enhanced useNodeState.ts**: Automatic content variant updates based on reader state changes

### 5. Test Content Created
- **arch-glitch.md**: Comprehensive test content with 7 different variants:
  - `---after-algorithm---` (Character bleed from Algorithm)
  - `---after-last-human---` (Character bleed from LastHuman)
  - `---recursive-awareness---` (High recursive pattern detection)
  - `---memory-fragment-engaged---` (Memory fragment attractor engagement)
  - `---[1]---`, `---[3]---`, `---[5]---` (Visit count variants)

### 6. Node Configuration
- **contentMapping.ts**: arch-glitch node properly configured with connections and strange attractors

## 🧪 Verification Tests Completed

### Content Structure Test ✅
```
Content length: 10,488 characters
Has after-algorithm: true
Has after-last-human: true  
Has visit count [1]: true
```

### TypeScript Compilation ✅
- All type errors in ContentVariantDemo.ts resolved
- All type errors in TransformationEngine.test.ts resolved
- Enhanced interfaces properly integrated

## 🚀 How to Test the System

### Step 1: Start the Development Server
```bash
# If npm/npx works:
npm run dev

# If PowerShell execution policy blocks npm:
node start-server.js

# Alternative direct approach:
node ./node_modules/vite/bin/vite.js
```

### Step 2: Test Character Bleed Effects
1. Navigate to any Algorithm character node (e.g., `algo-awakening`)
2. Then navigate to `arch-glitch` 
3. **Expected**: Content should show the "after-algorithm" variant with character bleed effects

4. Navigate to any LastHuman character node (e.g., `human-discovery`)  
5. Then navigate to `arch-glitch`
6. **Expected**: Content should show the "after-last-human" variant

### Step 3: Test Visit Count Variants
1. Visit `arch-glitch` multiple times
2. **Expected**: 
   - First visit: Base content
   - Second visit: `---[1]---` variant content
   - Fourth visit: `---[3]---` variant content
   - Sixth visit: `---[5]---` variant content

### Step 4: Test Recursive Awareness
1. Create a loop pattern by visiting: `arch-glitch` → `arch-loss` → `arch-glitch` 
2. **Expected**: Content should show "recursive-awareness" variant with enhanced philosophical depth

### Step 5: Test Memory Fragment Engagement
1. Engage with memory-fragment strange attractors multiple times
2. Visit `arch-glitch`
3. **Expected**: Content should show "memory-fragment-engaged" variant

## 🔧 System Architecture

### Content Selection Priority (Highest to Lowest):
1. **Character Bleed** (Priority: 10) - Previous node had different character
2. **Recursive Awareness** (Priority: 8) - Recursive pattern intensity > 0.5  
3. **Journey Patterns** (Priority: 6) - Specific navigation sequences detected
4. **Strange Attractor Engagement** (Priority: 4) - High engagement with specific attractors
5. **Visit Count Variants** (Priority: 2) - Traditional visit-based content
6. **Base Content** (Priority: 0) - Default fallback

### Character Mappings:
- `Algorithm` → `after-algorithm` section
- `LastHuman` → `after-last-human` section  
- `Archaeologist` → `after-archaeologist` section

## 📊 Content Variant Examples

### Base Content
Standard arch-glitch narrative focusing on memory fragments and system instability.

### After Algorithm (`---after-algorithm---`)
Enhanced with computational metaphors, system-level observations, and algorithmic self-awareness bleeding through.

### After Last Human (`---after-last-human---`)
Enhanced with human emotional resonance, memory artifact engagement, and preservation urgency.

### Recursive Awareness (`---recursive-awareness---`)
Meta-commentary on patterns, loop detection, and recursive narrative structure awareness.

### Memory Fragment Engaged (`---memory-fragment-engaged---`)
Deeper memory artifact interaction, archaeological discovery language, and fragment analysis.

## 🎯 Expected User Experience

The reader should experience:
- **Seamless narrative continuity** with subtle but meaningful content variations
- **Character perspective bleeding** between nodes enhancing immersion
- **Progressive narrative depth** with repeated visits revealing new layers
- **Pattern recognition rewards** for readers who explore recursive paths
- **Attractor-based content evolution** responding to philosophical engagement

## 🔍 Debug Information

If the system isn't working as expected:

1. **Check Console**: Look for content variant selection logs
2. **Verify Node Structure**: Ensure arch-glitch node exists in constellation
3. **Check Reader State**: Verify `lastVisitedCharacter` is being tracked
4. **Content Loading**: Verify enhanced content structure is being loaded

## ✨ System Benefits

- **Dynamic Storytelling**: Content adapts to reader journey
- **Enhanced Replayability**: Multiple visits reveal different content
- **Character Continuity**: Maintains perspective consistency across navigation
- **Philosophical Depth**: Rewards pattern recognition and recursive exploration
- **Backwards Compatibility**: Existing content continues to work seamlessly

The content variant system is now ready for full testing and should provide a significantly enhanced narrative experience that responds dynamically to reader behavior and journey patterns.
