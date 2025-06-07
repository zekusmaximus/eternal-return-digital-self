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
 * Enhanced transformation condition for content transformations
 */
export interface TransformationCondition {
  // Basic visit count threshold
  visitCount?: number;
  
  // Sequence of nodes that must have been visited in order
  visitPattern?: string[];
  
  // Set of nodes that must have been visited (in any order)
  previouslyVisitedNodes?: string[];
  
  // Strange attractors that must be engaged
  strangeAttractorsEngaged?: StrangeAttractor[];
  
  // Temporal position requirement (past, present, future)
  temporalPosition?: TemporalLabel;
  
  // Time-based conditions
  minTimeSpentInNode?: number; // Minimum time spent in current node (ms)
  totalReadingTime?: number;   // Minimum total reading time (ms)
  
  // Endpoint progress conditions
  endpointProgress?: {
    orientation: EndpointOrientation;
    minValue: number; // Minimum progress value (0-100)
  };
  
  // Revisit pattern - e.g., must have revisited a specific node at least N times
  revisitPattern?: {
    nodeId: string;
    minVisits: number;
  }[];
  
  // Logical operators for complex conditions
  anyOf?: TransformationCondition[]; // At least one condition must be true
  allOf?: TransformationCondition[]; // All conditions must be true
  not?: TransformationCondition;     // Condition must be false
}

/**
 * Transformation rules for text content based on conditions
 */
export interface TransformationRule {
  condition: TransformationCondition;
  transformations: TextTransformation[];
}

/**
 * A specific text transformation to be applied
 */
export interface TextTransformation {
  type: 'replace' | 'fragment' | 'expand' | 'emphasize' | 'metaComment';
  selector: string; // Original text to transform
  replacement?: string; // New text (for replace, expand)
  
  // Fragment transformation properties
  fragmentPattern?: string; // How to fragment the text
  fragmentStyle?: 'character' | 'word' | 'progressive' | 'random'; // Style of fragmentation
  
  // Emphasis transformation properties
  emphasis?: 'italic' | 'bold' | 'color' | 'spacing' | 'highlight' | 'glitch' | 'fade'; // Type of emphasis
  intensity?: number; // Intensity level of emphasis (1-5)
  
  // Replace transformation properties
  preserveFormatting?: boolean; // Whether to preserve markdown formatting when replacing
  
  // Expand transformation properties
  expandStyle?: 'append' | 'inline' | 'paragraph' | 'reveal'; // Style of expansion
  
  // Meta comment properties
  commentStyle?: 'inline' | 'footnote' | 'marginalia' | 'interlinear'; // Style of meta comment
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
export interface NarramorphContent {
  [visitCount: number]: string;
}

export interface NodeState extends Node {
  visitCount: number;
  lastVisitTimestamp: number;
  currentState: NodeVisualState;
  revealedConnections: string[]; // All available connections (initial + revealed)
  transformations: TransformationRule[]; // Applied transformations
  content: NarramorphContent | null; // Holds all content versions
  currentContent: string | null; // The currently displayed content
}

/**
 * Node representation for the constellation view, with 2D coordinates and color
 */
export interface ConstellationNode extends NodeState {
  x: number;
  y: number;
  color: string;
}

/**
 * Map of node IDs to their 3D positions for the constellation view
 */
export type NodePositions = {
  [key: string]: [number, number, number];
};
/**
 * Represents a connection between two nodes
 */
export type Connection = {
  source: string;
  target: string;
};
/**
 * Represents a single transition between nodes
 */
export interface NodeTransition {
  from: string; // Source node ID
  to: string; // Target node ID
  timestamp: number; // When the transition occurred
  duration: number; // How long the reader spent on the "from" node
  attractorsEngaged: StrangeAttractor[]; // Which attractors were engaged during this transition
}

/**
 * Represents detailed information about a node visit
 */
export interface NodeVisit {
  nodeId: string; // ID of the visited node
  timestamp: number; // When the visit occurred
  duration: number; // How long the visit lasted
  character: Character; // Character perspective of the node
  temporalLayer: TemporalLabel; // Temporal layer of the node
  engagedAttractors: StrangeAttractor[]; // Attractors engaged during this visit
  index: number; // Sequential position in the reading path (0-based)
  revisitCount: number; // How many times this specific node had been visited (including this visit)
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
  
  // Enhanced path tracking - optional to maintain compatibility
  detailedVisits?: NodeVisit[]; // Detailed information about each visit
  transitions?: NodeTransition[]; // Detailed information about transitions between nodes
  characterFocus?: Record<Character, number>; // Count of visits to each character's nodes
  temporalLayerFocus?: Record<TemporalLabel, number>; // Count of visits to each temporal layer
  readingRhythm?: {
    fastTransitions: number; // Count of transitions under a threshold duration
    deepEngagements: number; // Count of visits over a threshold duration
  };
  patternSequences?: {
    repeatedSequences: string[][]; // Sequences of nodes that have been visited more than once
    characterSequences: Character[][]; // Sequences of character perspectives
    temporalSequences: TemporalLabel[][]; // Sequences of temporal layers
  };
}

/**
 * Global state interface for the Redux store
 */
export interface RootState {
  nodes: {
    data: Record<string, NodeState>; // Nodes by ID
    initialized: boolean;
  };
  reader: {
    path: ReadingPath;
    currentNodeId: string | null;
    endpointProgress: Record<EndpointOrientation, number>; // Progress toward each endpoint (0-100)
  };
  interface: {
    viewMode: 'constellation' | 'reading';
    showMiniConstellation: boolean;
    showMetaInterface: boolean;
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