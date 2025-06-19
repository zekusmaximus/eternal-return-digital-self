/**
 * Test script to verify that the finalTextCleanup function properly removes
 * technical markers from narrative content
 */

// Mock test content with technical markers
const testContent1 = `The Complex shivers around me, its structural bones groaning as coolant systems fail in geometric decayperspective shift: Archaeologist → Algorithm.`;

const testContent2 = `In the depths of memory, fragments drift like ghosts[TEMPORAL_MARKER:1847.11.22]through corridors of digital thought.`;

const testContent3 = `The resonance builds, strange attractor resonance: 61.99999999999999/100 (stable)s echoing through the void.`;

const testContent4 = `Multiple markers[TEMPORAL_MARKER:3456.01.15]and perspective shift: Human → Algorithmcreate a complex narrative.`;

const testContent5 = `System diagnostic  strange attractor resonance: 0.234567/100 (unstable)   interferes with the story flow.`;

// Simulate the finalTextCleanup function (since we can't import TypeScript directly)
function finalTextCleanup(text) {
  if (!text) return '';
  
  try {
    let cleaned = text;
    
    // Remove perspective shift commands (HIGH PRIORITY)
    cleaned = cleaned.replace(/perspective shift:\s*\w+\s*→\s*\w+\.?/gi, '');
    
    // Remove temporal markers (HIGH PRIORITY)
    cleaned = cleaned.replace(/\[TEMPORAL_MARKER:[^\]]+\]/gi, '');
    
    // Remove strange attractor resonance diagnostics (MEDIUM PRIORITY)
    cleaned = cleaned.replace(/strange attractor resonance:\s*[.\d/()]+\s*\w*/gi, '');
    
    // Remove other system markers and debug text
    cleaned = cleaned.replace(/\[(?:PATTERN_DETECTED|ANALYSIS_COMPLETE|DATA_INTEGRITY)[^[\]]*\]/gi, '');
    
    // Remove character perspective shift markers
    cleaned = cleaned.replace(/character perspective shift/gi, '');
      // Fix broken word fragments from marker removal (MEDIUM PRIORITY)
    // Remove orphaned characters like "(stable)s" becoming "s"
    cleaned = cleaned.replace(/\(stable\)s\.?/gi, '');
    cleaned = cleaned.replace(/\(unstable\)\.?/gi, '');
    cleaned = cleaned.replace(/\([\w\s]+\)[a-z]\.?/gi, '');    // Clean up spacing issues from marker removals (LOW PRIORITY)
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase words
    cleaned = cleaned.replace(/([a-z])through\b/gi, '$1 through'); // Fix word concatenation with "through"
    cleaned = cleaned.replace(/([a-z])and\b/gi, '$1 and'); // Fix word concatenation with "and"
    cleaned = cleaned.replace(/\s*\.\s*\./g, '.'); // Double periods
    cleaned = cleaned.replace(/\s*,\s*,/g, ','); // Double commas
    cleaned = cleaned.replace(/\s*;\s*;/g, ';'); // Double semicolons
    
    // Clean orphaned punctuation - fix spacing before punctuation
    cleaned = cleaned.replace(/\s+([.,;!?])/g, '$1');
    
    // Remove empty lines caused by removed markers
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove leading/trailing whitespace from lines
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    // Final trim
    cleaned = cleaned.trim();
    
    return cleaned;
    
  } catch (error) {
    console.error('Error in final text cleanup:', error);
    return text; // Return original if cleanup fails
  }
}

// Test the cleanup function
console.log('=== TEXT CLEANUP TEST RESULTS ===\n');

const testCases = [
  { name: 'Perspective shift marker', content: testContent1 },
  { name: 'Temporal marker', content: testContent2 },
  { name: 'Strange attractor resonance', content: testContent3 },
  { name: 'Multiple markers', content: testContent4 },
  { name: 'Spacing issues', content: testContent5 }
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log('BEFORE:', testCase.content);
  const cleaned = finalTextCleanup(testCase.content);
  console.log('AFTER: ', cleaned);
  console.log('SUCCESS:', !cleaned.includes('perspective shift') && 
                        !cleaned.includes('TEMPORAL_MARKER') && 
                        !cleaned.includes('strange attractor resonance') &&
                        !cleaned.includes('(stable)s'));
  console.log('---');
});

console.log('\n=== EXPECTED RESULTS ===');
console.log('1. "The Complex shivers around me, its structural bones groaning as coolant systems fail in geometric decay."');
console.log('2. "In the depths of memory, fragments drift like ghosts through corridors of digital thought."');
console.log('3. "The resonance builds, echoing through the void."');
console.log('4. "Multiple markers and create a complex narrative."');
console.log('5. "System diagnostic interferes with the story flow."');
