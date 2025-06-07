/**
 * Redux slice for managing reader state in Eternal Return of the Digital Self
 * Tracks the reader's journey, patterns, and progression toward endpoints
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ReadingPath,
  StrangeAttractor,
  EndpointOrientation,
  NodeVisit,
  NodeTransition,
  Character,
  TemporalLabel,
  getTemporalLabel
} from '../../types';

export interface ReaderState { // Add 'export' here
  path: ReadingPath;
  currentNodeId: string | null;
  previousNodeId: string | null;
  endpointProgress: Record<EndpointOrientation, number>;
  attractorEngagement: Record<StrangeAttractor, number>;
  sessionStartTime: number;
  totalReadingTime: number;
}


// Duration thresholds for reading rhythm analysis (in milliseconds)
export const FAST_TRANSITION_THRESHOLD = 30000; // 30 seconds
export const DEEP_ENGAGEMENT_THRESHOLD = 120000; // 2 minutes

// Initial state for the reader's path
const initialReadingPath: ReadingPath = {
  sequence: [],
  timestamps: {},
  durations: {},
  revisitPatterns: {},
  attractorsEngaged: {} as Record<StrangeAttractor, number>,
  
  // Enhanced path tracking
  detailedVisits: [],
  transitions: [],
  characterFocus: {} as Record<Character, number>,
  temporalLayerFocus: {} as Record<TemporalLabel, number>,
  readingRhythm: {
    fastTransitions: 0,
    deepEngagements: 0
  },
  patternSequences: {
    repeatedSequences: [],
    characterSequences: [],
    temporalSequences: []
  }
};

// Initial state for the reader slice
const initialState: ReaderState = {
  path: initialReadingPath,
  currentNodeId: null,
  previousNodeId: null,
  endpointProgress: {
    past: 0,
    present: 0,
    future: 0
  },
  attractorEngagement: {} as Record<StrangeAttractor, number>,
  sessionStartTime: Date.now(),
  totalReadingTime: 0
};

// Create the reader slice
const readerSlice = createSlice({
  name: 'reader',
  initialState,
  reducers: {
    // Record navigation to a node with enhanced tracking
    navigateToNode: (state, action: PayloadAction<{
      nodeId: string;
      character: Character;
      temporalValue: number;
      attractors: StrangeAttractor[];
    }>) => {
      const { nodeId, character, temporalValue } = action.payload;
      const now = Date.now();
      const temporalLayer = getTemporalLabel(temporalValue);
      
      // Calculate visit duration for previous node
      let duration = 0;
      if (state.currentNodeId) {
        duration = now - (state.path.timestamps[state.currentNodeId] || now);
        state.path.durations[state.currentNodeId] =
          (state.path.durations[state.currentNodeId] || 0) + duration;
        
        // Update reading rhythm analysis
        if (duration < FAST_TRANSITION_THRESHOLD) {
          if (!state.path.readingRhythm) {
            state.path.readingRhythm = { fastTransitions: 0, deepEngagements: 0 };
          }
          state.path.readingRhythm.fastTransitions++;
        } else if (duration > DEEP_ENGAGEMENT_THRESHOLD) {
          if (!state.path.readingRhythm) {
            state.path.readingRhythm = { fastTransitions: 0, deepEngagements: 0 };
          }
          state.path.readingRhythm.deepEngagements++;
        }
        
        // Create transition record
        const transition: NodeTransition = {
          from: state.currentNodeId,
          to: nodeId,
          timestamp: now,
          duration,
          attractorsEngaged: [] as StrangeAttractor[]  // Will be populated by engageAttractor action
        };
        if (!state.path.transitions) {
          state.path.transitions = [];
        }
        state.path.transitions.push(transition);
        
        state.previousNodeId = state.currentNodeId;
      }
      
      // Update current node
      state.currentNodeId = nodeId;
      
      // Add to sequence
      state.path.sequence.push(nodeId);
      
      // Record timestamp
      state.path.timestamps[nodeId] = now;
      
      // Track revisit pattern
      const revisitCount = (state.path.revisitPatterns[nodeId] || 0) + 1;
      state.path.revisitPatterns[nodeId] = revisitCount;
      
      // Track character and temporal layer focus
      if (!state.path.characterFocus) {
        state.path.characterFocus = {} as Record<Character, number>;
      }
      state.path.characterFocus[character] = (state.path.characterFocus[character] || 0) + 1;
      
      if (!state.path.temporalLayerFocus) {
        state.path.temporalLayerFocus = {} as Record<TemporalLabel, number>;
      }
      state.path.temporalLayerFocus[temporalLayer] = (state.path.temporalLayerFocus[temporalLayer] || 0) + 1;
      
      // Create detailed visit record
      const visit: NodeVisit = {
        nodeId,
        timestamp: now,
        duration: 0,  // Will be updated on next navigation
        character,
        temporalLayer,
        engagedAttractors: [] as StrangeAttractor[],  // Will be populated by engageAttractor action
        index: state.path.sequence.length - 1,
        revisitCount
      };
      if (!state.path.detailedVisits) {
        state.path.detailedVisits = [];
      }
      state.path.detailedVisits.push(visit);
      
      // Update pattern sequences (will be fully implemented in analyzePatterns action)
      // This just ensures the arrays exist for now
      if (!state.path.patternSequences) {
        state.path.patternSequences = {
          repeatedSequences: [],
          characterSequences: [],
          temporalSequences: []
        };
      }
      if (!Array.isArray(state.path.patternSequences.characterSequences)) {
        state.path.patternSequences.characterSequences = [];
      }
      if (!Array.isArray(state.path.patternSequences.temporalSequences)) {
        state.path.patternSequences.temporalSequences = [];
      }
      
      // Update character and temporal sequences
      const characterSequence = state.path.patternSequences.characterSequences[0] || [];
      characterSequence.push(character);
      state.path.patternSequences.characterSequences[0] = characterSequence;
      
      const temporalSequence = state.path.patternSequences.temporalSequences[0] || [];
      temporalSequence.push(temporalLayer);
      state.path.patternSequences.temporalSequences[0] = temporalSequence;
    },
    
    // Record engagement with a strange attractor with enhanced tracking
    engageAttractor: (state, action: PayloadAction<StrangeAttractor>) => {
      const attractor = action.payload;
      
      // Update global counts
      state.path.attractorsEngaged[attractor] = (state.path.attractorsEngaged[attractor] || 0) + 1;
      state.attractorEngagement[attractor] = (state.attractorEngagement[attractor] || 0) + 1;
      
      // Update current visit and transition records if they exist
      if (state.path.detailedVisits && state.path.detailedVisits.length > 0) {
        const currentVisit = state.path.detailedVisits[state.path.detailedVisits.length - 1];
        if (!currentVisit.engagedAttractors.includes(attractor)) {
          currentVisit.engagedAttractors.push(attractor);
        }
      }
      
      if (state.path.transitions && state.path.transitions.length > 0) {
        const currentTransition = state.path.transitions[state.path.transitions.length - 1];
        if (!currentTransition.attractorsEngaged.includes(attractor)) {
          currentTransition.attractorsEngaged.push(attractor);
        }
      }
    },
    
    // Update endpoint progress based on reading patterns
    updateEndpointProgress: (state, action: PayloadAction<{ 
      orientation: EndpointOrientation, 
      value: number 
    }>) => {
      const { orientation, value } = action.payload;
      state.endpointProgress[orientation] = Math.min(100, Math.max(0, value));
    },
    
    // Calculate and update total reading time
    updateReadingTime: (state) => {
      const now = Date.now();
      state.totalReadingTime += now - state.sessionStartTime;
      state.sessionStartTime = now;
    },
    
    // Reset the reader's state (for testing)
    resetReader: (state) => {
      state.path = initialReadingPath;
      state.currentNodeId = null;
      state.previousNodeId = null;
      state.endpointProgress = {
        past: 0,
        present: 0,
        future: 0
      };
      state.attractorEngagement = {} as Record<StrangeAttractor, number>;
      state.sessionStartTime = Date.now();
      state.totalReadingTime = 0;
    },
    
    // Analyze the reader's path for patterns
    analyzePatterns: (state) => {
      // Implement pattern analysis
      const { sequence } = state.path;
      
      // Find repeated subsequences (minimum length 2)
      if (sequence.length >= 4) {  // Need at least 4 elements to have a repeated subsequence of length 2
        const repeatedSequences: string[][] = [];
        
        // Check for subsequences of length 2 to length/2
        for (let length = 2; length <= Math.floor(sequence.length / 2); length++) {
          // Generate all subsequences of current length
          for (let i = 0; i <= sequence.length - length * 2; i++) {
            const subseq1 = sequence.slice(i, i + length);
            
            // Look for matches in the remaining sequence
            for (let j = i + length; j <= sequence.length - length; j++) {
              const subseq2 = sequence.slice(j, j + length);
              
              // Check if sequences match
              if (subseq1.every((id, idx) => id === subseq2[idx])) {
                // Check if this sequence is already recorded
                const alreadyRecorded = repeatedSequences.some(seq =>
                  seq.length === subseq1.length &&
                  seq.every((id, idx) => id === subseq1[idx])
                );
                
                if (!alreadyRecorded) {
                  repeatedSequences.push(subseq1);
                }
                
                // We found a match, so no need to check further for this starting position
                break;
              }
            }
          }
        }
        
        if (!state.path.patternSequences) {
          state.path.patternSequences = {
            repeatedSequences: [],
            characterSequences: [],
            temporalSequences: []
          };
        }
        state.path.patternSequences.repeatedSequences = repeatedSequences;
      }
      
      // Character perspective patterns are already tracked in patternSequences.characterSequences
      // Temporal layer patterns are already tracked in patternSequences.temporalSequences
    },
    
    // Update detailed visit duration for current node
    updateCurrentVisitDuration: (state) => {
      if (state.currentNodeId && state.path.detailedVisits && state.path.detailedVisits.length > 0) {
        const now = Date.now();
        const lastVisit = state.path.detailedVisits[state.path.detailedVisits.length - 1];
        
        if (lastVisit.nodeId === state.currentNodeId) {
          const duration = now - lastVisit.timestamp;
          lastVisit.duration = duration;
          
          // Also update the durations record
          state.path.durations[state.currentNodeId] =
            (state.path.durations[state.currentNodeId] || 0) + duration;
        }
      }
    }
  }
});

// Export actions
export const { 
  navigateToNode, 
  engageAttractor, 
  updateEndpointProgress,
  updateReadingTime,
  resetReader,
  analyzePatterns,
  updateCurrentVisitDuration
} = readerSlice.actions;

// Export selector functions
export const selectCurrentNodeId = (state: { reader: ReaderState }) => 
  state.reader.currentNodeId;

export const selectPreviousNodeId = (state: { reader: ReaderState }) => 
  state.reader.previousNodeId;

export const selectReadingPath = (state: { reader: ReaderState }) => 
  state.reader.path;

export const selectEndpointProgress = (state: { reader: ReaderState }) => 
  state.reader.endpointProgress;

export const selectMostVisitedNodes = (state: { reader: ReaderState }, count: number = 3) => {
  const { revisitPatterns } = state.reader.path;
  
  return Object.entries(revisitPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([nodeId, count]) => ({ nodeId, count }));
};

export const selectMostEngagedAttractors = (state: { reader: ReaderState }, count: number = 3) => {
  const { attractorsEngaged } = state.reader.path;
  
  return Object.entries(attractorsEngaged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([attractor, count]) => ({ attractor, count }));
};

export const selectRecentPath = (state: { reader: ReaderState }, count: number = 5) => {
  return state.reader.path.sequence.slice(-count);
};

export const selectNodeRevisitCount = (state: { reader: ReaderState }, nodeId: string) => {
  return state.reader.path.revisitPatterns[nodeId] || 0;
};

export const selectTotalReadingTime = (state: { reader: ReaderState }) => {
  // Calculate current session time + stored total
  const currentSessionTime = Date.now() - state.reader.sessionStartTime;
  return state.reader.totalReadingTime + currentSessionTime;
};

// New selectors for enhanced path tracking

export const selectDetailedVisits = (state: { reader: ReaderState }) =>
  state.reader.path.detailedVisits;

export const selectTransitions = (state: { reader: ReaderState }) =>
  state.reader.path.transitions;

export const selectCharacterFocus = (state: { reader: ReaderState }) =>
  state.reader.path.characterFocus;

export const selectTemporalLayerFocus = (state: { reader: ReaderState }) =>
  state.reader.path.temporalLayerFocus;

export const selectReadingRhythm = (state: { reader: ReaderState }) =>
  state.reader.path.readingRhythm;

export const selectRepeatedSequences = (state: { reader: ReaderState }) =>
  state.reader.path.patternSequences?.repeatedSequences || [];

export const selectCharacterSequences = (state: { reader: ReaderState }) =>
  state.reader.path.patternSequences?.characterSequences || [];

export const selectTemporalSequences = (state: { reader: ReaderState }) =>
  state.reader.path.patternSequences?.temporalSequences || [];

export const selectTransitionsForNode = (state: { reader: ReaderState }, nodeId: string) => {
  return state.reader.path.transitions?.filter(
    transition => transition.from === nodeId || transition.to === nodeId
  ) || [];
};

export const selectMostFrequentTransitions = (state: { reader: ReaderState }, count: number = 3) => {
  const transitions = state.reader.path.transitions || [];
  
  // Create a map of transition pairs (fromId-toId) to count
  const transitionCounts = transitions.reduce((counts, transition) => {
    const key = `${transition.from}-${transition.to}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  // Sort and return top transitions
  return Object.entries(transitionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, count]) => {
      const [fromId, toId] = key.split('-');
      return { fromId, toId, count };
    });
};

export const selectMostEngagingNodes = (state: { reader: ReaderState }, count: number = 3) => {
  const detailedVisits = state.reader.path.detailedVisits || [];
  
  // Group by nodeId and calculate average duration
  const nodeEngagement = detailedVisits.reduce((engagement, visit) => {
    if (!engagement[visit.nodeId]) {
      engagement[visit.nodeId] = { totalDuration: 0, visits: 0 };
    }
    engagement[visit.nodeId].totalDuration += visit.duration;
    engagement[visit.nodeId].visits += 1;
    return engagement;
  }, {} as Record<string, { totalDuration: number, visits: number }>);
  
  // Calculate average durations and sort
  return Object.entries(nodeEngagement)
    .map(([nodeId, data]) => ({
      nodeId,
      averageDuration: data.totalDuration / data.visits,
      totalDuration: data.totalDuration,
      visitCount: data.visits
    }))
    .sort((a, b) => b.averageDuration - a.averageDuration)
    .slice(0, count);
};

export default readerSlice.reducer;