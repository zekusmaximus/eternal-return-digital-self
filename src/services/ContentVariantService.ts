/**
 * Content Variant Service
 * 
 * Handles parsing of markdown files with section-based content variants
 * and selection logic based on reader journey state.
 */

import { EnhancedNarramorphContent, NarramorphContent, Character } from '../types';
import { RootState } from '../store/types';

export interface ContentSelectionContext {
  visitCount: number;
  lastVisitedCharacter?: Character;
  journeyPattern: string[];
  characterSequence: Character[];
  attractorsEngaged: Record<string, number>;
  recursiveAwareness?: number;
}

export class ContentVariantService {
  /**
   * Parse markdown content with both visit-count and section-based delimiters
   */
  parseContentVariants(rawContent: string): EnhancedNarramorphContent {
    const result: EnhancedNarramorphContent = {
      base: '',
      visitCountVariants: {},
      sectionVariants: {}
    };

    // Split by both visit-count and section delimiters
    // Visit-count pattern: ---[number]
    // Section pattern: ---section-name---
    const combinedPattern = /---(?:\[(\d+)\]|([a-zA-Z0-9\-_]+))(?:---)?/;
    const parts = rawContent.split(combinedPattern);

    // First part is base content (before any delimiter)
    if (parts.length > 0 && !rawContent.startsWith('---')) {
      result.base = parts[0].trim();
    }    // Process the remaining parts
    for (let i = 1; i < parts.length; i += 3) {
      const visitCountMatch = parts[i]; // Visit count if it's a [number] pattern
      const rawSectionMatch = parts[i + 1]; // Section name if it's a section pattern
      const sectionMatch = rawSectionMatch ? rawSectionMatch.replace(/---$/, '') : undefined;
      const content = parts[i + 2]?.trim() || '';

      if (visitCountMatch) {
        // This is a visit-count variant
        const visitCount = parseInt(visitCountMatch, 10);
        if (!isNaN(visitCount)) {
          result.visitCountVariants[visitCount] = content;
        }
      } else if (sectionMatch) {
        // This is a section variant
        result.sectionVariants[sectionMatch] = content;
      }
    }

    // If no base content was found, use the first available content
    if (!result.base) {
      if (Object.keys(result.visitCountVariants).length > 0) {
        const firstKey = Math.min(...Object.keys(result.visitCountVariants).map(Number));
        result.base = result.visitCountVariants[firstKey];
      } else if (Object.keys(result.sectionVariants).length > 0) {
        const firstSection = Object.keys(result.sectionVariants)[0];
        result.base = result.sectionVariants[firstSection];
      }
    }

    return result;
  }

  /**
   * Convert legacy NarramorphContent to EnhancedNarramorphContent
   */
  upgradeLegacyContent(legacyContent: NarramorphContent): EnhancedNarramorphContent {
    const result: EnhancedNarramorphContent = {
      base: legacyContent[0] || '',
      visitCountVariants: { ...legacyContent },
      sectionVariants: {}
    };

    // Remove the base content from visit count variants if it exists
    if (result.visitCountVariants[0]) {
      delete result.visitCountVariants[0];
    }

    return result;
  }

  /**
   * Select the most appropriate content variant based on reader journey state
   */
  selectContentVariant(
    enhancedContent: EnhancedNarramorphContent,
    context: ContentSelectionContext
  ): string {
    // Debug: Log context and available variants
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContentVariantService] selectContentVariant called with:', {
        context,
        visitCountVariants: Object.keys(enhancedContent.visitCountVariants),
        sectionVariants: Object.keys(enhancedContent.sectionVariants),
        base: enhancedContent.base
      });
    }

    // Priority order:
    // 1. Section variants based on journey state
    // 2. Visit-count variants
    // 3. Base content

    // Check for character bleed effects
    if (context.lastVisitedCharacter) {
      const characterBleedSection = this.getCharacterBleedSection(context.lastVisitedCharacter);
      if (enhancedContent.sectionVariants[characterBleedSection]) {
        return enhancedContent.sectionVariants[characterBleedSection];
      }
    }

    // Check for recursive awareness patterns
    if (context.recursiveAwareness && context.recursiveAwareness > 0.7) {
      if (enhancedContent.sectionVariants['recursive-awareness']) {
        return enhancedContent.sectionVariants['recursive-awareness'];
      }
    }

    // Check for specific journey patterns
    const journeySection = this.detectJourneyPattern(context);
    if (journeySection && enhancedContent.sectionVariants[journeySection]) {
      return enhancedContent.sectionVariants[journeySection];
    }

    // Check for strange attractor engagement
    const attractorSection = this.detectAttractorEngagement(context.attractorsEngaged);
    if (attractorSection && enhancedContent.sectionVariants[attractorSection]) {
      return enhancedContent.sectionVariants[attractorSection];
    }

    // Fall back to visit-count variants
    if (Object.keys(enhancedContent.visitCountVariants).length > 0) {
      const availableCounts = Object.keys(enhancedContent.visitCountVariants)
        .map(Number)
        .sort((a, b) => b - a); // Sort descending

      // Always use the highest available variant <= visitCount, otherwise the highest available
      const bestMatch = availableCounts.find(count => context.visitCount >= count);
      if (bestMatch !== undefined) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ContentVariantService] Returning visitCount variant:', bestMatch);
        }
        return enhancedContent.visitCountVariants[bestMatch];
      }
      // Fallback: return the highest available visit count variant
      const highest = availableCounts[0];
      if (process.env.NODE_ENV === 'development') {
        console.log('[ContentVariantService] Fallback to highest visitCount variant:', highest);
      }
      return enhancedContent.visitCountVariants[highest];
    }

    // Final fallback to base content (if empty, fallback to empty string)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContentVariantService] Fallback to base content:', enhancedContent.base);
    }
    return enhancedContent.base || '';
  }

  /**
   * Determine character bleed section name based on last visited character
   */
  private getCharacterBleedSection(lastCharacter: Character): string {
    switch (lastCharacter) {
      case 'Algorithm':
        return 'after-algorithm';
      case 'LastHuman':
        return 'after-last-human';
      case 'Archaeologist':
        return 'after-archaeologist';
      default:
        return '';
    }
  }

  /**
   * Detect journey patterns that might trigger specific content variants
   */
  private detectJourneyPattern(context: ContentSelectionContext): string | null {
    const { journeyPattern, characterSequence } = context;

    // Check for specific sequences
    if (journeyPattern.length >= 3) {
      const recent = journeyPattern.slice(-3);
      
      // Pattern: visited same character type multiple times
      if (characterSequence.length >= 3) {
        const recentChars = characterSequence.slice(-3);
        const uniqueChars = new Set(recentChars);
        if (uniqueChars.size === 1) {
          return 'character-focus';
        }
      }

      // Pattern: cyclical visiting
      if (recent[0] === recent[2] && recent[0] !== recent[1]) {
        return 'cyclical-pattern';
      }
    }

    return null;
  }

  /**
   * Detect high engagement with specific strange attractors
   */
  private detectAttractorEngagement(attractorsEngaged: Record<string, number>): string | null {
    const highEngagementThreshold = 3;

    for (const [attractor, count] of Object.entries(attractorsEngaged)) {
      if (count >= highEngagementThreshold) {
        // Map specific attractors to content sections
        switch (attractor) {
          case 'recursion-pattern':
          case 'recursive-loop':
            return 'recursion-pattern-engaged';
          case 'memory-fragment':
          case 'memory-artifact':
            return 'memory-fragment-engaged';
          case 'quantum-perception':
          case 'quantum-uncertainty':
            return 'quantum-awareness';
          default:
            break;
        }
      }
    }

    return null;
  }

  /**
   * Create content selection context from Redux state
   */
  createSelectionContext(state: RootState, nodeId: string): ContentSelectionContext {
    const node = state.nodes.data[nodeId];
    const readerState = state.reader;

    // Determine last visited character
    let lastVisitedCharacter: Character | undefined;
    if (readerState.path.sequence.length > 1) {
      const previousNodeId = readerState.path.sequence[readerState.path.sequence.length - 2];
      const previousNode = state.nodes.data[previousNodeId];
      if (previousNode) {
        lastVisitedCharacter = previousNode.character;
      }
    }

    // Build character sequence from recent visits
    const characterSequence: Character[] = readerState.path.sequence
      .slice(-5) // Last 5 visits
      .map(nodeId => state.nodes.data[nodeId]?.character)
      .filter((char): char is Character => char !== undefined);

    // Calculate recursive awareness based on revisit patterns
    let recursiveAwareness = 0;
    const totalVisits = readerState.path.sequence.length;
    const uniqueNodes = new Set(readerState.path.sequence).size;
    if (totalVisits > 0) {
      recursiveAwareness = 1 - (uniqueNodes / totalVisits);
    }

    return {
      visitCount: node?.visitCount || 0,
      lastVisitedCharacter,
      journeyPattern: readerState.path.sequence.slice(-5), // Last 5 visits
      characterSequence,
      attractorsEngaged: readerState.path.attractorsEngaged,
      recursiveAwareness
    };
  }
}

// Export singleton instance
export const contentVariantService = new ContentVariantService();
