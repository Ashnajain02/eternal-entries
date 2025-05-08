
import React, { useState } from 'react';
import { format } from 'date-fns';
import { JournalComment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Calendar, Clock } from 'lucide-react';

interface CommentSectionProps {
  comments: JournalComment[];
  onAddComment: (content: string) => void;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments = [],
  onAddComment,
  className,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
      setIsAddingComment(false);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <h4 className="font-medium">
          {comments.length > 0
            ? `Notes (${comments.length})`
            : 'Add a note'}
        </h4>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 bg-muted rounded-md border border-border"
            >
              <div className="text-sm mb-2">{comment.content}</div>
              <div className="flex items-center text-xs text-muted-foreground gap-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(comment.createdAt), 'h:mm a')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddingComment ? (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a note..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingComment(false);
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmitComment}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setIsAddingComment(true)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Add a note
        </Button>
      )}
    </div>
  );
};

export default CommentSection;
