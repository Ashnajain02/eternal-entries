
import React from 'react';
import { Button } from '@/components/ui/button';

interface EditorControlsProps {
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const EditorControls: React.FC<EditorControlsProps> = ({
  isSaving,
  onSave,
  onCancel
}) => {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Entry"}
      </Button>
    </div>
  );
};

export default EditorControls;
