/**
 * Core type definitions for the Eternal Return of the Digital Self project.
 * These types define the structure of nodes, reader state, and transformations.
 */

/**
 * Characters in the narrative
 */
export type Character = 'Archaeologist' | 'Algorithm' | 'LastHuman';

/**
 * Temporal positions in the narrative
 */
export type TemporalLabel = 'past' | 'present' | 'future';

/**
 * Strange attractors - philosophical themes that connect nodes
 */
export type StrangeAttractor = 
  | 'recursion-pattern' 
  | 'memory-fragment' 
  | 'verification-ritual' 
  | 'identity-pattern' 
  | 'recursion-chamber' 
  | 'process-language' 
  | 'autonomous-fragment' 
  | 'quantum-perception' 
  | 'distributed-consciousness' 
  | 'recursive-loop' 
  | 'quantum-uncertainty' 
  | 'continuity-interface' 
  | 'system-decay' 
  | 'quantum-transformation' 
  | 'memory-artifact' 
  | 'recursive-symbol' 
  | 'recognition-pattern' 
  | 'memory-sphere' 
  | 'quantum-déjà-vu' 
  | 'quantum-choice';

/**
 * Visual states of a node in the constellation view
 */
export type NodeVisualState = 
  | 'unvisited'  // Initial state before first visit
  | 'visited'    // After first visit
  | 'revisited'  // After second visit
  | 'complex'    // After multiple visits and pattern recognition
  | 'fragmented'; // Highest state of transformation

/**
 * Possible philosophical endpoint orientations for nodes that serve as endpoints
 */
export type EndpointOrientation = 'past' | 'present' | 'future';

/**
 * Transformation rules for text content based on visit patterns
 */
export interface TransformationRule {
  condition: {
    visitCount?: number;
    previouslyVisitedNodes?: string[];
    visitPattern?: string[];
    strangeAttractorsEngaged?: StrangeAttractor[];
  };
  transformations: TextTransformation[];
}

/**
 * A specific text transformation to be applied
 */
export interface TextTransformation {
  type: 'replace' | 'fragment' | 'expand' | 'emphasize' | 'metaComment';
  selector: string; // Original text to transform
  replacement?: string; // New text (for replace, expand)
  fragmentPattern?: string; // How to fragment the text
  emphasis?: 'italic' | 'bold' | 'color' | 'spacing'; // Type of emphasis
}

/**
 * Core Node structure - represents a single narrative node
 */
export interface Node {
  id: string;
  title: string;
  character: Character;
  temporalValue: number; // 1-9 for positioning
  initialConnections: string[]; // IDs of connected nodes
  contentSource: string; // Path to content file
  coreConcept: string; // Short summary for development
  strangeAttractors: StrangeAttractor[];
  transformationThresholds: {
    visit: number; // Threshold for 'visited' state
    revisit: number; // Threshold for 'revisited' state  
    complex: number; // Threshold for 'complex' state
    fragmented: number; // Threshold for 'fragmented' state
  };
  isEndpoint?: boolean;
  endpointOrientation?: EndpointOrientation;
}

/**
 * Node instance state - combines static node data with reader-specific state
 */
export interface NodeState extends Node {
  visitCount: number;
  lastVisitTimestamp: number;
  currentState: NodeVisualState;
  revealedConnections: string[]; // All available connections (initial + revealed)
  transformations: TransformationRule[]; // Applied transformations
}

/**
 * Reader path records the journey through the narrative
 */
export interface ReadingPath {
  sequence: string[]; // Ordered array of visited node IDs
  timestamps: Record<string, number>; // Timestamp of each node visit
  durations: Record<string, number>; // Duration spent on each node
  revisitPatterns: Record<string, number>; // Count of revisits per node
  attractorsEngaged: Record<StrangeAttractor, number>; // Count of engagements with attractors
}

/**
 * Global state interface for the Redux store
 */
export interface RootState {
  nodes: {
    data: Record<string, NodeState>; // Nodes by ID
    initialized: boolean;
    loading: boolean;
    error: string | null;
  };
  reader: {
    path: ReadingPath;
    currentNodeId: string | null;
    previousNodeId: string | null;
    endpointProgress: Record<EndpointOrientation, number>; // Progress toward each endpoint (0-100)
    attractorEngagement: Record<StrangeAttractor, number>;
    sessionStartTime: number;
    totalReadingTime: number;
  };
  interface: {
    viewMode: 'constellation' | 'reading';
    showMiniConstellation: boolean;
    showMetaInterface: boolean;
    showStrangeAttractors: boolean;
    constellationZoom: number;
    constellationRotation: {
      x: number;
      y: number;
      z: number;
    };
    textSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    animations: 'reduced' | 'full';
    transitionSpeed: number;
    helpModalOpen: boolean;
    aboutModalOpen: boolean;
  };
}

/**
 * Helper function to derive temporal label from numerical value
 */
export function getTemporalLabel(temporalValue: number): TemporalLabel {
  if (temporalValue <= 3) return 'past';
  if (temporalValue <= 6) return 'present';
  return 'future';
}