# TransformationEngine - New Condition Types

This document describes the new condition types added to the TransformationEngine: `characterBleed` and `journeyPattern`.

## Character Bleed Condition

The `characterBleed` condition detects when the reader has transitioned from a node with one character perspective to a node with a different character perspective. This can be used to create transformations that highlight character perspective shifts.

### Usage

```typescript
const transformationRule = {
  condition: {
    characterBleed: true
  },
  transformations: [
    {
      type: 'emphasize',
      selector: 'consciousness',
      emphasis: 'italic',
      intensity: 2
    }
  ]
};
```

### How it works

- Checks `readerState.path.detailedVisits` for the second-to-last visit
- Compares the character of that visit with the current `nodeState.character`
- Returns `true` if the characters are different, `false` if they are the same or if there's insufficient visit history

### Example scenario

If a reader visits:
1. Node A (Archaeologist perspective)
2. Node B (Algorithm perspective) ← Previous visit
3. Node C (LastHuman perspective) ← Current node

The `characterBleed` condition would return `true` because Algorithm ≠ LastHuman.

## Journey Pattern Condition

The `journeyPattern` condition matches recent navigation sequences against a provided pattern array. This allows for transformations based on specific reading paths.

### Usage

```typescript
const transformationRule = {
  condition: {
    journeyPattern: ['node-discovery', 'node-choice', 'node-consequence']
  },
  transformations: [
    {
      type: 'expand',
      selector: 'decision',
      replacement: 'The weight of this choice echoes through previous experiences...',
      expandStyle: 'inline'
    }
  ]
};
```

### How it works

- Checks the most recent visits in `readerState.path.sequence`
- Compares the last N items (where N = pattern length) against the provided pattern
- Returns `true` if the sequence exactly matches, `false` otherwise
- Requires at least as many visits as the pattern length

### Example scenario

If a reader's sequence is: `['intro', 'discovery', 'choice', 'consequence', 'reflection']`

- Pattern `['choice', 'consequence', 'reflection']` would return `true`
- Pattern `['discovery', 'consequence']` would return `false` (not recent)
- Pattern `['choice', 'reflection']` would return `false` (not consecutive)

## Combining Conditions

Both new condition types can be combined with existing conditions using logical operators:

```typescript
const complexRule = {
  condition: {
    allOf: [
      { characterBleed: true },
      { journeyPattern: ['node-crisis', 'node-decision'] },
      { visitCount: 2 }
    ]
  },
  transformations: [
    {
      type: 'fragment',
      selector: 'memory',
      fragmentPattern: '...',
      fragmentStyle: 'progressive'
    }
  ]
};
```

## Performance Considerations

Both condition types are optimized with caching:

- Results are cached based on node state and relevant reader path information
- `characterBleed` includes `detailedVisits` in the cache key
- `journeyPattern` uses the sequence information already included in caching
- Cache invalidation happens automatically when transformation rules change

## Integration with Existing System

These new condition types integrate seamlessly with the existing TransformationEngine:

- No breaking changes to existing functionality
- Backward compatible with all existing condition types
- Follows the same evaluation patterns and caching strategies
- Can be used in combination with all existing logical operators (`allOf`, `anyOf`, `not`)

## Error Handling

Both conditions gracefully handle edge cases:

- **Character Bleed**: Returns `false` if there are fewer than 2 visits in `detailedVisits`
- **Journey Pattern**: Returns `true` for empty patterns, `false` if sequence is shorter than pattern
- Both conditions work with incomplete or missing path information
