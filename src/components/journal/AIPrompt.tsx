
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash, X, RefreshCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AIPromptProps {
  prompt: string | null;
  response: string | null;
  onResponseChange: (response: string) => void;
  isReadOnly?: boolean;
  onSaveResponse?: () => void;
  onCancelResponse?: () => void;
  onDeleteResponse?: () => void;
  onRegeneratePrompt?: () => void;
  onDismissPrompt?: () => void;
}

const AIPrompt: React.FC<AIPromptProps> = ({ 
  prompt, 
  response, 
  onResponseChange,
  isReadOnly = false,
  onSaveResponse,
  onCancelResponse,
  onDeleteResponse,
  onRegeneratePrompt,
  onDismissPrompt
}) => {
  const [localResponse, setLocalResponse] = useState(response || '');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  };
  
  const handleDeleteRequest = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (onDeleteResponse) {
      onDeleteResponse();
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="border rounded-md p-4 bg-secondary/50 mt-4">
      <div className="flex items-start gap-3">
        <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">Reflection Moment</h4>
            <div className="flex items-center gap-1">
              {!isReadOnly && onRegeneratePrompt && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRegeneratePrompt}
                  className="h-7 px-2 flex items-center gap-1"
                >
                  <RefreshCcw className="h-3 w-3" />
                  <span className="text-xs">New question</span>
                </Button>
              )}
              
              {!isReadOnly && onDismissPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismissPrompt}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-sm mb-3">{prompt}</p>
          
          {!isReadOnly && (
            <>
              {!response ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write your thoughts here..."
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
              ) : (
                <div className="mt-2 border-t pt-2">
                  <div className="flex justify-between items-start">
                    <p className="text-sm italic">{response}</p>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleDeleteRequest}
                      className="h-7 w-7 ml-2 mt-0.5 text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
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
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your reflection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your response to this reflection prompt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIPrompt;
