/**
 * Custom hook for managing node state and transformations
 * Provides utilities for accessing, navigating, and transforming nodes
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectNodeById,
  visitNode,
  revealConnection,
  applyTransformation,
  evaluateTransformations,
  applyJourneyTransformations
} from '../store/slices/nodesSlice';
import {
  navigateToNode,
  engageAttractor,
  selectCurrentNodeId,
  selectNodeRevisitCount
} from '../store/slices/readerSlice';
import { setViewMode } from '../store/slices/interfaceSlice';
import { StrangeAttractor, TransformationRule, TransformationCondition, TextTransformation } from '../types';
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
  const [newlyTransformed, setNewlyTransformed] = useState(false);  // Track which nodes have had transformations applied to prevent repeated dispatches
  const appliedNodesRef = useRef<Set<string>>(new Set());
  // Throttle transformation dispatches to prevent excessive calls
  const lastTransformationDispatchRef = useRef<number>(0);

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
  }, [node]);  // Calculate all transformations using the new master integration method
  const allTransformations = useMemo(() => {
    if (!node?.currentContent) return [];
    
    // Use the new master transformation coordination method
    // This automatically handles character bleed, journey patterns, and node rules
    // with proper priority ordering, deduplication, and caching
    try {
      const allNodeStates = {}; // Could be passed from parent component if available
      const transformations = transformationEngine.calculateAllTransformations(
        node.currentContent,
        node,
        readerState,
        allNodeStates
      );
      
      console.log(`[useNodeState] Master transformation integration calculated ${transformations.length} transformations for node ${node.id}`);
      return transformations;
      
    } catch (error) {
      console.error(`[useNodeState] Error in master transformation calculation for node ${node.id}:`, error);
      return [];
    }
  }, [node, readerState]);
  // Generate transformed content using the new master integration method
  const transformedContent = useMemo(() => {
    if (!node?.currentContent) return node?.currentContent || null;

    try {
      // Use the new master getTransformedContent method
      // This automatically handles all transformation coordination, caching, and content application
      const allNodeStates = {}; // Could be passed from parent component if available
      const fullyTransformedContent = transformationEngine.getTransformedContent(
        node,
        readerState,
        allNodeStates
      );

      // Add wrapper elements with transition classes if transformations were applied
      if (fullyTransformedContent !== node.currentContent && allTransformations.length > 0) {
        const wrappedContent = transformationService.wrapTransformedContent(
          fullyTransformedContent,
          allTransformations
        );
        return wrappedContent;
      }

      return fullyTransformedContent;
      
    } catch (error) {
      console.error(`[useNodeState] Error in master content transformation for node ${node.id}:`, error);
      return node?.currentContent || null;
    }
  }, [node, readerState, allTransformations]);

  // Track transformation changes in a separate effect to prevent infinite loops
  useEffect(() => {
    if (!node || allTransformations.length === 0) return;

    // Check if transformations actually changed
    const transformationsChanged = JSON.stringify(appliedTransformations) !== JSON.stringify(allTransformations);
    
    if (transformationsChanged) {
      setAppliedTransformations(allTransformations);
      setNewlyTransformed(true);

      // Log transformation details for debugging
      if (process.env.NODE_ENV === 'development') {
        const journeyTransformations = allTransformations.filter(t => t.priority === 'high');
        console.log(`[useNodeState] Applied transformations for node ${node.id}:`, {
          journeyTransformations: journeyTransformations.length,
          patternTransformations: allTransformations.filter(t => t.priority !== 'high' && !node.transformations.some(rule => rule.transformations.includes(t))).length,
          ruleTransformations: allTransformations.filter(t => t.priority !== 'high' && node.transformations.some(rule => rule.transformations.includes(t))).length,
          totalTransformations: allTransformations.length,
          hasCharacterBleed: journeyTransformations.some(t => t.type === 'emphasize' || t.type === 'fragment'),
          journeyContext: node.journeyContext
        });
      }
    }
  }, [node, allTransformations, appliedTransformations]);
  
  // Reset newly transformed flag after animation
  useEffect(() => {
    if (newlyTransformed) {
      const timer = setTimeout(() => {
        setNewlyTransformed(false);
      }, 2000); // Match the animation duration
      
      return () => clearTimeout(timer);
    }
  }, [newlyTransformed]);  // Apply transformations based on visit count and reader patterns - CRITICAL FIX to prevent infinite loops
  useEffect(() => {
    if (!node || !targetNodeId) return;
    
    // Throttle: Only allow transformation dispatches every 500ms
    const now = Date.now();
    if (now - lastTransformationDispatchRef.current < 500) {
      return;
    }
    
    // INFINITE LOOP PREVENTION: Check if content is already transformed
    if (node.currentContent && (
      node.currentContent.includes('data-transform-type') || 
      node.currentContent.includes('narramorph-') ||
      node.currentContent.includes('[TransformationService]') ||
      node.currentContent.includes('recursive loop detected') ||
      node.currentContent.includes('temporal displacement')
    )) {
      console.log(`[useNodeState] Content already transformed for node ${targetNodeId}, skipping to prevent infinite loop`);
      return;
    }
    
    // Create a unique key based on ONLY the navigation state, not content changes
    // This prevents re-triggering when transformations modify the content
    const nodeKey = `${targetNodeId}-${node.visitCount}`;
    
    // Check if we've already applied transformations for this exact combination
    if (appliedNodesRef.current.has(nodeKey)) {
      console.log(`[useNodeState] Skipping already applied transformations for ${nodeKey}`);
      return;
    }    // Only apply transformations when the node actually changes, not when reader state changes
    console.log(`[useNodeState] Applying transformations for node ${targetNodeId} (visitCount: ${node.visitCount})`);
    
    // Update the last dispatch timestamp BEFORE dispatching
    lastTransformationDispatchRef.current = now;
    
    // Mark this node+visit combination as processed BEFORE dispatching to prevent race conditions
    appliedNodesRef.current.add(nodeKey);
    
    // Cleanup old entries to prevent memory leaks (keep only last 50 entries)
    if (appliedNodesRef.current.size > 50) {
      const entries = Array.from(appliedNodesRef.current);
      const toKeep = entries.slice(-25); // Keep last 25 entries
      appliedNodesRef.current.clear();
      toKeep.forEach(key => appliedNodesRef.current.add(key));
    }

    // Apply journey transformations (character bleed + journey context) - but only once per node
    dispatch(applyJourneyTransformations({
      nodeId: targetNodeId,
      readerState
    }));

    // Generate default transformations based on visit count
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

    // Generate pattern-based transformations (with reduced frequency to prevent loops)
    if (node.visitCount >= 2 && node.visitCount <= 5) { // Limit pattern generation to early visits
      const patternTransformations = transformationService.createTransformationsFromPatterns(
        readerState,
        node
      );
      
      // Apply these transformations only if they're not too many
      if (patternTransformations.length > 0 && patternTransformations.length <= 3) {
        const patternBasedRule: TransformationRule = {
          condition: { visitCount: node.visitCount },
          transformations: patternTransformations
        };
        
        applyNodeTransformation(targetNodeId, patternBasedRule);
      }
    }

    // Evaluate transformations against current reader state (with throttling)
    dispatch(evaluateTransformations({
      nodeId: targetNodeId,
      readerState
    }));
  }, [targetNodeId, node, dispatch, applyNodeTransformation, readerState]); // Fixed dependencies  // TEMPORARILY DISABLED: Update content variants when reader state changes
  // This effect was causing content to disappear due to re-selection loops
  // TODO: Re-enable with proper dependency management
  /*
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
          dispatch(updateContentVariant({ 
            nodeId: targetNodeId, 
            context,
            selectedContent 
          }));
        }
      });
    } catch (error) {
      console.warn(`[useNodeState] Error updating content variant for node ${targetNodeId}:`, error);
    }
  }, [node, targetNodeId, readerState.path, allNodes, dispatch]);
  */
  
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