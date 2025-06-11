# Content Variant System

This document describes the enhanced content variant system implemented for the Eternal Return of the Digital Self project.

## Overview

The content variant system extends the existing visit-count based content loading to support section-based variants that respond to reader journey state, enabling sophisticated character bleed effects and narrative adaptation.

## Features

### 1. Section-Based Content Variants

Content can now include named sections that trigger based on specific reader states:

```markdown
# Base Content
This is the default content that appears initially.

---after-algorithm---
This content appears when the reader arrives from an Algorithm node.

---after-last-human---
This content appears when the reader arrives from a Last Human node.

---recursive-awareness---
This content appears when the reader shows high recursive awareness patterns.

---memory-fragment-engaged---
This content appears when the reader has engaged heavily with memory fragment attractors.
```

### 2. Backwards Compatible

The system maintains full compatibility with existing visit-count variants:

```markdown
---[0]---
Base content (legacy support)

---[1]---
Content for first revisit

---[3]---
Content for multiple revisits
```

### 3. Character Bleed Effects

The system automatically detects character bleed by tracking the reader's previous node:

- `---after-algorithm---`: Triggered when coming from an Algorithm character node
- `---after-last-human---`: Triggered when coming from a LastHuman character node
- `---after-archaeologist---`: Triggered when coming from an Archaeologist character node

### 4. Journey Pattern Detection

The system analyzes navigation patterns to trigger appropriate variants:

- **Cyclical patterns**: Detected when reader visits nodes in repeating sequences
- **Character focus**: Triggered when reader focuses on nodes from one character
- **Recursive awareness**: Calculated based on revisit patterns

### 5. Strange Attractor Integration

Content variants can respond to strange attractor engagement:

- `---recursion-pattern-engaged---`: High engagement with recursion-related attractors
- `---memory-fragment-engaged---`: High engagement with memory-related attractors
- `---quantum-awareness---`: High engagement with quantum-related attractors

## Implementation

### Core Components

1. **ContentVariantService**: Handles parsing and selection logic
2. **Enhanced NodeState**: Stores both legacy and enhanced content structures
3. **useContentVariants Hook**: Provides React integration
4. **Enhanced useNodeState**: Automatically updates variants based on journey changes

### Content Selection Priority

The system uses the following priority order:

1. **Character bleed sections** (highest priority)
2. **Recursive awareness sections**
3. **Journey pattern sections**
4. **Strange attractor engagement sections**
5. **Visit-count variants** (legacy support)
6. **Base content** (fallback)

### Content File Structure

```
content/
├── arch-glitch.md          # Test file with multiple variants
├── arch-discovery.md       # Existing files work unchanged
├── algo-awakening.md
└── ...
```

## Testing with arch-glitch Node

The `arch-glitch` node has been created as a test case demonstrating all variant types:

### Available Variants

1. **Base content**: Default memory fragment narrative
2. **---after-algorithm---**: Content with algorithmic perspective bleed
3. **---after-last-human---**: Content with last human emotional weight
4. **---recursive-awareness---**: Content for high recursive pattern recognition
5. **---memory-fragment-engaged---**: Content for memory attractor engagement
6. **---[1]---**: First revisit content
7. **---[3]---**: Multiple revisit content

### How to Test

1. **Character Bleed**: Visit an Algorithm node, then navigate to arch-glitch
2. **Recursive Awareness**: Visit arch-glitch multiple times with cyclical patterns
3. **Memory Fragment Engagement**: Engage with memory-fragment attractors before visiting
4. **Visit Count**: Simply revisit the node multiple times

## Usage Examples

### In React Components

```typescript
import { useContentVariants } from '../hooks/useContentVariants';

const MyComponent = () => {
  const { updateNodeContentVariant, hasContentVariants } = useContentVariants();
  
  // Update content variant when reader state changes
  useEffect(() => {
    updateNodeContentVariant('arch-glitch');
  }, [readerState]);
  
  // Check if node has variants
  if (hasContentVariants('arch-glitch')) {
    // Node has enhanced content variants
  }
};
```

### Manual Content Selection

```typescript
import { contentVariantService } from '../services/ContentVariantService';

const context = {
  visitCount: 2,
  lastVisitedCharacter: 'Algorithm',
  journeyPattern: ['algo-awakening', 'arch-glitch'],
  characterSequence: ['Algorithm'],
  attractorsEngaged: { 'memory-fragment': 3 },
  recursiveAwareness: 0.6
};

const selectedContent = contentVariantService.selectContentVariant(
  enhancedContent,
  context
);
```

## Integration Points

### Existing Systems

- **NodeView**: Automatically displays appropriate content variants
- **TransformationEngine**: Works on top of selected variants
- **PathAnalyzer**: Provides journey pattern data for selection
- **StrangeAttractorSystem**: Provides engagement data for selection

### Redux Integration

- **nodesSlice**: Enhanced with content variant actions
- **readerSlice**: Provides journey state for variant selection
- **useNodeState**: Automatically triggers variant updates

## Future Enhancements

1. **Temporal displacement variants**: Content based on temporal value relationships
2. **Multi-character bleed**: Variants based on sequences of character visits
3. **Attractor combination variants**: Content based on multiple attractor engagements
4. **Dynamic variant creation**: AI-generated variants based on reader patterns
5. **Variant analytics**: Tracking which variants are most effective

## Performance Considerations

- Content parsing is done once per file load
- Variant selection is cached and only updated when reader state changes
- Legacy content loading remains unchanged for backwards compatibility
- Section parsing uses efficient regex patterns
