/**
 * Content Sanitizer Utility
 * 
 * EMERGENCY FIX: Prevents recursive transformation cascade by cleaning content
 * before applying new transformations and sanitizing output for display.
 */

/**
 * Cleans content of all transformation markup to return to original text
 * This prevents recursive application of transformations to already-transformed content
 */
export function stripTransformationMarkup(content: string): string {
  if (!content) return '';
  
  try {
    let cleanContent = content;
    
    // Remove all span elements with transformation classes
    cleanContent = cleanContent.replace(
      /<span[^>]*class="[^"]*(?:glitch-text|text-transformation|narramorph-|text-emphasis|text-expanded|text-fragmented|text-commented|text-replaced)[^"]*"[^>]*>(.*?)<\/span>/gs,
      '$1'
    );
    
    // Remove data attributes that indicate transformations
    cleanContent = cleanContent.replace(
      /<span[^>]*data-transform-type="[^"]*"[^>]*>(.*?)<\/span>/gs,
      '$1'
    );
      // Remove perspective shift markers (unified with finalTextCleanup)
    cleanContent = cleanContent.replace(/perspective shift:\s*\w+\s*→\s*\w+\.?/gi, '');
    
    // Remove system markers and debug text (unified with finalTextCleanup)
    cleanContent = cleanContent.replace(/\[(?:PATTERN_DETECTED|ANALYSIS_COMPLETE|DATA_INTEGRITY|TEMPORAL_MARKER)[^[\]]*\]/gi, '');
    
    // Remove character perspective shift markers
    cleanContent = cleanContent.replace(/character perspective shift/gi, '');
    
    // Remove strange attractor resonance diagnostics
    cleanContent = cleanContent.replace(/strange attractor resonance:\s*[.\d/()]+\s*\w*/gi, '');
    
    // Remove malformed spans that indicate corruption
    cleanContent = cleanContent.replace(
      /<<\*\*span\*\*[^>]*>/g,
      ''
    );
    
    // Remove strikethrough Unicode combining characters
    cleanContent = cleanContent.replace(/̶/g, '');
    
    // Remove empty elements and excessive whitespace
    cleanContent = cleanContent.replace(/<[^>]*><\/[^>]*>/g, '');
    cleanContent = cleanContent.replace(/\s+/g, ' ');
    cleanContent = cleanContent.trim();
    
    console.log(`[ContentSanitizer] Cleaned content: ${content.length} → ${cleanContent.length} characters`);
    return cleanContent;
    
  } catch (error) {
    console.error('[ContentSanitizer] Error cleaning content:', error);
    return content; // Return original if cleaning fails
  }
}

/**
 * Validates if content has been corrupted by transformation cascade
 */
export function isContentCorrupted(content: string): boolean {
  if (!content) return true;
  
  const corruptionIndicators = [
    content.includes('[object Object]'),
    content.includes('undefined'),
    content.includes('<span class="glitch-text"><span class="glitch-text">'), // Nested spans
    content.match(/<<\*\*span\*\*/g), // Malformed HTML
    content.length < 10, // Too short
    content.split('<span').length > 10, // Too many spans
  ];
  
  return corruptionIndicators.some(indicator => indicator);
}

/**
 * Final text cleanup function that removes all technical markers and system commands
 * from content before displaying to users. This runs AFTER all transformations
 * but BEFORE user display to ensure clean, immersive narrative text.
 */
export function finalTextCleanup(text: string): string {
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
    
    console.log(`[ContentSanitizer] Final text cleanup: ${text.length} → ${cleaned.length} characters`);
    
    return cleaned;
    
  } catch (error) {
    console.error('[ContentSanitizer] Error in final text cleanup:', error);
    return text; // Return original if cleanup fails
  }
}

/**
 * Sanitizes final output for display by removing any remaining markup leakage
 * @deprecated Use finalTextCleanup instead for comprehensive cleaning
 */
export function sanitizeDisplayContent(content: string): string {
  if (!content) return '';
  
  try {
    let sanitized = content;
    
    // Remove any remaining transformation markers
    sanitized = sanitized.replace(/\*#\s*/g, '');
    
    // Clean up multiple consecutive spaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');
    
    // Remove leading/trailing whitespace from lines
    sanitized = sanitized.split('\n').map(line => line.trim()).join('\n');
    
    // Remove empty lines caused by removed markers
    sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return sanitized.trim();
    
  } catch (error) {
    console.error('[ContentSanitizer] Error sanitizing display content:', error);
    return content;
  }
}

/**
 * Generates a unique transformation ID for tracking applied transformations
 */
export function generateTransformationId(transformation: {
  type: string;
  selector?: string;
  priority?: string;
}): string {
  return `${transformation.type}-${transformation.selector?.substring(0, 20) || 'unknown'}-${transformation.priority || 'medium'}`;
}

/**
 * Checks if a transformation has already been applied to content
 */
export function hasTransformationBeenApplied(
  appliedIds: string[],
  transformationId: string
): boolean {
  return appliedIds.includes(transformationId);
}
