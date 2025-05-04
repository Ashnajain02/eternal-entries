
import React, { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: string;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  className,
  minHeight = '200px',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to allow proper calculation when text is deleted
    textarea.style.height = minHeight;
    
    // Set the height to match the content
    textarea.style.height = `${Math.max(textarea.scrollHeight, parseInt(minHeight))}px`;
  };

  // Adjust height on mount and when value changes
  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e);
        // Height will be adjusted in the useEffect
      }}
      className={cn("transition-height duration-100 overflow-hidden", className)}
      style={{ minHeight }}
      {...props}
    />
  );
};

export default AutoResizeTextarea;
