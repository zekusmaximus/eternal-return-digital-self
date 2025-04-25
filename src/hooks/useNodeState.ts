/**
 * Custom hook for managing node state and transformations
 * Provides utilities for accessing, navigating, and transforming nodes
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectNodeById, 
  visitNode,
  revealConnection,
  applyTransformation
} from '../store/slices/nodesSlice';
import {
  navigateToNode,
  engageAttractor,
  selectCurrentNodeId,
  selectNodeRevisitCount
} from '../store/slices/readerSlice';
import { setViewMode } from '../store/slices/interfaceSlice';
import { StrangeAttractor, TransformationRule } from '../types';
import { RootState } from '../store/types';

/**
 * Custom hook for node state management and transformations
 * @param nodeId Optional node ID to focus on
 */
export const useNodeState = (nodeId?: string) => {
  const dispatch = useDispatch();
  
  // Get current node ID if not provided
  const currentNodeId = useSelector(selectCurrentNodeId);
  const targetNodeId = nodeId || currentNodeId;
  
  // Select node data
  const node = useSelector((state: RootState) => 
    targetNodeId ? selectNodeById(state as any, targetNodeId) : null
  );
  
  // Get revisit count
  const revisitCount = useSelector((state: RootState) => 
    targetNodeId ? selectNodeRevisitCount(state as any, targetNodeId) : 0
  );
  
  // Navigate to a node
  const navigateTo = useCallback((id: string) => {
    // Record navigation in reader path
    dispatch(navigateToNode(id));
    
    // Record visit in node state
    dispatch(visitNode(id));
    
    // Switch to reading view
    dispatch(setViewMode('reading'));
    
    // This would be where we load the node content in a real implementation
    // For now, we'll just log it
    console.log(`Navigating to node: ${id}`);
  }, [dispatch]);
  
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
  
  // Apply transformations based on visit count
  useEffect(() => {
    if (!node || !targetNodeId) return;
    
    // In a real implementation, we would calculate transformations based on
    // visit patterns, strange attractors engaged, etc.
    // For now, this is just a placeholder for the concept
    
    // Create example transformation for revisit
    if (revisitCount === 1) {
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
    
    // Create example transformation for second revisit
    if (revisitCount === 2) {
      const advancedTransformation: TransformationRule = {
        condition: {
          visitCount: 2
        },
        transformations: [
          {
            type: 'fragment',
            selector: 'second-paragraph',
            fragmentPattern: 'temporal-disruption'
          }
        ]
      };
      
      applyNodeTransformation(targetNodeId, advancedTransformation);
    }
    
  }, [node, targetNodeId, revisitCount, applyNodeTransformation]);
  
  // Return the API
  return {
    node,
    navigateTo,
    revealNodeConnection,
    engageWithAttractor,
    applyNodeTransformation,
    neighbors,
    revisitCount
  };
};

export default useNodeState;