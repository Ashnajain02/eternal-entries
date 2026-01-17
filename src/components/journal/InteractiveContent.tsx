import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveContentProps {
  content: string;
  onContentChange: (newContent: string) => void;
  className?: string;
}

/**
 * Renders journal entry HTML content with interactive checkboxes for task items.
 * When a checkbox is toggled, the HTML is updated and onContentChange is called.
 * Users can only check/uncheck existing todos - not add or remove them.
 */
const InteractiveContent: React.FC<InteractiveContentProps> = ({
  content,
  onContentChange,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState(content);

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleCheckboxChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.type !== 'checkbox') return;

    const container = containerRef.current;
    if (!container) return;

    // Find the parent task item (li with data-type="taskItem")
    const taskItem = target.closest('li[data-type="taskItem"]');
    if (!taskItem) return;

    // Update the data-checked attribute
    const isChecked = target.checked;
    taskItem.setAttribute('data-checked', String(isChecked));

    // Get the updated HTML
    const newContent = container.innerHTML;
    
    // Update local state immediately for responsive UI
    setLocalContent(newContent);
    
    // Persist the change
    onContentChange(newContent);
  }, [onContentChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Attach event listeners to all checkboxes
    container.addEventListener('change', handleCheckboxChange);

    return () => {
      container.removeEventListener('change', handleCheckboxChange);
    };
  }, [handleCheckboxChange]);

  // Process HTML to ensure checkboxes are interactive and reflect data-checked state
  const processedContent = useCallback(() => {
    // Parse the HTML and make checkboxes interactive
    const parser = new DOMParser();
    const doc = parser.parseFromString(localContent, 'text/html');
    
    // Find all task items and ensure checkboxes match data-checked state
    const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
    taskItems.forEach((li) => {
      const isChecked = li.getAttribute('data-checked') === 'true';
      
      // Look for existing checkbox (could be inside a label or direct child)
      let checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      let label = li.querySelector('label');
      
      if (checkbox) {
        // Checkbox exists - update its state using the attribute (not just property)
        // The 'checked' attribute controls the initial state in HTML
        if (isChecked) {
          checkbox.setAttribute('checked', 'checked');
        } else {
          checkbox.removeAttribute('checked');
        }
        checkbox.removeAttribute('disabled');
      } else if (!label) {
        // No checkbox and no label - create one (backward compatibility only)
        label = doc.createElement('label');
        label.contentEditable = 'false';
        const input = doc.createElement('input');
        input.type = 'checkbox';
        if (isChecked) {
          input.setAttribute('checked', 'checked');
        }
        label.appendChild(input);
        li.insertBefore(label, li.firstChild);
      }
      
      // Apply visual styling for checked state to the content div
      const contentDiv = li.querySelector(':scope > div');
      if (contentDiv) {
        if (isChecked) {
          (contentDiv as HTMLElement).style.textDecoration = 'line-through';
          (contentDiv as HTMLElement).style.color = 'hsl(var(--muted-foreground))';
        } else {
          (contentDiv as HTMLElement).style.textDecoration = 'none';
          (contentDiv as HTMLElement).style.color = '';
        }
      }
    });

    return doc.body.innerHTML;
  }, [localContent]);

  return (
    <div
      ref={containerRef}
      className={cn("prose prose-sm max-w-none text-foreground interactive-content", className)}
      dangerouslySetInnerHTML={{ __html: processedContent() }}
    />
  );
};

export default InteractiveContent;
