import { useMemo } from 'react';
import { NodeState, NodePositions } from '../types';

/**
 * Custom hook to calculate the 3D positions of nodes in a spherical layout.
 * This uses a Fibonacci sphere algorithm for even distribution.
 * @param nodes - The array of node state objects.
 * @param radius - The radius of the sphere.
 * @returns A map of node IDs to their 3D positions.
 */
export const useNodePositions = (nodes: NodeState[], radius: number = 15): NodePositions => {
  const nodePositions = useMemo(() => {
    const positions: NodePositions = {};

    if (nodes.length === 0) {
      return positions;
    }

    const numNodes = nodes.length;
    const offset = 2.0 / numNodes;
    const increment = Math.PI * (3.0 - Math.sqrt(5.0));

    nodes.forEach((node, index) => {
      const y = ((index * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1 - y * y);
      const phi = index * increment;

      const x = Math.cos(phi) * r * radius;
      const z = Math.sin(phi) * r * radius;

      positions[node.id] = [x, y * radius, z];
    });

    return positions;
  }, [nodes, radius]);

  return nodePositions;
};
