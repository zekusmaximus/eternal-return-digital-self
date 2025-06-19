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
    
    // Remove perspective shift markers
    cleanContent = cleanContent.replace(
      /perspective shift:\s*\w+\s*→\s*\w+/g,
      ''
    );
    
    // Remove system markers and debug text
    cleanContent = cleanContent.replace(
      /\[(?:PATTERN_DETECTED|ANALYSIS_COMPLETE|DATA_INTEGRITY|TEMPORAL_MARKER)[^[\]]*\]/g,
      ''
    );
    
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
 * Sanitizes final output for display by removing any remaining markup leakage
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
