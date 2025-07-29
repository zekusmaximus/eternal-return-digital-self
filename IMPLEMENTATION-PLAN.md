# Implementation Plan: Store Functions and Content System Integration

## Overview
This document outlines the comprehensive plan to implement placeholder functions in `src/store/index.ts`, create missing content files, and verify CSS imports for the Eternal Return of the Digital Self project.

## Analysis Summary

### Current State Assessment

#### 1. Store Functions Analysis
- **Current Issue**: The `getNodeContent` function in `src/store/index.ts` is a basic placeholder that returns `Content for node ${nodeId}`
- **Required Integration**: The function needs to integrate with:
  - `ContentVariantService` for content variant selection
  - `TransformationEngine` for content transformations
  - Node state management from `nodesSlice.ts`
  - Reader state for journey-based content selection

#### 2. CSS Import Issues Found
- **Case Sensitivity Issue**: `src/app.tsx` imports `'./App.css'` but the file is `src/app.css` (lowercase)
- **Status**: All referenced CSS files exist, only import path needs correction

#### 3. Content Files Status
- **All Core Content Files Present**: All 11 main narrative node content files exist
- **Test Files Present**: `test-narramorph.md` and `transformation-test.md` exist
- **Content Format**: Files use legacy `---[number]` format, need to support new enhanced format

#### 4. System Integration Points
- **ContentVariantService**: Sophisticated service for content variant selection
- **TransformationEngine**: Comprehensive transformation system with caching
- **NodesSlice**: Complete Redux slice with content loading and transformation logic
- **ReaderSlice**: Journey tracking and pattern analysis

## Implementation Tasks

### Task 1: Implement Enhanced getNodeContent Function

**Location**: `src/store/index.ts` lines 114-117

**Current Code**:
```typescript
export const getNodeContent = (nodeId: string) => {
  // Placeholder implementation using nodeId
  return `Content for node ${nodeId}`;
};
```

**Required Implementation**:
```typescript
export const getNodeContent = (nodeId: string): string => {
  const state = store.getState();
  const node = state.nodes.data[nodeId];
  const readerState = state.reader;
  
  if (!node) {
    console.warn(`[getNodeContent] Node ${nodeId} not found`);
    return '';
  }

  // If content hasn't been loaded yet, return loading message
  if (!node.content && !node.enhancedContent) {
    return 'Loading content...';
  }

  // Use ContentVariantService for enhanced content selection
  if (node.enhancedContent) {
    const selectionContext = contentVariantService.createSelectionContext(state, nodeId);
    const selectedContent = contentVariantService.selectContentVariant(node.enhancedContent, selectionContext);
    
    // Apply transformations using TransformationEngine
    const allNodes = state.nodes.data;
    const transformedContent = transformationEngine.getTransformedContent(node, readerState, allNodes);
    
    return transformedContent || selectedContent;
  }

  // Fallback to legacy content system
  if (node.content) {
    const availableCounts = Object.keys(node.content)
      .map(Number)
      .sort((a, b) => b - a);
    const lookupKey = Math.max(0, node.visitCount - 1);
    const bestMatch = availableCounts.find(count => lookupKey >= count);
    
    if (bestMatch !== undefined) {
      const baseContent = node.content[bestMatch];
      
      // Apply transformations if available
      if (node.transformations && node.transformations.length > 0) {
        const applicableTransformations = transformationEngine.evaluateAllTransformations(
          node.transformations,
          readerState,
          node
        );
        return transformationEngine.applyTransformations(baseContent, applicableTransformations);
      }
      
      return baseContent;
    }
  }

  return node.currentContent || 'No content available';
};
```

**Dependencies to Import**:
```typescript
import { contentVariantService } from '../services/ContentVariantService';
import { transformationEngine } from '../services/TransformationEngine';
```

### Task 2: Enhance calculateNodeState Function

**Current Implementation**: Basic visit count logic
**Enhancement Needed**: Integration with transformation system and journey context

**Enhanced Implementation**:
```typescript
export const calculateNodeState = (nodeId: string): string => {
  const state = store.getState();
  const node = state.nodes.data[nodeId];
  const readerState = state.reader;
  
  if (!node) return 'unvisited';
  
  // Enhanced state calculation with journey context
  if (node.visitCount === 0) return 'unvisited';
  
  // Check for character bleed effects
  const hasCharacterBleed = readerState.path.detailedVisits && 
    readerState.path.detailedVisits.length >= 2 &&
    readerState.path.detailedVisits[readerState.path.detailedVisits.length - 2].character !== node.character;
  
  // Check for recursive patterns
  const hasRecursivePattern = readerState.path.sequence.filter(id => id === nodeId).length > 2;
  
  // Enhanced state logic
  if (node.visitCount === 1) {
    return hasCharacterBleed ? 'visited-bleed' : 'visited';
  }
  
  if (node.visitCount >= node.transformationThresholds.fragmented) {
    return hasRecursivePattern ? 'fragmented-recursive' : 'fragmented';
  }
  
  if (node.visitCount >= node.transformationThresholds.complex) {
    return hasCharacterBleed ? 'complex-bleed' : 'complex';
  }
  
  if (node.visitCount >= node.transformationThresholds.revisit) {
    return hasRecursivePattern ? 'revisited-recursive' : 'revisited';
  }
  
  return 'visited';
};
```

### Task 3: Fix CSS Import Case Sensitivity

**File**: `src/app.tsx` line 11
**Current**: `import './App.css';`
**Fix**: `import './app.css';`

### Task 4: Content File Enhancements

**Current Status**: All content files exist with legacy format
**Enhancement Needed**: Add enhanced content variants for better journey integration

**Example Enhancement for `arch-discovery.md`**:
```markdown
# Patterns in Decay

The digital archaeologist discovers emergent patterns in a corrupted consciousness scan, challenging traditional preservation frameworks.

---[1]
# Patterns in Decay - First Visit

*Enhanced content for first visit with basic transformations*

---after-algorithm---
# Patterns in Decay - After Algorithm Perspective

*Content variant when coming from Algorithm character nodes*

---recursive-awareness---
# Patterns in Decay - Recursive Recognition

*Content variant for high recursive navigation patterns*

---memory-fragment-engaged---
# Patterns in Decay - Memory Fragment Resonance

*Content variant for high memory-fragment attractor engagement*
```

### Task 5: Integration Testing Points

**Test Scenarios**:
1. **Basic Content Loading**: Verify `getNodeContent` returns appropriate content for different visit counts
2. **Content Variant Selection**: Test enhanced content selection based on journey context
3. **Transformation Application**: Verify transformations are applied correctly
4. **Character Bleed Effects**: Test content changes when transitioning between characters
5. **Recursive Pattern Recognition**: Test content adaptation for recursive navigation
6. **Strange Attractor Engagement**: Test content changes based on attractor engagement levels

### Task 6: Performance Considerations

**Caching Strategy**:
- Leverage `TransformationEngine`'s built-in LRU caching
- Cache content variant selections in `ContentVariantService`
- Implement memoization for expensive state calculations

**Error Handling**:
- Graceful degradation when content files are missing
- Fallback to basic content when transformation fails
- Comprehensive logging for debugging

## Implementation Priority

1. **High Priority**: Fix CSS import case sensitivity issue
2. **High Priority**: Implement enhanced `getNodeContent` function
3. **Medium Priority**: Enhance `calculateNodeState` function
4. **Medium Priority**: Add enhanced content variants to existing files
5. **Low Priority**: Performance optimizations and advanced caching

## Dependencies and Integration Points

### Required Imports for store/index.ts
```typescript
import { contentVariantService } from '../services/ContentVariantService';
import { transformationEngine } from '../services/TransformationEngine';
import type { RootState } from './types';
```

### Integration with Existing Systems
- **NodesSlice**: Use existing `loadNodeContent`, `evaluateTransformations`, and `applyJourneyTransformations` actions
- **ReaderSlice**: Leverage journey tracking and pattern analysis
- **ContentVariantService**: Use for enhanced content selection
- **TransformationEngine**: Use for content transformations and caching

## Testing Strategy

### Unit Tests
- Test `getNodeContent` with various node states and reader contexts
- Test `calculateNodeState` with different journey patterns
- Test content variant selection logic

### Integration Tests
- Test full content loading and transformation pipeline
- Test character bleed effects across node transitions
- Test recursive pattern recognition and content adaptation

### Performance Tests
- Test caching effectiveness with repeated content requests
- Test transformation performance with complex journey patterns
- Test memory usage with large content sets

## Success Criteria

1. **Functional**: All placeholder functions implemented and working
2. **Integration**: Seamless integration with existing ContentVariantService and TransformationEngine
3. **Performance**: No significant performance degradation
4. **Compatibility**: Backward compatibility with existing content format
5. **Enhancement**: Support for new enhanced content variants
6. **Error Handling**: Graceful handling of edge cases and missing content

## Next Steps

1. Switch to Code mode to implement the changes
2. Start with CSS import fix (quick win)
3. Implement enhanced store functions
4. Test integration with existing systems
5. Add enhanced content variants
6. Perform comprehensive testing
7. Document any additional findings or optimizations

This plan provides a comprehensive roadmap for implementing all required functionality while maintaining system integrity and performance.