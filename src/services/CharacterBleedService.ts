/**
 * CharacterBleedService
 * 
 * Calculates character influence effects when readers transition between different
 * character perspectives. Each character leaves "bleed" effects that influence
 * how subsequent content is interpreted and transformed.
 * 
 * Character bleed effects occur when the current node's character differs from
 * the previous node's character, creating transformation effects based on the
 * specific character combination.
 */

import { NodeState, Character, TextTransformation } from '../types';
import { ReaderState } from '../store/slices/readerSlice';

/**
 * Represents a character bleed transformation effect
 */
export interface CharacterBleedEffect {
  type: TextTransformation['type'];
  selector: string;
  transformation: TextTransformation;
  reason: string; // Explanation of why this effect occurs
  sourceCharacter: Character; // Character that is bleeding influence
  targetCharacter: Character; // Character receiving the influence
  intensity: number; // Strength of the bleed effect (1-5)
}

/**
 * Service for calculating character influence bleed effects
 */
export class CharacterBleedService {
    /**
   * Calculates character bleed effects based on character transitions
   * @param currentNode The current node being visited
   * @param readerState The current reader state with visit history
   * @returns Array of character bleed transformation effects
   */  static calculateBleedEffects(
    currentNode: NodeState,
    readerState: ReaderState
  ): CharacterBleedEffect[] {
    const effects: CharacterBleedEffect[] = [];

    // Get the last visited node to determine character transition
    const lastVisitedNode = this.getLastVisitedNode(readerState);

    console.log(`[CharacterBleedService] Analyzing character bleed for node ${currentNode.id}:`, {
      currentCharacter: currentNode.character,
      lastVisitedCharacter: lastVisitedNode?.character || 'None',
      lastVisitedNode: lastVisitedNode?.nodeId || 'None'
    });

    if (!lastVisitedNode || lastVisitedNode.character === currentNode.character) {
      // No bleed effect if no previous character or same character
      console.log(`[CharacterBleedService] No character bleed detected - ${!lastVisitedNode ? 'no previous character' : 'same character'}`);
      return effects;
    }

    console.log(`[CharacterBleedService] Character transition detected: ${lastVisitedNode.character} → ${currentNode.character}`);

    // Get character-specific bleed effects for this transition (LIMITED)
    const specificEffects = this.getCharacterSpecificBleed(
      lastVisitedNode.character,
      currentNode.character,
      currentNode
    ).slice(0, 2); // Limit to 2 specific effects

    effects.push(...specificEffects);
    console.log(`[CharacterBleedService] Added ${specificEffects.length} character-specific bleed effects`);

    // Add general bleed effects based on character transition patterns (LIMITED)
    const generalEffects = this.getGeneralBleedEffects(
      lastVisitedNode.character,
      currentNode.character,
      currentNode,
      readerState
    ).slice(0, 1); // Limit to 1 general effect

    effects.push(...generalEffects);
    console.log(`[CharacterBleedService] Added ${generalEffects.length} general bleed effects`);

    console.log(`[CharacterBleedService] Total character bleed effects: ${effects.length}`);
    return effects;
  }
  
  /**
   * Extracts the previous node information from reader state
   * @param readerState The reader state containing visit history
   * @returns Information about the last visited node, or null if none exists
   */
  static getLastVisitedNode(readerState: ReaderState): { character: Character; nodeId: string } | null {
    const detailedVisits = readerState.path.detailedVisits;
    
    if (!detailedVisits || detailedVisits.length < 2) {
      return null;
    }
    
    // Get the second-to-last visit (the previous one before current)
    const previousVisit = detailedVisits[detailedVisits.length - 2];
    
    return {
      character: previousVisit.character,
      nodeId: previousVisit.nodeId
    };
  }
  
  /**
   * Defines specific bleed effects between character pairs
   * @param sourceCharacter Character providing the influence
   * @param targetCharacter Character receiving the influence
   * @param currentNode The current node being visited
   * @returns Array of character-specific bleed effects
   */
  static getCharacterSpecificBleed(
    sourceCharacter: Character,
    targetCharacter: Character,
    currentNode: NodeState
  ): CharacterBleedEffect[] {
    const effects: CharacterBleedEffect[] = [];
    
    // Ensure we have content to work with
    if (!currentNode.currentContent) {
      return effects;
    }
    
    const content = currentNode.currentContent;
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    // Algorithm to Archaeologist: corruption text fragments with strikethrough
    if (sourceCharacter === 'Algorithm' && targetCharacter === 'Archaeologist') {      // Find technical or systematic terms to corrupt
      const technicalTerms = this.findTechnicalTerms(content);
      
      technicalTerms.forEach((term) => {
        effects.push({
          type: 'fragment',
          selector: term,
          transformation: {
            type: 'fragment',
            selector: term,
            fragmentPattern: '̶', // Strikethrough combining character
            fragmentStyle: 'character',
            intensity: 3
          },
          reason: 'Algorithmic corruption bleeding into archaeological interpretation',
          sourceCharacter,
          targetCharacter,
          intensity: 3
        });
      });
      
      // Add meta-commentary about data corruption
      if (paragraphs.length > 1) {
        effects.push({
          type: 'metaComment',
          selector: paragraphs[1],
          transformation: {
            type: 'metaComment',
            selector: paragraphs[1],
            replacement: 'data integrity compromised',
            commentStyle: 'marginalia',
            intensity: 2
          },
          reason: 'Algorithmic perspective introduces doubt about information reliability',
          sourceCharacter,
          targetCharacter,
          intensity: 2
        });
      }
    }
    
    // Algorithm to LastHuman: pattern emphasis with glitch effects
    else if (sourceCharacter === 'Algorithm' && targetCharacter === 'LastHuman') {
      // Find patterns or repetitive elements
      const patterns = this.findPatterns(content);
      
      patterns.forEach((pattern) => {
        effects.push({
          type: 'emphasize',
          selector: pattern,
          transformation: {
            type: 'emphasize',
            selector: pattern,
            emphasis: 'glitch',
            intensity: 4
          },
          reason: 'Algorithmic pattern recognition bleeding into human consciousness',
          sourceCharacter,
          targetCharacter,
          intensity: 4
        });
      });
      
      // Add glitch effect to first paragraph
      if (paragraphs.length > 0) {
        effects.push({
          type: 'expand',
          selector: paragraphs[0],
          transformation: {
            type: 'expand',
            selector: paragraphs[0],
            replacement: '[PATTERN_DETECTED: recursive_loop_identified]',
            expandStyle: 'inline',
            intensity: 3
          },
          reason: 'Algorithmic analysis intrudes on human experience',
          sourceCharacter,
          targetCharacter,
          intensity: 3
        });
      }
    }
    
    // Archaeologist to Algorithm: temporal displacement markers
    else if (sourceCharacter === 'Archaeologist' && targetCharacter === 'Algorithm') {
      // Find time-related terms
      const timeTerms = this.findTimeTerms(content);
      
      timeTerms.forEach((term) => {
        effects.push({
          type: 'replace',
          selector: term,
          transformation: {
            type: 'replace',
            selector: term,
            replacement: `${term}[TEMPORAL_MARKER:${this.getRandomTimestamp()}]`,
            preserveFormatting: true,
            intensity: 3
          },
          reason: 'Archaeological time-consciousness bleeds into algorithmic processing',
          sourceCharacter,
          targetCharacter,
          intensity: 3
        });
      });
      
      // Add temporal displacement commentary
      if (paragraphs.length > 2) {
        effects.push({
          type: 'metaComment',
          selector: paragraphs[2],
          transformation: {
            type: 'metaComment',
            selector: paragraphs[2],
            replacement: 'chronological displacement detected',
            commentStyle: 'interlinear',
            intensity: 2
          },
          reason: 'Archaeological temporal awareness influences algorithmic perception',
          sourceCharacter,
          targetCharacter,
          intensity: 2
        });
      }
    }
    
    // LastHuman to others: familiarity/memory overlay effects
    else if (sourceCharacter === 'LastHuman' && targetCharacter !== 'LastHuman') {
      // Find emotional or personal terms
      const emotionalTerms = this.findEmotionalTerms(content);
      
      emotionalTerms.forEach((term) => {
        effects.push({
          type: 'emphasize',
          selector: term,
          transformation: {
            type: 'emphasize',
            selector: term,
            emphasis: 'fade',
            intensity: 2
          },
          reason: 'Human memory and emotion bleeds into analytical perspective',
          sourceCharacter,
          targetCharacter,
          intensity: 2
        });
      });
      
      // Add memory overlay
      if (paragraphs.length > 0) {
        effects.push({
          type: 'expand',
          selector: paragraphs[0],
          transformation: {
            type: 'expand',
            selector: paragraphs[0],
            replacement: '(a memory surface, warm and fading)',
            expandStyle: 'append',
            intensity: 2
          },
          reason: 'Human experiential memory creates emotional overlay',
          sourceCharacter,
          targetCharacter,
          intensity: 2
        });
      }
    }
    
    return effects;
  }
  
  /**
   * Calculates general bleed effects that apply to any character transition
   * @param sourceCharacter Character providing the influence
   * @param targetCharacter Character receiving the influence
   * @param currentNode The current node being visited
   * @param readerState The reader state for context
   * @returns Array of general bleed effects
   */
  private static getGeneralBleedEffects(
    sourceCharacter: Character,
    targetCharacter: Character,
    currentNode: NodeState,
    readerState: ReaderState
  ): CharacterBleedEffect[] {
    const effects: CharacterBleedEffect[] = [];
    
    if (!currentNode.currentContent) {
      return effects;
    }
    
    // Calculate transition frequency to determine intensity
    const transitionCount = this.calculateTransitionCount(sourceCharacter, targetCharacter, readerState);
    const intensity = Math.min(5, Math.max(1, Math.floor(transitionCount / 2) + 1));
    
    // Add perspective shift marker for any character transition
    const firstSentence = this.getFirstSentence(currentNode.currentContent);
    if (firstSentence) {
      effects.push({
        type: 'metaComment',
        selector: firstSentence,
        transformation: {
          type: 'metaComment',
          selector: firstSentence,
          replacement: `perspective shift: ${sourceCharacter} → ${targetCharacter}`,
          commentStyle: 'marginalia',
          intensity: intensity
        },
        reason: 'Character transition creates perspective shift awareness',
        sourceCharacter,
        targetCharacter,
        intensity: intensity
      });
    }
    
    return effects;
  }
  
  /**
   * Finds technical terms in content that could be affected by algorithmic corruption
   */
  private static findTechnicalTerms(content: string): string[] {
    const technicalWords = [
      'system', 'process', 'data', 'algorithm', 'compute', 'execute',
      'protocol', 'interface', 'network', 'digital', 'binary', 'code'
    ];
    
    const words = content.toLowerCase().split(/\s+/);
    return words.filter(word => 
      technicalWords.some(tech => word.includes(tech))
    ).slice(0, 3); // Limit to first 3 matches
  }
  
  /**
   * Finds patterns or repetitive elements in content
   */
  private static findPatterns(content: string): string[] {
    const words = content.split(/\s+/);
    const patterns: string[] = [];
    
    // Find repeated words
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // Return words that appear more than once
    Object.entries(wordCount).forEach(([word, count]) => {
      if (count > 1 && patterns.length < 2) {
        patterns.push(word);
      }
    });
    
    return patterns;
  }
  
  /**
   * Finds time-related terms in content
   */
  private static findTimeTerms(content: string): string[] {
    const timeWords = [
      'past', 'present', 'future', 'time', 'when', 'before', 'after',
      'now', 'then', 'moment', 'history', 'ancient', 'memory'
    ];
    
    const words = content.toLowerCase().split(/\s+/);
    return words.filter(word => 
      timeWords.some(time => word.includes(time))
    ).slice(0, 2); // Limit to first 2 matches
  }
  
  /**
   * Finds emotional or personal terms in content
   */
  private static findEmotionalTerms(content: string): string[] {
    const emotionalWords = [
      'feel', 'remember', 'love', 'fear', 'hope', 'dream', 'wish',
      'heart', 'soul', 'mind', 'consciousness', 'awareness', 'experience'
    ];
    
    const words = content.toLowerCase().split(/\s+/);
    return words.filter(word => 
      emotionalWords.some(emotion => word.includes(emotion))
    ).slice(0, 2); // Limit to first 2 matches
  }
  
  /**
   * Calculates how many times this character transition has occurred
   */
  private static calculateTransitionCount(
    sourceCharacter: Character,
    targetCharacter: Character,
    readerState: ReaderState
  ): number {
    const detailedVisits = readerState.path.detailedVisits || [];
    let count = 0;
    
    for (let i = 1; i < detailedVisits.length; i++) {
      const prev = detailedVisits[i - 1];
      const curr = detailedVisits[i];
      
      if (prev.character === sourceCharacter && curr.character === targetCharacter) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Extracts the first sentence from content
   */
  private static getFirstSentence(content: string): string | null {
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    return firstSentence && firstSentence.length > 10 ? firstSentence : null;
  }
    /**
   * Generates a random timestamp for temporal displacement effects
   * Note: Uses Math.random() which is safe here since this is purely for 
   * visual/narrative effects, not security-sensitive operations
   */
  private static getRandomTimestamp(): string {
    const timestamps = [
      '2157.03.14', '1847.11.22', '2891.07.08', '0034.12.31', '3456.01.15'
    ];
    return timestamps[Math.floor(Math.random() * timestamps.length)];
  }
}

// Export the service class for use in the transformation pipeline
export default CharacterBleedService;
