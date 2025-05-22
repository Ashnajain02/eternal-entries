
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import BlurredContent from '../BlurredContent';

interface ReflectionDisplayProps {
  answer: string;
  onEdit: () => void;
  onDelete: () => void;
  isLoading: boolean;
  isBlurred?: boolean;
}

const ReflectionDisplay: React.FC<ReflectionDisplayProps> = ({
  answer,
  onEdit,
  onDelete,
  isLoading,
  isBlurred = false
}) => {
  return (
    <>
      <BlurredContent 
        content={answer} 
        isBlurred={isBlurred} 
        className="mb-2"
      />
      <div className="flex justify-end space-x-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDelete} 
          disabled={isLoading}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default ReflectionDisplay;
