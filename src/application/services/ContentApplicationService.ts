/**
 * Content Application Service
 * Orchestrates content loading, transformation, and state management
 * Replaces complex service interactions with clean use cases
 */

import { createTransformationPipeline, TransformationPipeline } from '../../domain/services/TransformationPipeline';
import { TransformationContext, TransformationResult } from '../../domain/models/TransformationContext';
import { loadDefaultRules } from '../../domain/rules/DefaultTransformationRules';
import { Character, StrangeAttractor, TemporalLabel } from '../../types';

// Infrastructure imports
import { SimplifiedAppDispatch, SimplifiedRootState } from '../../infrastructure/state/store';
import { 
  setTransformationContext, 
  setTransformationResult,
  setLoading as setTransformationLoading,
  setError as setTransformationError
} from '../../infrastructure/state/slices/transformationSlice';
import { 
  loadContent,
  setTransformedContent 
} from '../../infrastructure/state/slices/contentSlice';
import { 
  navigateToNode,
  engageAttractor 
} from '../../infrastructure/state/slices/readerSlice';

export class ContentApplicationService {
  private transformationPipeline: TransformationPipeline;
  private dispatch: SimplifiedAppDispatch;
  private getState: () => SimplifiedRootState;

  constructor(dispatch: SimplifiedAppDispatch, getState: () => SimplifiedRootState) {
    this.dispatch = dispatch;
    this.getState = getState;
    this.transformationPipeline = createTransformationPipeline();
    
    // Load default transformation rules
    loadDefaultRules(this.transformationPipeline);
  }

  /**
   * Navigate to a node and handle all related transformations
   */
  async navigateToNode(params: {
    nodeId: string;
    character: Character;
    temporalLayer: TemporalLabel;
    contentSource: string;
    attractors: StrangeAttractor[];
  }): Promise<void> {
    const { nodeId, character, temporalLayer, contentSource, attractors } = params;

    try {
      // Update reader state
      this.dispatch(navigateToNode({ nodeId, character, temporalLayer }));

      // Engage attractors
      attractors.forEach(attractor => {
        this.dispatch(engageAttractor(attractor));
      });

      // Load content if not already loaded
      const state = this.getState();
      if (!state.content.rawContent[nodeId]) {
        await this.dispatch(loadContent({ nodeId, contentSource })).unwrap();
      }

      // Transform content
      await this.transformNodeContent(nodeId);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.dispatch(setTransformationError(`Failed to navigate to node ${nodeId}: ${message}`));
    }
  }

  /**
   * Transform content for a specific node
   */
  async transformNodeContent(nodeId: string): Promise<void> {
    try {
      this.dispatch(setTransformationLoading(true));

      const state = this.getState();
      const rawContent = state.content.rawContent[nodeId];
      
      if (!rawContent) {
        throw new Error(`No raw content found for node ${nodeId}`);
      }

      // Build transformation context
      const context = this.buildTransformationContext(nodeId);
      
      // Store context in state
      this.dispatch(setTransformationContext({ nodeId, context }));

      // Apply transformations
      const transformedContent = this.transformationPipeline.transform(rawContent, context);
      
      // Create transformation result
      const result: TransformationResult = {
        originalContent: rawContent,
        transformedContent,
        appliedRules: this.transformationPipeline.getApplicableRules(context).map(rule => rule.id),
        metadata: {
          transformationCount: this.transformationPipeline.getApplicableRules(context).length,
          processingTime: Date.now(), // Simple timestamp
          cacheHit: false
        }
      };

      // Store results
      this.dispatch(setTransformationResult({ nodeId, result }));
      this.dispatch(setTransformedContent({ nodeId, content: transformedContent }));

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.dispatch(setTransformationError(`Failed to transform content for node ${nodeId}: ${message}`));
    } finally {
      this.dispatch(setTransformationLoading(false));
    }
  }

  /**
   * Build transformation context from current state
   */
  private buildTransformationContext(nodeId: string): TransformationContext {
    const state = this.getState();
    const reader = state.reader;

    return {
      nodeId,
      visitCount: reader.visitCounts[nodeId] || 0,
      currentCharacter: reader.currentCharacter!,
      previousCharacter: reader.previousCharacter || undefined,
      readerPath: reader.visitedNodes,
      attractorsEngaged: reader.engagedAttractors,
      temporalLayer: reader.currentTemporalLayer!,
    };
  }

  /**
   * Get current content for a node (transformed or raw)
   */
  getCurrentContent(nodeId: string): string | null {
    const state = this.getState();
    return state.content.transformedContent[nodeId] || 
           state.content.rawContent[nodeId] || 
           null;
  }

  /**
   * Check if content is loading for a node
   */
  isContentLoading(nodeId: string): boolean {
    const state = this.getState();
    return state.content.loading[nodeId] || state.transformation.loading;
  }

  /**
   * Get any errors for a node
   */
  getContentError(nodeId: string): string | null {
    const state = this.getState();
    return state.content.errors[nodeId] || state.transformation.error;
  }

  /**
   * Force refresh content for a node
   */
  async refreshNodeContent(nodeId: string, contentSource: string): Promise<void> {
    try {
      // Reload raw content
      await this.dispatch(loadContent({ nodeId, contentSource })).unwrap();
      
      // Re-transform content
      await this.transformNodeContent(nodeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.dispatch(setTransformationError(`Failed to refresh content for node ${nodeId}: ${message}`));
    }
  }

  /**
   * Get transformation statistics
   */
  getTransformationStats(): {
    totalTransformed: number;
    totalCached: number;
    averageTransformationTime: number;
  } {
    const state = this.getState();
    const results = Object.values(state.transformation.results);
    
    const totalTransformed = results.length;
    const totalCached = results.filter(r => r.metadata.cacheHit).length;
    const totalTime = results.reduce((sum, r) => sum + (r.metadata.processingTime || 0), 0);
    const averageTransformationTime = totalTransformed > 0 ? totalTime / totalTransformed : 0;

    return {
      totalTransformed,
      totalCached,
      averageTransformationTime,
    };
  }
}