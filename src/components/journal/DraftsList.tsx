import React from 'react';
import { JournalEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { FileText, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

interface DraftsListProps {
  drafts: JournalEntry[];
  onEditDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  isLoading: boolean;
}

const DraftsList: React.FC<DraftsListProps> = ({
  drafts,
  onEditDraft,
  onDeleteDraft,
  isLoading
}) => {
  if (isLoading) {
    return null;
  }

  if (drafts.length === 0) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    onDeleteDraft(draftId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Drafts ({drafts.length})
      </h3>
      <div className="space-y-2">
        {drafts.map((draft) => {
          const textContent = draft.content?.replace(/<[^>]*>/g, '').trim() || '';
          const preview = textContent.substring(0, 80) || 'Empty draft';
          const timeAgo = draft.updatedAt 
            ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })
            : formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true });

          return (
            <div
              key={draft.id}
              className="group flex items-center justify-between p-3 bg-accent/30 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => onEditDraft(draft.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {preview.length > 80 ? `${preview}...` : preview}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(draft.date), 'MMM d')} · {timeAgo}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDraft(draft.id);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => handleDelete(e, draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DraftsList;
