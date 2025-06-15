import React, { useEffect, useState, useRef, memo } from 'react';
import { useNodeState } from '../../hooks/useNodeState';
import { TextTransformation } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import '../../styles/NarramorphTransformations.css';
import '../../styles/SimpleTextRenderer.css';
import SimpleTransformationContainer from './SimpleTransformationContainer';

interface SimpleTextRendererProps {
  nodeId?: string;
  onRenderComplete?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

// Priority mapping for transformations
const PRIORITY_MAP: Record<string, number> = {
  'high': 3,
  'medium': 2,
  'low': 1
};

// Helper function to get transformation priority
const getTransformationPriority = (priority: string = 'medium'): number => {
  return PRIORITY_MAP[priority] || 2;
};

// Helper function to sort transformations by priority
const sortTransformationsByPriority = (transformations: TextTransformation[]): TextTransformation[] => {
  return [...transformations].sort((a, b) => {
    const aPriority = getTransformationPriority(a.priority);
    const bPriority = getTransformationPriority(b.priority);
    return bPriority - aPriority;
  });
};

// Helper function to create transformation HTML
const createTransformationHtml = (
  type: string,
  selector: string,
  options: { replacement?: string; emphasis?: string } = {}
): string => {
  const { replacement, emphasis } = options;
  
  const baseClass = 'text-transformation';
  switch (type) {
    case 'replace':
      return `<span class="${baseClass} text-replaced" data-transform-type="replace">${replacement}</span>`;
    case 'emphasize':
      return `<span class="${baseClass} text-emphasis text-emphasis-${emphasis}" data-transform-type="emphasize" data-emphasis="${emphasis}">${selector}</span>`;
    case 'expand':
      return `<span class="${baseClass} text-expanded" data-transform-type="expand">${selector}</span>`;
    case 'fragment':
      return `<span class="${baseClass} text-fragmented" data-transform-type="fragment">${selector}</span>`;
    case 'metaComment':
      return `<span class="${baseClass} text-commented" data-transform-type="metaComment">${selector}</span>`;
    default:
      return selector;
  }
};

// Process a single transformation
const applyTransformation = (content: string, transformation: TextTransformation): string => {
  const { type, selector, replacement, emphasis } = transformation;
  
  if (!selector) return content;
  
  try {
    const html = createTransformationHtml(type, selector, { replacement, emphasis });
    return content.replace(new RegExp(selector, 'g'), html);
  } catch (error) {
    console.error(`[SimpleTextRenderer] Error applying transformation ${type}:`, error);
    return content;
  }
};

// Main text processor without WebGL dependencies
const processTextTransformations = (
  content: string,
  transformations: TextTransformation[]
): string => {
  if (!content || !transformations.length) return content;
  
  const sortedTransformations = sortTransformationsByPriority(transformations);
  return sortedTransformations.reduce(applyTransformation, content);
};

// Debug information component
interface DebugInfoProps {
  node: {
    id: string;
    currentContent: string | null;
    journeyContext?: {
      lastVisitedCharacter?: string;
    };
  };
  appliedTransformations: TextTransformation[];
  renderCount: number;
  readingPath: { sequence: unknown[] };
  isVisible: boolean;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ node, appliedTransformations, renderCount, readingPath, isVisible }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="simple-renderer-debug">
      <div className="debug-info">
        <span>Node: {node.id}</span>
        <span>Transformations: {appliedTransformations.length}</span>
        <span>Renders: {renderCount}</span>
        <span>Path Length: {readingPath.sequence.length}</span>
        <span>Visibility: {isVisible ? 'Visible' : 'Hidden'}</span>
        <span>Journey Context: {node.journeyContext ? 'Active' : 'None'}</span>
        {node.journeyContext && (
          <>
            <span>Last Character: {node.journeyContext.lastVisitedCharacter || 'None'}</span>
            <span>Character Bleed: {
              appliedTransformations.some(t => 
                t.type === 'fragment' || t.type === 'emphasize' && t.intensity && t.intensity > 3
              ) ? 'Yes' : 'No'
            }</span>
          </>
        )}
      </div>
    </div>
  );
};

// Loading component
const LoadingState: React.FC = () => (
  <div className="simple-renderer-loading" style={{ padding: '20px 0' }}>
    <div className="loading-spinner"></div>
    <p>Preparing narrative content...</p>
  </div>
);

// Content component
interface ContentProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
  processedContent: string;
  appliedTransformations: TextTransformation[];
}

const Content: React.FC<ContentProps> = ({ contentRef, processedContent, appliedTransformations }) => (
  <div
    ref={contentRef}
    className="simple-renderer-content"
    data-transformations-count={appliedTransformations.length}
    style={{
      display: 'block',
      visibility: 'visible',
      opacity: 1
    }}
  >
    <div
      dangerouslySetInnerHTML={{ __html: processedContent }}
      className="content-inner"
    />
  </div>
);

// Main renderer component
const SimpleTextRenderer: React.FC<SimpleTextRendererProps> = memo(({
  nodeId,
  onRenderComplete,
  onVisibilityChange
}) => {
  const {
    node,
    transformedContent: originalTransformedContent,
    appliedTransformations
  } = useNodeState(nodeId);
  
  const [processedContent, setProcessedContent] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [renderCount, setRenderCount] = useState(0);
  
  const contentRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const callbacksCalledRef = useRef(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  
  const readingPath = useSelector((state: RootState) => state.reader.path);

  useEffect(() => {
    callbacksCalledRef.current = false;
  }, [node?.id]);

  useEffect(() => {
    if (!node?.currentContent) return;

    setIsLoading(true);
    const content = originalTransformedContent || node.currentContent;

    try {
      const processed = processTextTransformations(content, appliedTransformations);
      setProcessedContent(processed);
      setRenderCount(prev => prev + 1);
      setIsLoading(false);
      setIsVisible(true);

      if (!callbacksCalledRef.current) {
        callbacksCalledRef.current = true;
        onRenderComplete?.();
        onVisibilityChange?.(true);
      }
    } catch (error) {
      console.error(`[SimpleTextRenderer] Error processing content:`, error);
      setIsLoading(false);
    }
  }, [node?.currentContent, node?.id, originalTransformedContent, appliedTransformations, onRenderComplete, onVisibilityChange]);

  useEffect(() => {
    const currentContentRef = contentRef.current;
    const observer = observerRef.current;
    if (!currentContentRef) return;

    if (!isVisible) {
      setIsVisible(true);
      if (onVisibilityChange && !callbacksCalledRef.current) {
        onVisibilityChange(true);
      }
    }

    return () => {
      observer?.disconnect();
    };
  }, [node?.id, isVisible, onVisibilityChange]);

  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (!currentContentRef) return;

    const handleMutation = (mutations: MutationRecord[]) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          const target = mutation.target;
          const computedStyle = window.getComputedStyle(target);

          if (computedStyle.display === 'none' ||
              computedStyle.visibility === 'hidden' ||
              parseFloat(computedStyle.opacity) === 0) {

            target.style.display = target.style.display === 'none' ? 'block' : target.style.display;
            target.style.visibility = target.style.visibility === 'hidden' ? 'visible' : target.style.visibility;
            target.style.opacity = parseFloat(target.style.opacity) === 0 ? '1' : target.style.opacity;

            if (target === currentContentRef && onVisibilityChange && !callbacksCalledRef.current) {
              onVisibilityChange(true);
            }
          }
        }
      });
    };

    const handleMutationWithDebounce = (mutations: MutationRecord[]) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => handleMutation(mutations), 100);
    };

    mutationObserverRef.current = new MutationObserver(handleMutationWithDebounce);

    mutationObserverRef.current.observe(currentContentRef, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: false,
      subtree: false,
    });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      mutationObserverRef.current?.disconnect();
    };
  }, [node?.id, onVisibilityChange]);

  if (!node || !node.currentContent) {
    return <div className="simple-renderer-loading">Loading narrative content...</div>;
  }

  return (
    <div
      className={`simple-renderer-container ${isVisible ? 'is-visible' : ''}`}
      data-node-id={node.id}
      data-render-count={renderCount}
      style={{
        display: 'block',
        visibility: 'visible',
        position: 'relative',
        minHeight: '200px'
      }}
    >
      <SimpleTransformationContainer
        transformations={appliedTransformations}
        nodeId={node.id}
      >
        {isLoading && <LoadingState />}
        <Content 
          contentRef={contentRef}
          processedContent={processedContent}
          appliedTransformations={appliedTransformations}
        />
      </SimpleTransformationContainer>
      
      <DebugInfo 
        node={node}
        appliedTransformations={appliedTransformations}
        renderCount={renderCount}
        readingPath={readingPath}
        isVisible={isVisible}
      />
    </div>
  );
});

export default SimpleTextRenderer;
