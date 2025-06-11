/**
 * Hook for enhanced content variant selection
 * 
 * Provides functionality to update content variants based on reader journey state
 * and automatically select appropriate content based on context.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/types';
import { updateContentVariant } from '../store/slices/nodesSlice';
import { contentVariantService } from '../services/ContentVariantService';

export const useContentVariants = () => {
  const dispatch = useDispatch();
  const readerState = useSelector((state: RootState) => state.reader);
  const nodesState = useSelector((state: RootState) => state.nodes);

  /**
   * Update content variant for a specific node based on current journey context
   */
  const updateNodeContentVariant = useCallback((nodeId: string) => {
    const node = nodesState.data[nodeId];
    if (!node?.enhancedContent) {
      return; // Node doesn't have enhanced content support
    }

    // Create selection context from current reader state
    const context = contentVariantService.createSelectionContext(
      { nodes: nodesState, reader: readerState, interface: { viewMode: 'reading', showMiniConstellation: false, showMetaInterface: false } } as RootState,
      nodeId
    );

    // Select the best content variant
    const selectedContent = contentVariantService.selectContentVariant(
      node.enhancedContent,
      context
    );

    // Update the node's current content if it changed
    if (selectedContent !== node.currentContent) {
      dispatch(updateContentVariant({ nodeId }));
    }
  }, [dispatch, nodesState, readerState]);

  /**
   * Update content variants for all nodes that have enhanced content
   */
  const updateAllContentVariants = useCallback(() => {
    Object.keys(nodesState.data).forEach(nodeId => {
      const node = nodesState.data[nodeId];
      if (node?.enhancedContent) {
        updateNodeContentVariant(nodeId);
      }
    });
  }, [nodesState.data, updateNodeContentVariant]);

  /**
   * Check if a node has content variants available
   */
  const hasContentVariants = useCallback((nodeId: string): boolean => {
    const node = nodesState.data[nodeId];
    if (!node?.enhancedContent) return false;

    return (
      Object.keys(node.enhancedContent.sectionVariants).length > 0 ||
      Object.keys(node.enhancedContent.visitCountVariants).length > 0
    );
  }, [nodesState.data]);

  /**
   * Get available section variants for a node
   */
  const getAvailableSectionVariants = useCallback((nodeId: string): string[] => {
    const node = nodesState.data[nodeId];
    if (!node?.enhancedContent) return [];

    return Object.keys(node.enhancedContent.sectionVariants);
  }, [nodesState.data]);

  /**
   * Get the current content selection context for debugging
   */
  const getSelectionContext = useCallback((nodeId: string) => {
    return contentVariantService.createSelectionContext(
      { nodes: nodesState, reader: readerState, interface: { viewMode: 'reading', showMiniConstellation: false, showMetaInterface: false } } as RootState,
      nodeId
    );
  }, [nodesState, readerState]);

  return {
    updateNodeContentVariant,
    updateAllContentVariants,
    hasContentVariants,
    getAvailableSectionVariants,
    getSelectionContext
  };
};
