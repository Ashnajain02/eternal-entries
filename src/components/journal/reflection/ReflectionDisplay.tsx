
import React from 'react';
import { Button } from '@/components/ui/button';

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
      <div className="text-left whitespace-pre-wrap">{answer}</div>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button 
          variant="destructive" 
          onClick={onDelete} 
          disabled={isLoading}
        >
          Delete Response
        </Button>
      </div>
    </>
  );
};

export default ReflectionDisplay;
