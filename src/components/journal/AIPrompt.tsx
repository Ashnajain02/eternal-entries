
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface AIPromptProps {
  prompt: string | null;
  response: string | null;
  onResponseChange: (response: string) => void;
  isReadOnly?: boolean;
  onSaveResponse?: () => void;
  onCancelResponse?: () => void;
}

const AIPrompt: React.FC<AIPromptProps> = ({ 
  prompt, 
  response, 
  onResponseChange,
  isReadOnly = false,
  onSaveResponse,
  onCancelResponse
}) => {
  const [isExpanded, setIsExpanded] = useState(!!response);
  const [localResponse, setLocalResponse] = useState(response || '');

  if (!prompt) return null;
  
  const handleSave = () => {
    onResponseChange(localResponse);
    if (onSaveResponse) {
      onSaveResponse();
    }
  };
  
  const handleCancel = () => {
    setLocalResponse(response || ''); // Reset to the original response
    if (onCancelResponse) {
      onCancelResponse();
    }
    setIsExpanded(false);
  };

  return (
    <div className="border rounded-md p-4 bg-secondary/50 mt-4">
      <div className="flex items-start gap-3">
        <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-2">Reflection Prompt</h4>
          <p className="text-sm mb-3">{prompt}</p>
          
          {!isReadOnly && (
            <>
              {!isExpanded ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsExpanded(true)}
                >
                  Respond to this prompt
                </Button>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write your response here..."
                    value={localResponse}
                    onChange={(e) => setLocalResponse(e.target.value)}
                    rows={3}
                    className="resize-none w-full"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSave}
                      disabled={!localResponse.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isReadOnly && response && (
            <div className="mt-2 border-t pt-2">
              <p className="text-sm italic">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPrompt;
