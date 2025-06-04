
import React from 'react';
import { Mood } from '@/types';
import MoodSelector from '@/components/MoodSelector';
import AutoResizeTextarea from '@/components/AutoResizeTextarea';

interface ContentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  selectedMood: Mood;
  onMoodChange: (mood: Mood) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onContentChange,
  selectedMood,
  onMoodChange
}) => {
  return (
    <>
      <div className="mb-6">
        <MoodSelector selectedMood={selectedMood} onChange={onMoodChange} />
      </div>
      
      <div className="mb-6">
        <AutoResizeTextarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write your thoughts here..."
          className="journal-input"
          minHeight="200px"
        />
      </div>
    </>
  );
};

export default ContentEditor;
