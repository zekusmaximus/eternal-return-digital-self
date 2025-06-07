declare module 'react-markdown' {
  import React from 'react';
  
  interface ReactMarkdownProps {
    children: string;
    remarkPlugins?: unknown[];
    components?: Record<string, React.ComponentType<unknown>>;
    className?: string;
    [key: string]: unknown;
  }
  
  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  
  export default ReactMarkdown;
}