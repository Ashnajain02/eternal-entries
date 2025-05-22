
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ReflectionEditorProps {
  answer: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  answer,
  isLoading,
  onChange,
  onSave
}) => {
  return (
    <>
      <Textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your reflection..."
        className="min-h-[100px]"
        disabled={isLoading}
      />
      <div className="flex justify-end mt-2">
        <Button 
          onClick={onSave} 
          disabled={isLoading || !answer.trim()}
          size="sm"
        >
          Save
        </Button>
      </div>
    </>
  );
};

export default ReflectionEditor;
