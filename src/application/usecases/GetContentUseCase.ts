/**
 * Get Content Use Case
 * Handles retrieving content with transformation status
 */

import { ContentApplicationService } from '../services/ContentApplicationService';

export interface GetContentRequest {
  nodeId: string;
}

export interface GetContentResponse {
  success: boolean;
  content?: string;
  isLoading: boolean;
  error?: string;
  transformationStats?: {
    isTransformed: boolean;
    appliedRulesCount: number;
    visitCount: number;
  };
}

export class GetContentUseCase {
  constructor(private contentService: ContentApplicationService) {}

  execute(request: GetContentRequest): GetContentResponse {
    try {
      const { nodeId } = request;

      // Get current content
      const content = this.contentService.getCurrentContent(nodeId);
      const isLoading = this.contentService.isContentLoading(nodeId);
      const error = this.contentService.getContentError(nodeId);

      if (error) {
        return {
          success: false,
          error,
          isLoading: false,
        };
      }

      // Get transformation statistics if available
      let transformationStats;
      try {
        // This is a simplified version - in a full implementation,
        // we'd track per-node statistics
        transformationStats = {
          isTransformed: content !== null,
          appliedRulesCount: 0, // Would be calculated from transformation context
          visitCount: 0, // Would be retrieved from reader state
        };
      } catch {
        // Stats not available, continue without them
      }

      return {
        success: true,
        content: content || undefined,
        isLoading,
        transformationStats,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get content: ${message}`,
        isLoading: false,
      };
    }
  }
}