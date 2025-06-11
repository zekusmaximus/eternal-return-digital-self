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
 * Enhanced transformation condition for content transformations.
 * 
 * This interface supports both basic navigation-based conditions and advanced
 * PathAnalyzer-integrated conditions for sophisticated content adaptation.
 * 
 * Basic Conditions:
 * - visitCount: Minimum number of visits to current node
 * - visitPattern: Specific sequence of nodes that must have been visited
 * - previouslyVisitedNodes: Set of nodes that must have been visited (any order)
 * - strangeAttractorsEngaged: Thematic attractors that must be engaged
 * - temporalPosition: Required temporal layer (past/present/future)
 * - endpointProgress: Progress toward philosophical endpoints
 * - revisitPattern: Specific revisit requirements for nodes
 * - characterBleed: Transition between different character perspectives
 * - journeyPattern: Recent navigation sequence matching
 * 
 * Advanced PathAnalyzer Conditions:
 * - characterFocus: Character preference patterns and intensity analysis
 * - temporalFocus: Temporal layer focus patterns and progression analysis
 * - attractorAffinity: Thematic affinity patterns and continuity analysis
 * - attractorEngagement: Detailed engagement metrics and trend analysis
 * - recursivePattern: Recursive navigation patterns and strength analysis
 * - journeyFingerprint: Complete navigation style and behavioral patterns
 * 
 * Logical Operators:
 * - anyOf: At least one condition must be true (OR)
 * - allOf: All conditions must be true (AND)
 * - not: Condition must be false (NOT)
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
  
  // Character bleed condition - detects when previous node had different character
  characterBleed?: boolean;
    // Journey pattern condition - matches recent navigation sequences
  journeyPattern?: string[];
  
  // Character focus condition - evaluates character preference patterns
  characterFocus?: {
    characters: Character[];
    minFocusRatio?: number; // Default 0.4 (40%)
    includeIntensity?: boolean; // Use character focus intensity metrics
  };
  
  // Temporal focus condition - evaluates temporal layer focus patterns
  temporalFocus?: {
    temporalLayers: TemporalLabel[];
    minFocusRatio?: number; // Default 0.4 (40%)
    includeProgression?: boolean; // Check for chronological patterns
  };
  
  // Attractor affinity condition - evaluates thematic affinity patterns
  attractorAffinity?: {
    attractors: StrangeAttractor[];
    minAffinityRatio?: number; // Default 0.25 (25%)
    includeThematicContinuity?: boolean; // Check thematic connections
  };
  
  // Attractor engagement condition - evaluates engagement level conditions
  attractorEngagement?: {
    attractor: StrangeAttractor;
    minEngagementScore?: number; // Default 50 (0-100 scale)
    trendRequired?: 'rising' | 'falling' | 'stable' | 'any';
  };
  
  // Recursive pattern condition - evaluates recursive navigation patterns
  recursivePattern?: {
    minPatternStrength?: number; // Default 0.6
    maxPatternLength?: number; // Default 4
    requireRecency?: boolean; // Pattern must be recent
  };
  
  // Journey fingerprint condition - evaluates navigation style patterns
  journeyFingerprint?: {
    explorationStyle?: 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic';
    temporalPreference?: 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid';
    narrativeApproach?: 'systematic' | 'intuitive' | 'thematic' | 'experimental';
    minComplexityIndex?: number; // 0-1 scale
    minFocusIndex?: number; // 0-1 scale
  };
  
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
  
  // Performance optimization properties
  priority?: 'high' | 'medium' | 'low'; // Used for prioritizing transformations for lazy loading
  applyImmediately?: boolean; // Force immediate application regardless of visibility
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
 * Content variants for different journey states and visit counts
 */
export interface ContentVariant {
  visitCount?: number; // Visit-count based variants (legacy support)
  sectionName?: string; // Named section variants (e.g., 'after-algorithm', 'recursive-awareness')
  content: string;
}

/**
 * Node instance state - combines static node data with reader-specific state
 */
export interface NarramorphContent {
  [visitCount: number]: string; // Legacy visit-count based content
}

/**
 * Enhanced content structure supporting both visit-count and section-based variants
 */
export interface EnhancedNarramorphContent {
  base: string; // Default content
  visitCountVariants: { [visitCount: number]: string }; // Visit-count based variants
  sectionVariants: { [sectionName: string]: string }; // Named section variants
}

/**
 * Journey context tracking for character bleed and navigation pattern effects
 */
export interface JourneyContext {
  lastVisitedCharacter?: Character; // Character from previous node visit
  journeyPattern: string[]; // Recent navigation sequence (node IDs)
  recursiveAwareness: number; // Recursive pattern intensity (0-1)
  temporalDisplacement: boolean; // Cross-temporal character awareness flag
}

export interface NodeState extends Node {
  visitCount: number;
  currentState: NodeVisualState;
  revealedConnections: string[]; // All available connections (initial + revealed)
  transformations: TransformationRule[]; // Applied transformations
  content: NarramorphContent | null; // Legacy content structure
  enhancedContent: EnhancedNarramorphContent | null; // New enhanced content structure
  currentContent: string | null; // The currently displayed content
  journeyContext?: JourneyContext; // Optional journey context for character bleed effects
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
  // Time-based tracking removed (2025-06-08)
  attractorsEngaged: StrangeAttractor[]; // Which attractors were engaged during this transition
}

/**
 * Represents detailed information about a node visit
 */
export interface NodeVisit {
  nodeId: string; // ID of the visited node
  // Time-based tracking removed (2025-06-08)
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
  revisitPatterns: Record<string, number>; // Count of revisits per node
  attractorsEngaged: Record<StrangeAttractor, number>; // Count of engagements with attractors
  
  // Enhanced path tracking - optional to maintain compatibility
  detailedVisits?: NodeVisit[]; // Detailed information about each visit
  transitions?: NodeTransition[]; // Detailed information about transitions between nodes
  characterFocus?: Record<Character, number>; // Count of visits to each character's nodes
  temporalLayerFocus?: Record<TemporalLabel, number>; // Count of visits to each temporal layer
  // Time-based reading rhythm tracking removed (2025-06-08)
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