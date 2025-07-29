/**
 * Domain service providing transformation functions
 * Pure functions that modify content based on transformation rules
 */

import { TransformationFunction, TransformationContext } from '../models/TransformationContext';

export class Transformations {
  /**
   * Replace target text with replacement text
   */
  static replace(target: string, replacement: string): TransformationFunction {
    return (content: string) => {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      return content.replace(regex, replacement);
    };
  }

  /**
   * Add a comment after target text
   */
  static addComment(target: string, comment: string, style: 'inline' | 'marginalia' | 'footnote' = 'inline'): TransformationFunction {
    return (content: string) => {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      
      switch (style) {
        case 'marginalia':
          return content.replace(regex, `<span class="marginalia-container">${target}<span class="marginalia">${comment}</span></span>`);
        case 'footnote': {
          const footnoteId = this.generateId(target);
          return content.replace(regex, `${target}<sup class="footnote-ref" id="${footnoteId}-ref">[†]</sup>`) +
                 `\n\n<div class="footnote" id="${footnoteId}">† <a href="#${footnoteId}-ref">↩</a> ${comment}</div>`;
        }
        default:
          return content.replace(regex, `${target} [${comment}]`);
      }
    };
  }

  /**
   * Emphasize target text with specified style
   */
  static emphasize(target: string, style: 'bold' | 'italic' | 'highlight' | 'glitch' | 'fade' = 'bold'): TransformationFunction {
    return (content: string) => {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      
      switch (style) {
        case 'bold':
          return content.replace(regex, `**${target}**`);
        case 'italic':
          return content.replace(regex, `*${target}*`);
        case 'highlight':
          return content.replace(regex, `<mark>${target}</mark>`);
        case 'glitch':
          return content.replace(regex, `<span class="glitch-text" data-text="${target}">${target}</span>`);
        case 'fade':
          return content.replace(regex, `<span class="fade-text">${target}</span>`);
        default:
          return content.replace(regex, `**${target}**`);
      }
    };
  }

  /**
   * Fragment target text with specified pattern
   */
  static fragment(target: string, pattern: string = '...', style: 'character' | 'word' | 'progressive' = 'character'): TransformationFunction {
    return (content: string) => {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      
      return content.replace(regex, (match) => {
        switch (style) {
          case 'character':
            return match.split('').join(pattern);
          case 'word':
            return match.split(' ').join(` ${pattern} `);
          case 'progressive':
            return match.split('').map((char, index) => {
              const fragmentCount = Math.floor(index / (match.length / 3)) + 1;
              return char + pattern.repeat(fragmentCount);
            }).join('');
          default:
            return match.split('').join(pattern);
        }
      });
    };
  }

  /**
   * Expand target text with additional content
   */
  static expand(target: string, expansion: string, style: 'append' | 'inline' | 'reveal' = 'append'): TransformationFunction {
    return (content: string) => {
      const regex = new RegExp(this.escapeRegExp(target), 'g');
      
      switch (style) {
        case 'inline':
          return content.replace(regex, `${target} <span class="inline-expansion">[${expansion}]</span>`);
        case 'reveal':
          return content.replace(regex, `${target} <span class="reveal-expansion">${expansion}</span>`);
        default:
          return content.replace(regex, `${target} ${expansion}`);
      }
    };
  }

  /**
   * Apply character bleed effect based on character transition
   */
  static characterBleed(from: string, to: string): TransformationFunction {
    return (content: string, context: TransformationContext) => {
      if (context.previousCharacter !== from || context.currentCharacter !== to) {
        return content;
      }

      // Apply character-specific bleed effects
      switch (`${from}-${to}`) {
        case 'Algorithm-Archaeologist':
          return this.applyAlgorithmicCorruption(content);
        case 'Archaeologist-Algorithm':
          return this.applyTemporalDisplacement(content);
        case 'LastHuman-Algorithm':
        case 'LastHuman-Archaeologist':
          return this.applyMemoryOverlay(content);
        default:
          return this.addPerspectiveShift(content, from, to);
      }
    };
  }

  /**
   * Helper: Apply algorithmic corruption effects
   */
  private static applyAlgorithmicCorruption(content: string): string {
    const technicalTerms = ['system', 'process', 'data', 'protocol', 'interface'];
    let result = content;
    
    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, (match) => 
        match.split('').join('̶') // Strikethrough combining character
      );
    });
    
    return result;
  }

  /**
   * Helper: Apply temporal displacement effects
   */
  private static applyTemporalDisplacement(content: string): string {
    const timeTerms = ['time', 'moment', 'past', 'present', 'future', 'when', 'now'];
    let result = content;
    
    timeTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, (match) => 
        `${match}[TEMPORAL_MARKER:${this.getRandomTimestamp()}]`
      );
    });
    
    return result;
  }

  /**
   * Helper: Apply memory overlay effects
   */
  private static applyMemoryOverlay(content: string): string {
    const emotionalTerms = ['feel', 'remember', 'memory', 'heart', 'mind', 'consciousness'];
    let result = content;
    
    emotionalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, (match) => 
        `<span class="fade-text">${match}</span>`
      );
    });
    
    return result + '\n\n*(a memory surfaces, warm and fading)*';
  }

  /**
   * Helper: Add perspective shift marker
   */
  private static addPerspectiveShift(content: string, from: string, to: string): string {
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence) {
      return content.replace(firstSentence, 
        `<span class="marginalia-container">${firstSentence}<span class="marginalia">perspective shift: ${from} → ${to}</span></span>`
      );
    }
    return content;
  }

  /**
   * Helper: Escape special regex characters
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Helper: Generate unique ID for elements
   */
  private static generateId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8) + 
           Math.random().toString(36).substring(2, 6);
  }

  /**
   * Helper: Get random timestamp for temporal effects
   */
  private static getRandomTimestamp(): string {
    const timestamps = ['2157.03.14', '1847.11.22', '2891.07.08', '0034.12.31', '3456.01.15'];
    return timestamps[Math.floor(Math.random() * timestamps.length)];
  }
}