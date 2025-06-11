# TransformationEngine Extension Plan

## Current Structure Analysis

### Existing Condition Types
The TransformationEngine currently supports 10 condition types plus logical operators:

1. **visitCount** - Basic visit threshold
2. **visitPattern** - Ordered visit sequences  
3. **previouslyVisitedNodes** - Unordered visit requirements
4. **strangeAttractorsEngaged** - Attractor engagement requirements
5. **temporalPosition** - Temporal layer requirements
6. **endpointProgress** - Progress-based conditions
7. **revisitPattern** - Node revisit requirements
8. **characterBleed** - Character transition detection
9. **journeyPattern** - Recent navigation matching
10. **Logical operators** - allOf, anyOf, not

### Current Evaluation Pattern
```typescript
evaluateCondition(condition, readerState, nodeState): boolean {
  // 1. Cache check
  // 2. Handle logical operators (allOf, anyOf, not)
  // 3. Evaluate individual conditions with early returns
  // 4. Return true if all conditions pass
}
```

## Proposed Extensions from PathAnalyzer

### New Condition Types to Add

#### 1. Character Focus Conditions
```typescript
characterFocus?: {
  characters: Character[];
  minFocusRatio?: number; // Default 0.4 (40%)
  includeIntensity?: boolean; // Use character focus intensity metrics
}
```

#### 2. Temporal Focus Conditions  
```typescript
temporalFocus?: {
  temporalLayers: TemporalLabel[];
  minFocusRatio?: number; // Default 0.4 (40%)
  includeProgression?: boolean; // Check for chronological patterns
}
```

#### 3. Attractor Affinity Conditions
```typescript
attractorAffinity?: {
  attractors: StrangeAttractor[];
  minAffinityRatio?: number; // Default 0.25 (25%)
  includeThematicContinuity?: boolean; // Check thematic connections
}
```

#### 4. Attractor Engagement Conditions
```typescript
attractorEngagement?: {
  attractor: StrangeAttractor;
  minEngagementScore?: number; // Default 50 (0-100 scale)
  trendRequired?: 'rising' | 'falling' | 'stable' | 'any';
}
```

#### 5. Recursive Pattern Conditions
```typescript
recursivePattern?: {
  minPatternStrength?: number; // Default 0.6
  maxPatternLength?: number; // Default 4
  requireRecency?: boolean; // Pattern must be recent
}
```

#### 6. Journey Fingerprint Conditions
```typescript
journeyFingerprint?: {
  explorationStyle?: 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic';
  temporalPreference?: 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid';
  narrativeApproach?: 'systematic' | 'intuitive' | 'thematic' | 'experimental';
  minComplexityIndex?: number; // 0-1 scale
  minFocusIndex?: number; // 0-1 scale
}
```

### Implementation Steps

#### Step 1: Extend TransformationCondition Interface
Add new condition properties to the interface around line 78-114.

#### Step 2: Add Helper Methods
Create new private helper methods following existing patterns:
- `checkCharacterFocus()`
- `checkTemporalFocus()`  
- `checkAttractorAffinity()`
- `checkAttractorEngagement()`
- `checkRecursivePattern()`
- `checkJourneyFingerprint()`

#### Step 3: Extend evaluateCondition Method
Add new condition checks around line 320-362, following the early return pattern:

```typescript
// Character focus condition
if (condition.characterFocus) {
  if (!this.checkCharacterFocus(condition.characterFocus, readerState, nodeState)) {
    return false;
  }
}

// Continue with other conditions...
```

#### Step 4: Update Cache Key Generation
Modify `getConditionCacheKey()` to include new condition types in the hash.

#### Step 5: Integration with PathAnalyzer
Update PathAnalyzer's `createTransformationConditions()` to generate the new condition types.

### Cache Considerations
- New conditions may require additional reader state data in cache keys
- Consider cache invalidation when path patterns change significantly
- Monitor cache hit rates with new condition complexity

### Testing Strategy
1. Unit tests for each new helper method
2. Integration tests with PathAnalyzer-generated conditions
3. Performance tests to ensure cache efficiency
4. Edge case testing for complex logical combinations

### Backward Compatibility
All new conditions are optional properties, maintaining full backward compatibility with existing transformation rules.
