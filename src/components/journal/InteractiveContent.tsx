import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveContentProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  className?: string;
  isReadOnly?: boolean;
}

/**
 * Renders journal content with interactive checkboxes that persist state
 */
const InteractiveContent: React.FC<InteractiveContentProps> = ({
  content,
  onContentChange,
  className,
  isReadOnly = false
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Handle checkbox clicks within the content
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicked on a checkbox input within a task item
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      e.preventDefault();
      e.stopPropagation();
      
      if (isReadOnly || !onContentChange || isUpdatingRef.current) return;
      
      isUpdatingRef.current = true;
      
      const checkbox = target as HTMLInputElement;
      const listItem = checkbox.closest('li[data-type="taskItem"]');
      
      if (listItem) {
        // Toggle the checked state
        const wasChecked = listItem.getAttribute('data-checked') === 'true';
        const newChecked = !wasChecked;
        
        // Update the DOM immediately for visual feedback
        listItem.setAttribute('data-checked', String(newChecked));
        checkbox.checked = newChecked;
        
        // Get the updated HTML content
        if (contentRef.current) {
          const updatedContent = contentRef.current.innerHTML;
          onContentChange(updatedContent);
        }
      }
      
      // Reset the updating flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [onContentChange, isReadOnly]);

  // Attach event listener
  useEffect(() => {
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('click', handleClick);
      return () => {
        contentEl.removeEventListener('click', handleClick);
      };
    }
  }, [handleClick]);

  // Sync checkboxes with data-checked attributes whenever content changes externally
  useEffect(() => {
    if (!contentRef.current) return;
    
    const taskItems = contentRef.current.querySelectorAll('li[data-type="taskItem"]');
    taskItems.forEach((item) => {
      const isChecked = item.getAttribute('data-checked') === 'true';
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    });
  }, [content]);

  return (
    <div
      ref={contentRef}
      className={cn(
        "prose prose-sm max-w-none text-foreground interactive-content",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default InteractiveContent;
