
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, X } from 'lucide-react';

interface ReflectionQuestionProps {
  question: string;
  isEditing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

const ReflectionQuestion: React.FC<ReflectionQuestionProps> = ({
  question,
  isEditing,
  isLoading,
  onRefresh,
  onClose
}) => {
  return (
    <div className={`flex justify-between items-start p-2 rounded-md ${!isEditing ? 'bg-muted/60' : ''}`}>
      <div className="flex-1 font-medium text-left">
        {question}
      </div>
      <div className="flex space-x-2 ml-2">
        {isEditing && (
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onRefresh} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ReflectionQuestion;
