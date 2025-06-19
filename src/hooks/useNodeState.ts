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
  applyJourneyTransformations,
  updateContentVariant
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
import { Character } from '../types';

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
    // EMERGENCY FIX: Use original content to prevent recursive transformations
    const baseContent = node?.originalContent || node?.currentContent;
    if (!baseContent) return [];
    
    // Use the new master transformation coordination method
    // This automatically handles character bleed, journey patterns, and node rules
    // with proper priority ordering, deduplication, and caching
    try {
      // Pass all nodes from Redux store for better context
      const transformations = transformationEngine.calculateAllTransformations(
        baseContent, // EMERGENCY FIX: Always use original content
        node,
        readerState,
        allNodes
      );
      
      console.log(`[useNodeState] Master transformation integration calculated ${transformations.length} transformations for node ${node.id}:`, {
        characterBleed: transformations.filter(t => t.priority === 'high' && (t.type === 'emphasize' || t.type === 'fragment')).length,
        journeyPatterns: transformations.filter(t => t.priority === 'high' && t.type !== 'emphasize' && t.type !== 'fragment').length,
        nodeRules: transformations.filter(t => t.priority !== 'high').length,
        totalTransformations: transformations.length,
        baseContentLength: baseContent.length,
        usingOriginalContent: !!node?.originalContent
      });
      return transformations;
      
    } catch (error) {
      console.error(`[useNodeState] Error in master transformation calculation for node ${node.id}:`, error);
      return [];
    }
  }, [node, readerState, allNodes]);  // Generate transformed content using the new master integration method
  const transformedContent = useMemo(() => {
    // EMERGENCY FIX: Use original content to prevent recursive transformations
    const baseContent = node?.originalContent || node?.currentContent;
    if (!baseContent) return null;

    try {
      // Use the new master getTransformedContent method
      // This automatically handles all transformation coordination, caching, and content application
      const fullyTransformedContent = transformationEngine.getTransformedContent(
        { ...node, currentContent: baseContent }, // EMERGENCY FIX: Force use of original content
        readerState,
        allNodes
      );

      // Add wrapper elements with transition classes if transformations were applied
      if (fullyTransformedContent !== baseContent && allTransformations.length > 0) {
        const wrappedContent = transformationService.wrapTransformedContent(
          fullyTransformedContent,
          allTransformations
        );
        
        console.log(`[useNodeState] Applied transformation wrapping for node ${node.id}:`, {
          originalLength: baseContent.length,
          transformedLength: fullyTransformedContent.length,
          wrappedLength: wrappedContent.length,
          transformationsCount: allTransformations.length,
          usingOriginalContent: !!node?.originalContent
        });
        
        return wrappedContent;
      }

      return fullyTransformedContent;
      
    } catch (error) {
      console.error(`[useNodeState] Error in master content transformation for node ${node.id}:`, error);
      // EMERGENCY FALLBACK: Return original content on error
      return baseContent;
    }
  }, [node, readerState, allNodes, allTransformations]);// Track transformation changes in a separate effect to prevent infinite loops
  useEffect(() => {
    if (!node || allTransformations.length === 0) return;

    // Check if transformations actually changed
    const transformationsChanged = JSON.stringify(appliedTransformations) !== JSON.stringify(allTransformations);
    
    if (transformationsChanged) {
      setAppliedTransformations(allTransformations);
      setNewlyTransformed(true);

      // Enhanced logging for debugging the master integration
      if (process.env.NODE_ENV === 'development') {
        const characterBleedTransformations = allTransformations.filter(t => 
          t.priority === 'high' && (t.type === 'emphasize' || t.type === 'fragment')
        );
        const journeyPatternTransformations = allTransformations.filter(t => 
          t.priority === 'high' && t.type !== 'emphasize' && t.type !== 'fragment'
        );
        const nodeRuleTransformations = allTransformations.filter(t => 
          t.priority !== 'high'
        );
        
        console.log(`[useNodeState] Applied master transformations for node ${node.id}:`, {
          characterBleed: {
            count: characterBleedTransformations.length,
            types: characterBleedTransformations.map(t => t.type),
            selectors: characterBleedTransformations.map(t => t.selector?.substring(0, 20)).filter(Boolean)
          },
          journeyPatterns: {
            count: journeyPatternTransformations.length,
            types: journeyPatternTransformations.map(t => t.type)
          },
          nodeRules: {
            count: nodeRuleTransformations.length,
            types: nodeRuleTransformations.map(t => t.type)
          },
          totalTransformations: allTransformations.length,
          journeyContext: node.journeyContext,
          character: node.character,
          visitCount: node.visitCount
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
  }, [newlyTransformed]);  // Enhanced transformation application with master integration support
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
      console.log(`[useNodeState] Content already transformed for node ${targetNodeId}, skipping legacy transformation dispatch`);
      return;
    }
    
    // Create a unique key based on ONLY the navigation state, not content changes
    const nodeKey = `${targetNodeId}-${node.visitCount}`;
    
    // Check if we've already applied transformations for this exact combination
    if (appliedNodesRef.current.has(nodeKey)) {
      console.log(`[useNodeState] Skipping already applied legacy transformations for ${nodeKey}`);
      return;
    }

    // Only apply legacy transformations when the node actually changes
    console.log(`[useNodeState] Applying legacy transformation dispatch for node ${targetNodeId} (visitCount: ${node.visitCount})`);
    
    // Update the last dispatch timestamp BEFORE dispatching
    lastTransformationDispatchRef.current = now;
    
    // Mark this node+visit combination as processed BEFORE dispatching
    appliedNodesRef.current.add(nodeKey);
    
    // Cleanup old entries to prevent memory leaks
    if (appliedNodesRef.current.size > 50) {
      const entries = Array.from(appliedNodesRef.current);
      const toKeep = entries.slice(-25);
      appliedNodesRef.current.clear();
      toKeep.forEach(key => appliedNodesRef.current.add(key));
    }

    // Apply journey transformations (for backward compatibility with Redux store)
    // Note: The master integration handles this automatically, but we keep this for store consistency
    dispatch(applyJourneyTransformations({
      nodeId: targetNodeId,
      readerState
    }));

    // Apply basic visit-based transformations for backward compatibility
    if (node.visitCount === 1) {
      const basicTransformation: TransformationRule = {
        condition: { visitCount: 1 },
        transformations: [{
          type: 'emphasize',
          selector: 'first-paragraph',
          emphasis: 'italic'
        }]
      };
      applyNodeTransformation(targetNodeId, basicTransformation);
    }

    // Generate reduced pattern-based transformations to complement master integration
    if (node.visitCount >= 2 && node.visitCount <= 3) {
      const patternTransformations = transformationService.createTransformationsFromPatterns(
        readerState,
        node
      );
      
      if (patternTransformations.length > 0 && patternTransformations.length <= 2) {
        const patternBasedRule: TransformationRule = {
          condition: { visitCount: node.visitCount },
          transformations: patternTransformations.slice(0, 1) // Limit to 1 to avoid conflicts with master integration
        };
        applyNodeTransformation(targetNodeId, patternBasedRule);
      }
    }

    // Evaluate transformations against current reader state
    dispatch(evaluateTransformations({
      nodeId: targetNodeId,
      readerState
    }));
  }, [targetNodeId, node, dispatch, applyNodeTransformation, readerState]);
  
  // Re-enable content variant update on visit count or journey change, with a visit cap for stability
  useEffect(() => {
    if (!node || !targetNodeId || !node.enhancedContent) return;
    // Only run if enhancedContent has at least one variant or base content
    const hasContent =
      (node.enhancedContent.base && node.enhancedContent.base.length > 0) ||
      Object.keys(node.enhancedContent.visitCountVariants).length > 0 ||
      Object.keys(node.enhancedContent.sectionVariants).length > 0;
    if (!hasContent) return;

    // Cap visit count to 5 for content variant selection
    const cappedVisitCount = Math.min(node.visitCount, 5);

    const context = {
      visitCount: cappedVisitCount,
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