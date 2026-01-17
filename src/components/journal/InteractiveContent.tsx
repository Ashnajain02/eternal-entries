import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveContentProps {
  content: string;
  onContentChange: (newContent: string) => void;
  className?: string;
}

/**
 * Renders journal entry HTML content with interactive checkboxes for task items.
 * When a checkbox is toggled, the HTML is updated and onContentChange is called.
 */
const InteractiveContent: React.FC<InteractiveContentProps> = ({
  content,
  onContentChange,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
    const doc = parser.parseFromString(content, 'text/html');
    
    // Find all task items and ensure checkboxes match data-checked state
    const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
    taskItems.forEach((li) => {
      const isChecked = li.getAttribute('data-checked') === 'true';
      const checkbox = li.querySelector('input[type="checkbox"]');
      
      if (checkbox) {
        (checkbox as HTMLInputElement).checked = isChecked;
        // Remove disabled attribute if present
        checkbox.removeAttribute('disabled');
      } else {
        // If no checkbox exists, create one (for backward compatibility)
        const label = doc.createElement('label');
        label.contentEditable = 'false';
        const input = doc.createElement('input');
        input.type = 'checkbox';
        input.checked = isChecked;
        label.appendChild(input);
        li.insertBefore(label, li.firstChild);
      }
    });

    return doc.body.innerHTML;
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={cn("prose prose-sm max-w-none text-foreground interactive-content", className)}
      dangerouslySetInnerHTML={{ __html: processedContent() }}
    />
  );
};

export default InteractiveContent;
