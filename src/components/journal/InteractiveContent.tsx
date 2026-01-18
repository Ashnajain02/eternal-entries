
import React, { useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveContentProps {
  content: string;
  onContentChange?: (newContent: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Renders journal entry content with interactive checkboxes.
 * When a checkbox is toggled, it updates the content HTML and calls onContentChange.
 */
const InteractiveContent: React.FC<InteractiveContentProps> = ({
  content,
  onContentChange,
  className,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  // Handle checkbox changes
  const handleCheckboxChange = useCallback((e: Event) => {
    if (disabled || isSavingRef.current) return;
    
    const target = e.target as HTMLInputElement;
    if (target.type !== 'checkbox') return;
    
    // Prevent rapid-fire saves
    isSavingRef.current = true;
    
    // Find the parent li element
    const listItem = target.closest('li[data-type="taskItem"]');
    if (!listItem) {
      isSavingRef.current = false;
      return;
    }
    
    // Update the data-checked attribute
    const isChecked = target.checked;
    listItem.setAttribute('data-checked', isChecked.toString());
    
    // Get the updated HTML from the container
    if (containerRef.current && onContentChange) {
      const updatedContent = containerRef.current.innerHTML;
      onContentChange(updatedContent);
    }
    
    // Reset saving flag after a short delay
    setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  }, [onContentChange, disabled]);

  // Set up event listeners for checkbox changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use event delegation for checkbox changes
    container.addEventListener('change', handleCheckboxChange);

    return () => {
      container.removeEventListener('change', handleCheckboxChange);
    };
  }, [handleCheckboxChange]);

  // Update checkbox states when content changes externally
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Sync checkbox checked states with data-checked attributes
    const taskItems = containerRef.current.querySelectorAll('li[data-type="taskItem"]');
    taskItems.forEach((item) => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const isChecked = item.getAttribute('data-checked') === 'true';
      if (checkbox && (checkbox as HTMLInputElement).checked !== isChecked) {
        (checkbox as HTMLInputElement).checked = isChecked;
      }
    });
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "prose prose-sm max-w-none text-foreground interactive-content",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default InteractiveContent;
