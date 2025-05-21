
import React from 'react';
import AIPrompt from './AIPrompt';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';

interface ReflectionSectionProps {
  aiPrompt: string | null;
  aiResponse: string | null;
  isGeneratingPrompt: boolean;
  onGeneratePrompt: () => void;
  onRegeneratePrompt?: () => void;
  onResponseChange: (response: string) => void;
  onSaveResponse: () => void;
  onCancelResponse: () => void;
  onDeleteResponse: () => void;
  onDismissPrompt?: () => void;
  isPreview?: boolean;
}

const ReflectionSection: React.FC<ReflectionSectionProps> = ({
  aiPrompt,
  aiResponse,
  isGeneratingPrompt,
  onGeneratePrompt,
  onRegeneratePrompt,
  onResponseChange,
  onSaveResponse,
  onCancelResponse,
  onDeleteResponse,
  onDismissPrompt,
  isPreview = false
}) => {
  if (aiPrompt) {
    return (
      <div className="mb-6">
        <AIPrompt
          prompt={aiPrompt}
          response={aiResponse}
          onResponseChange={onResponseChange}
          onSaveResponse={onSaveResponse}
          onCancelResponse={onCancelResponse}
          onDeleteResponse={onDeleteResponse}
          onRegeneratePrompt={!isPreview ? onRegeneratePrompt : undefined}
          onDismissPrompt={!isPreview && !aiResponse ? onDismissPrompt : undefined}
          isReadOnly={isPreview}
        />
      </div>
    );
  }
  
  if (!isPreview) {
    return (
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onGeneratePrompt}
          disabled={isGeneratingPrompt}
          className="flex items-center gap-2"
        >
          {isGeneratingPrompt ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating a reflection question...</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              <span>Add a reflection question</span>
            </>
          )}
        </Button>
      </div>
    );
  }
  
  return null;
};

export default ReflectionSection;
