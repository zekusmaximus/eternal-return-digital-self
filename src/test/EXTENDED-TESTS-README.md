# Extended TransformationEngine Test Suite

This comprehensive test suite validates all **NEW transformation functionality** added to the TransformationEngine, including the 6 new condition types, PathAnalyzer integration, CharacterBleedService integration, and the master transformation coordination system.

## Test Coverage

### 🔬 Test Suite 1: New Condition Types
Tests the 6 new advanced condition types with PathAnalyzer integration:

- **`characterFocus`**: Character preference patterns with intensity analysis
- **`temporalFocus`**: Temporal layer focus patterns and progression
- **`attractorAffinity`**: Thematic affinity patterns with continuity analysis
- **`attractorEngagement`**: Engagement level conditions with trend analysis
- **`recursivePattern`**: Recursive navigation patterns and strength analysis
- **`journeyFingerprint`**: Complete navigation style and behavioral patterns

### 🔬 Test Suite 2: CharacterBleedService Integration
Tests character transition scenarios and bleed effects:

- Algorithm → Archaeologist (corruption effects)
- Archaeologist → Algorithm (temporal displacement)
- LastHuman → Others (memory overlay effects)
- Multiple character transition scenarios
- Intensity calculations and caching

### 🔬 Test Suite 3: PathAnalyzer Integration
Tests integration with PathAnalyzer methods:

- Reading pattern analysis with mock data
- Character focus intensity calculations
- Journey fingerprint generation
- Journey transformation application
- Complex path pattern scenarios

### 🔬 Test Suite 4: Master Integration
Tests the `calculateAllTransformations` method:

- Complex reader journeys with all transformation types
- Priority ordering (High → Medium → Low)
- Transformation deduplication
- Performance limits and safeguards
- Single entry point method testing

### 🔬 Test Suite 5: Performance and Caching
Tests performance characteristics:

- Cache hit/miss scenarios
- Performance improvement measurement
- Cache statistics validation
- Large content processing
- Performance per character metrics

### 🔬 Test Suite 6: Backward Compatibility
Tests compatibility with existing functionality:

- Legacy condition types (visitCount, visitPattern, etc.)
- Mixed legacy/new condition combinations
- Gradual adoption scenarios
- No breaking changes verification

### 🔬 Test Suite 7: Error Handling
Tests robustness and edge cases:

- Empty/invalid data handling
- Complex logical condition combinations
- Performance safeguards for large content
- Error recovery and graceful degradation

## Mock Data Structure

The tests use comprehensive mock data that simulates:

### Reader State
```typescript
- 6 node visits across 3 characters
- Recursive navigation patterns
- Balanced character focus (33% each)
- Multiple strange attractor engagements
- Recent character transitions for bleed testing
```

### Node States
```typescript
- 3 test nodes (arch-discovery, algo-awakening, human-upload)
- Different characters, temporal values, and attractors
- Realistic content for transformation testing
- Existing transformation rules for compatibility testing
```

### PathAnalyzer Mocks
```typescript
- Character focus intensities with progression data
- Attractor engagement scores with trend analysis
- Recursive pattern detection with strength metrics
- Journey fingerprint with navigation style analysis
- Reading patterns for transformation generation
```

### CharacterBleedService Mocks
```typescript
- Character transition effects (fragment, metaComment, emphasize)
- Source/target character combinations
- Intensity levels and transformation priorities
- Realistic bleed effect reasoning
```

## Running the Tests

### Option 1: Direct TypeScript Execution
```bash
# If you have ts-node installed
npx ts-node src/test/TransformationEngine.extended.test.ts
```

### Option 2: Using the Test Runner
```bash
# Convert to JavaScript first (if needed), then run
node src/test/run-extended-tests.js
```

### Option 3: Integration with Existing Test Framework
```bash
# If using Jest or other test framework
npm test -- src/test/TransformationEngine.extended.test.ts
```

## Expected Test Results

### ✅ Successful Test Output
The tests should demonstrate:

1. **All 6 new condition types** evaluate correctly with PathAnalyzer integration
2. **Character bleed effects** generate appropriate transformations
3. **PathAnalyzer integration** provides realistic reading pattern data
4. **Master transformation method** coordinates all systems correctly
5. **Performance improvements** from caching (typically 60-90% faster on cache hits)
6. **Backward compatibility** with all existing condition types
7. **Error handling** gracefully manages edge cases

### 📊 Performance Benchmarks
Expected performance characteristics:

- **Cache Hit Performance**: 60-90% improvement over cache misses
- **Large Content**: <10ms per 1000 characters
- **Transformation Limits**: ≤10 total transformations for performance
- **Memory Usage**: Bounded by LRU cache limits

### 🔧 Integration Verification
The tests verify integration points:

- **PathAnalyzer**: Mock methods called with correct parameters
- **CharacterBleedService**: Effect generation and application
- **Caching System**: Hit rates and performance improvements
- **Priority System**: Correct ordering and deduplication
- **Error Recovery**: Graceful handling of invalid inputs

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all service dependencies are available
2. **Mock Failures**: Verify PathAnalyzer and CharacterBleedService interfaces
3. **Performance Issues**: Check transformation count limits and content size
4. **Cache Problems**: Clear caches between test runs if needed

### Debug Output
The tests include comprehensive logging:

```
🧪 Setting up comprehensive test data...
✅ Mock data and dependencies configured

🔬 TEST SUITE 1: NEW CONDITION TYPES
Test 1.1: Character Focus Conditions
  ✓ Character focus with intensity (should be true): true
  ✓ Character focus simple ratio (should be true): true
...
```

### Manual Validation
You can also test individual components:

```typescript
// Test individual condition types
const result = transformationEngine.evaluateCondition(
  { characterFocus: { characters: ['Archaeologist'], minFocusRatio: 0.3 } },
  readerState,
  nodeState
);

// Test character bleed effects
const effects = CharacterBleedService.calculateBleedEffects(nodeState, readerState);

// Test master coordination
const allTransformations = transformationEngine.calculateAllTransformations(
  content, nodeState, readerState, allNodes
);
```

## Test Maintenance

### Updating Mocks
When PathAnalyzer or CharacterBleedService interfaces change:

1. Update the mock method signatures in the test file
2. Adjust expected return values to match new interfaces
3. Update assertion logic if behavior changes
4. Verify backward compatibility is maintained

### Adding New Tests
To test additional functionality:

1. Follow the existing test suite pattern
2. Create realistic mock data for new scenarios
3. Include both positive and negative test cases
4. Test performance and error handling
5. Verify backward compatibility

### Performance Monitoring
Monitor test performance over time:

1. Track test execution time
2. Monitor cache hit rates
3. Verify transformation count limits
4. Check memory usage patterns
5. Validate performance improvements

## Integration with CI/CD

These tests can be integrated into continuous integration:

```yaml
# Example GitHub Actions workflow
- name: Run Extended Transformation Tests
  run: |
    npm install
    npx ts-node src/test/TransformationEngine.extended.test.ts
```

The tests are designed to be:
- **Deterministic**: Same inputs always produce same outputs
- **Fast**: Complete in under 10 seconds
- **Isolated**: No external dependencies or side effects
- **Comprehensive**: Cover all new functionality and edge cases

## Summary

This test suite provides comprehensive validation of the extended TransformationEngine functionality, ensuring that:

- All new condition types work correctly with PathAnalyzer integration
- CharacterBleedService integration functions properly across all character combinations
- Master transformation coordination works efficiently and correctly
- Performance improvements are achieved through effective caching
- Backward compatibility is maintained with existing functionality
- Error handling provides graceful degradation and recovery

Run these tests regularly during development and before any production deployments to ensure the transformation system remains stable and performant.
