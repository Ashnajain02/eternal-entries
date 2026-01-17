
import React, { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskList } from './extensions/TaskList';
import { TaskItem } from './extensions/TaskItem';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, ImagePlus, List, ListOrdered, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Write your thoughts...",
  className
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-2',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'my-1',
          },
        },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-full my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] text-foreground',
      },
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to upload images.",
          variant: "destructive"
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('journal-images')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Use signed URL for private bucket access
      const { data: signedData, error: signedError } = await supabase.storage
        .from('journal-images')
        .createSignedUrl(data.path, 31536000); // 1 year expiry for journal images

      if (signedError) {
        throw signedError;
      }

      if (editor && signedData) {
        editor.chain().focus().setImage({ src: signedData.signedUrl }).run();
      }

      toast({
        title: "Image uploaded",
        description: "Your image has been added to the entry."
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }
  }, [editor, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input
    e.target.value = '';
  }, [handleImageUpload]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 pb-3 border-b border-border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('bold') && "bg-accent"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('italic') && "bg-accent"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('underline') && "bg-accent"
          )}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('bulletList') && "bg-accent"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('orderedList') && "bg-accent"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.toggleTaskList()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('taskList') && "bg-accent"
          )}
          title="Todo List"
        >
          <ListTodo className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 p-0"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap {
          outline: none;
        }
        .tiptap p {
          margin: 0.5em 0;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
        }
        .tiptap ul:not(.task-list) {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .tiptap li:not(.task-item) {
          margin: 0.25rem 0;
        }
        .tiptap li p {
          margin: 0;
        }
        .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
          margin: 0.5rem 0;
        }
        .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 0.25rem 0;
        }
        .tiptap ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
          cursor: pointer;
          width: 1rem;
          height: 1rem;
          accent-color: hsl(var(--primary));
        }
        .tiptap ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .tiptap ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
