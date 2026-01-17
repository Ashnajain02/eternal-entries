import { Node, mergeAttributes } from '@tiptap/core';

export interface TaskItemOptions {
  HTMLAttributes: Record<string, any>;
  nested: boolean;
}

export const TaskItem = Node.create<TaskItemOptions>({
  name: 'taskItem',

  addOptions() {
    return {
      HTMLAttributes: {},
      nested: false,
    };
  },

  content() {
    return this.options.nested ? 'paragraph block*' : 'paragraph+';
  },

  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) => element.getAttribute('data-checked') === 'true',
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `li[data-type="${this.name}"]`,
        priority: 51,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': this.name,
        'data-checked': node.attrs.checked,
      }),
      [
        'label',
        { contenteditable: 'false' },
        [
          'input',
          {
            type: 'checkbox',
            checked: node.attrs.checked ? 'checked' : null,
          },
        ],
      ],
      ['div', 0],
    ];
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };

    if (this.options.nested) {
      shortcuts['Tab'] = () => this.editor.commands.sinkListItem(this.name);
    }

    return shortcuts;
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li');
      const checkboxWrapper = document.createElement('label');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      checkboxWrapper.contentEditable = 'false';
      checkbox.type = 'checkbox';
      checkbox.checked = node.attrs.checked;

      // Function to update visual state
      const updateVisualState = (isChecked: boolean) => {
        listItem.setAttribute('data-checked', isChecked.toString());
        checkbox.checked = isChecked;
        
        // Apply strikethrough and dim styling directly
        if (isChecked) {
          content.style.textDecoration = 'line-through';
          content.style.color = 'hsl(var(--muted-foreground))';
        } else {
          content.style.textDecoration = 'none';
          content.style.color = '';
        }
      };

      // Initial state
      updateVisualState(node.attrs.checked);

      checkbox.addEventListener('change', (event) => {
        if (typeof getPos !== 'function') return;

        const isChecked = (event.target as HTMLInputElement).checked;
        
        // Update visual state immediately
        updateVisualState(isChecked);

        // Update TipTap document state
        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .command(({ tr }) => {
            const pos = getPos();
            const currentNode = tr.doc.nodeAt(pos);

            if (currentNode) {
              tr.setNodeMarkup(pos, undefined, {
                ...currentNode.attrs,
                checked: isChecked,
              });
            }

            return true;
          })
          .run();
      });

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value as string);
      });

      listItem.setAttribute('data-type', this.name);

      checkboxWrapper.append(checkbox);
      listItem.append(checkboxWrapper, content);

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          updateVisualState(updatedNode.attrs.checked);

          return true;
        },
      };
    };
  },
});

export default TaskItem;
