import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitItemProps {
  id: string;
  name: string;
  isCompleted: boolean;
  onToggle: () => void;
  onUpdate: (name: string) => void;
  onDelete: () => void;
}

export const HabitItem: React.FC<HabitItemProps> = ({
  id,
  name,
  isCompleted,
  onToggle,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(editName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          autoFocus
        />
        <Button size="icon" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card border border-border transition-all duration-200",
        isCompleted && "bg-accent/30 border-accent"
      )}
    >
      <Checkbox
        id={id}
        checked={isCompleted}
        onCheckedChange={onToggle}
        className="h-5 w-5"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex-1 text-sm font-body cursor-pointer transition-all",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {name}
      </label>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
