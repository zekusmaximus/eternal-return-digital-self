/**
 * TransformationPriorityQueue
 * 
 * Utility for managing prioritized transformations and resolving conflicts
 * in the Narramorph content transformation system.
 */

import { TextTransformation } from '../types';

/**
 * Represents a transformation with its priority and metadata
 */
export interface PrioritizedTransformation {
  transformation: TextTransformation;
  priority: number;
  conflictGroup?: string; // Identifier for potentially conflicting transformations
}

/**
 * Priority queue for content transformations
 */
export class TransformationPriorityQueue {
  private transformations: PrioritizedTransformation[] = [];
  
  /**
   * Add a transformation to the queue with a specified priority
   */
  public enqueue(transformation: TextTransformation, priority: number, conflictGroup?: string): void {
    this.transformations.push({
      transformation,
      priority,
      conflictGroup
    });
  }
  
  /**
   * Add multiple transformations with the same priority
   */
  public enqueueAll(transformations: TextTransformation[], priority: number, conflictGroup?: string): void {
    transformations.forEach(transformation => {
      this.enqueue(transformation, priority, conflictGroup);
    });
  }
  
  /**
   * Adjust the priority of a transformation
   */
  public adjustPriority(selector: string, type: string, priorityAdjustment: number): void {
    for (const item of this.transformations) {
      if (item.transformation.selector === selector && item.transformation.type === type) {
        item.priority += priorityAdjustment;
        break;
      }
    }
  }
  
  /**
   * Get all transformations ordered by priority (highest first)
   */
  public getAll(): PrioritizedTransformation[] {
    return [...this.transformations].sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get the transformations with resolved conflicts
   * For each conflict group, only the highest priority transformation is kept
   */
  public getResolvedTransformations(): TextTransformation[] {
    // Group transformations by conflict group
    const conflictGroups: Record<string, PrioritizedTransformation[]> = {};
    const noConflict: PrioritizedTransformation[] = [];
    
    // Separate transformations into conflict groups and no-conflict
    for (const item of this.transformations) {
      if (item.conflictGroup) {
        if (!conflictGroups[item.conflictGroup]) {
          conflictGroups[item.conflictGroup] = [];
        }
        conflictGroups[item.conflictGroup].push(item);
      } else {
        noConflict.push(item);
      }
    }
    
    // For each conflict group, get the highest priority transformation
    const resolved: PrioritizedTransformation[] = [...noConflict];
    
    for (const group of Object.values(conflictGroups)) {
      if (group.length > 0) {
        group.sort((a, b) => b.priority - a.priority);
        resolved.push(group[0]);
      }
    }
    
    // Sort final resolved transformations by priority and extract the transformation objects
    return resolved
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.transformation);
  }
  
  /**
   * Clear the queue
   */
  public clear(): void {
    this.transformations = [];
  }
  
  /**
   * Get the number of transformations in the queue
   */
  public size(): number {
    return this.transformations.length;
  }
  
  /**
   * Check if a transformation with the given selector and type exists in the queue
   */
  public contains(selector: string, type: string): boolean {
    return this.transformations.some(
      item => item.transformation.selector === selector && 
              item.transformation.type === type
    );
  }
}

// Export a singleton instance for use throughout the application
export const transformationPriorityQueue = new TransformationPriorityQueue();