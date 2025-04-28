// src/config/contentMapping.ts

export const contentMapping = {
    // Archaeologist nodes
    'arch-discovery': '/src/content/arch-discovery.md',
    'arch-loss': '/src/content/arch-loss.md',
    'arch-choice': '/src/content/arch-choice.md',
    
    // Algorithm nodes
    'algo-awakening': '/src/content/algo-awakening.md',
    'algo-integration': '/src/content/algo-integration.md',
    'algo-evolution': '/src/content/algo-evolution.md',
    
    // Last Human nodes
    'human-discovery': '/src/content/human-discovery.md',
    'human-recognition': '/src/content/human-recognition.md',
    'human-upload': '/src/content/human-upload.md'
  };
  
  // Define a type for the keys of contentMapping
  export type ContentMappingKeys = keyof typeof contentMapping;

  // Helper function to get content path from node ID
  export function getContentPath(nodeId: ContentMappingKeys): string {
    return contentMapping[nodeId] || '';
  }