/**
 * Custom hook for managing node state and transformations
 * Provides utilities for accessing, navigating, and transforming nodes
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectNodeById,
  visitNode,
  revealConnection,
  applyTransformation,
  evaluateTransformations,
  updateContentVariant
} from '../store/slices/nodesSlice';
import {
  navigateToNode,
  engageAttractor,
  selectCurrentNodeId,
  selectNodeRevisitCount
} from '../store/slices/readerSlice';
import { setViewMode } from '../store/slices/interfaceSlice';
import { StrangeAttractor, TransformationRule, TransformationCondition, TextTransformation, Character } from '../types';
import { RootState } from '../store/types';
import { transformationEngine } from '../services/TransformationEngine';
import { transformationService } from '../services/TransformationService';

// Import the CSS for transformations
import '../styles/NarramorphTransformations.css';

/**
 * Custom hook for node state management and transformations
 * @param nodeId Optional node ID to focus on
 */
export const useNodeState = (nodeId?: string) => {
  const dispatch = useDispatch();
  
  // Track applied transformations for transitions
  const [appliedTransformations, setAppliedTransformations] = useState<TextTransformation[]>([]);
  // Track if transformations were just applied for animation
  const [newlyTransformed, setNewlyTransformed] = useState(false);
  
  // Get current node ID if not provided
  const currentNodeId = useSelector(selectCurrentNodeId);
  const targetNodeId = nodeId || currentNodeId;
  
  // Select node data
  const node = useSelector((state: RootState) =>
    targetNodeId ? selectNodeById(state, targetNodeId) : null
  );
  
  // Select all nodes to access any node data
  const allNodes = useSelector((state: RootState) => state.nodes.data);
  
  // Get revisit count
  const revisitCount = useSelector((state: RootState) =>
    targetNodeId ? selectNodeRevisitCount(state, targetNodeId) : 0
  );
  
  // Get reader state for transformation evaluation
  // Used in evaluateTransformations and evaluateCondition
  const readerState = useSelector((state: RootState) => state.reader);
  
  // Navigate to a node
  const navigateTo = useCallback((id: string) => {
    const nodeData = allNodes[id];
    
    if (nodeData) {
      // Record navigation in reader path with required properties
      dispatch(navigateToNode({
        nodeId: id,
        character: nodeData.character,
        temporalValue: nodeData.temporalValue,
        attractors: nodeData.strangeAttractors
      }));
      
      // Record visit in node state
      dispatch(visitNode(id));
      
      // Switch to reading view
      dispatch(setViewMode('reading'));
      
      // This would be where we load the node content in a real implementation
      // For now, we'll just log it
      console.log(`Navigating to node: ${id}`);
    } else {
      console.error(`Could not navigate to node: ${id} - node data not found`);
    }
  }, [dispatch, allNodes]);
  
  // Reveal a new connection
  const revealNodeConnection = useCallback((sourceId: string, targetId: string) => {
    dispatch(revealConnection({ nodeId: sourceId, targetId }));
  }, [dispatch]);
  
  // Engage with a strange attractor
  const engageWithAttractor = useCallback((attractor: StrangeAttractor) => {
    dispatch(engageAttractor(attractor));
  }, [dispatch]);
  
  // Apply a transformation to the node's content
  const applyNodeTransformation = useCallback((
    nodeId: string, 
    transformation: TransformationRule
  ) => {
    dispatch(applyTransformation({ nodeId, transformation }));
  }, [dispatch]);
  
  // Get neighboring nodes based on revealed connections
  const neighbors = useMemo(() => {
    if (!node) return [];
    return node.revealedConnections;
  }, [node]);
  
  // Generate transformed content with visual transitions
  const transformedContent = useMemo(() => {
    if (!node?.currentContent) return null;
    
    // Get reader-pattern based transformations
    const patternTransformations = transformationService.createTransformationsFromPatterns(
      readerState,
      node
    );
    
    // Combine with rule-based transformations from node
    const allTransformations = [
      ...patternTransformations,
      ...node.transformations.flatMap(rule =>
        transformationEngine.evaluateCondition(rule.condition, readerState, node) ?
          rule.transformations : []
      )
    ];
    
    // Apply transformations with priority handling
    const transformedText = transformationService.getCachedTransformedContent(
      node.id,
      node.currentContent,
      allTransformations,
      readerState,
      node
    );
    
    // Add wrapper elements with transition classes
    const wrappedContent = transformationService.wrapTransformedContent(
      transformedText,
      allTransformations
    );
    
    // Update state for tracking
    if (JSON.stringify(appliedTransformations) !== JSON.stringify(allTransformations)) {
      setAppliedTransformations(allTransformations);
      setNewlyTransformed(true);
    }
    
    return wrappedContent;
  }, [node, readerState, appliedTransformations]);
  
  // Reset newly transformed flag after animation
  useEffect(() => {
    if (newlyTransformed) {
      const timer = setTimeout(() => {
        setNewlyTransformed(false);
      }, 2000); // Match the animation duration
      
      return () => clearTimeout(timer);
    }
  }, [newlyTransformed]);
  
  // Apply transformations based on visit count and reader patterns
  useEffect(() => {
    if (!node || !targetNodeId) return;
    
    // Generate default transformations based on visit count
    // Basic transformation based on visit count
    if (node.visitCount === 1) {
      const basicTransformation: TransformationRule = {
        condition: {
          visitCount: 1
        },
        transformations: [
          {
            type: 'emphasize',
            selector: 'first-paragraph',
            emphasis: 'italic'
          }
        ]
      };
      
      applyNodeTransformation(targetNodeId, basicTransformation);
    }
    
    // Generate pattern-based transformations
    if (node.visitCount >= 2) {
      // This will trigger pattern analysis and create transformations
      // based on reader behavior
      const patternTransformations = transformationService.createTransformationsFromPatterns(
        readerState,
        node
      );
      
      // Apply these transformations
      if (patternTransformations.length > 0) {
        const patternBasedRule: TransformationRule = {
          condition: { visitCount: node.visitCount }, // Always apply for current visit
          transformations: patternTransformations
        };
        
        applyNodeTransformation(targetNodeId, patternBasedRule);
      }
    }
    
    // Evaluate all transformations against current reader state
    dispatch(evaluateTransformations({
      nodeId: targetNodeId,
      readerState
    }));
      }, [node, targetNodeId, revisitCount, readerState, dispatch, applyNodeTransformation]);

  // Update content variants when reader state changes
  useEffect(() => {
    if (!node || !targetNodeId || !node.enhancedContent) return;

    // Create selection context and update content variant if needed
    try {
      const context = {
        visitCount: node.visitCount,
        lastVisitedCharacter: readerState.path.sequence.length > 1 
          ? allNodes[readerState.path.sequence[readerState.path.sequence.length - 2]]?.character 
          : undefined,
        journeyPattern: readerState.path.sequence.slice(-5),
        characterSequence: readerState.path.sequence
          .slice(-5)
          .map(id => allNodes[id]?.character)
          .filter((char): char is Character => char !== undefined),
        attractorsEngaged: readerState.path.attractorsEngaged || {},
        recursiveAwareness: readerState.path.sequence.length > 0 
          ? 1 - (new Set(readerState.path.sequence).size / readerState.path.sequence.length)
          : 0
      };

      // Import dynamically to avoid circular dependencies
      import('../services/ContentVariantService').then(({ contentVariantService }) => {
        const selectedContent = contentVariantService.selectContentVariant(
          node.enhancedContent!,
          context
        );

        // Only dispatch if the content actually changed
        if (selectedContent !== node.currentContent) {
          dispatch(updateContentVariant({ nodeId: targetNodeId }));
        }
      });
    } catch (error) {
      console.warn(`[useNodeState] Error updating content variant for node ${targetNodeId}:`, error);
    }
  }, [node, targetNodeId, readerState.path, allNodes, dispatch]);
  
  // Evaluate a condition directly using the transformation engine
  const evaluateCondition = useCallback(
    (condition: TransformationCondition) => {
      if (!node) return false;
      return transformationEngine.evaluateCondition(condition, readerState, node);
    },
    [node, readerState]
  );
  
  // Return the API
  return {
    node,
    navigateTo,
    revealNodeConnection,
    engageWithAttractor,
    applyNodeTransformation,
    evaluateCondition,
    neighbors,
    revisitCount,
    transformedContent,
    newlyTransformed,
    appliedTransformations
  };
};

export default useNodeState;