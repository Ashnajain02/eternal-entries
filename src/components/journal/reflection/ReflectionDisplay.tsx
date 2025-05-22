
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface ReflectionDisplayProps {
  answer: string;
  onEdit: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

const ReflectionDisplay: React.FC<ReflectionDisplayProps> = ({
  answer,
  onEdit,
  onDelete,
  isLoading
}) => {
  return (
    <>
      <div className="text-left whitespace-pre-wrap mb-2">{answer}</div>
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          size="icon"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onDelete} 
          disabled={isLoading}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default ReflectionDisplay;
