/**
 * Navigate to Node Use Case
 * Handles the complete flow of navigating to a node with all transformations
 */

import { ContentApplicationService } from '../services/ContentApplicationService';
import { Character, StrangeAttractor, TemporalLabel } from '../../types';

export interface NavigateToNodeRequest {
  nodeId: string;
  character: Character;
  temporalLayer: TemporalLabel;
  contentSource: string;
  attractors: StrangeAttractor[];
}

export interface NavigateToNodeResponse {
  success: boolean;
  content?: string;
  error?: string;
  isLoading: boolean;
}

export class NavigateToNodeUseCase {
  constructor(private contentService: ContentApplicationService) {}

  async execute(request: NavigateToNodeRequest): Promise<NavigateToNodeResponse> {
    try {
      // Navigate to the node
      await this.contentService.navigateToNode(request);

      // Get the current content
      const content = this.contentService.getCurrentContent(request.nodeId);
      const isLoading = this.contentService.isContentLoading(request.nodeId);
      const error = this.contentService.getContentError(request.nodeId);

      if (error) {
        return {
          success: false,
          error,
          isLoading: false,
        };
      }

      return {
        success: true,
        content: content || undefined,
        isLoading,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to navigate to node: ${message}`,
        isLoading: false,
      };
    }
  }
}