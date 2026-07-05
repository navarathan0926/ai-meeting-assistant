'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  adfToEditorState,
  AdfEditorState,
  editorStateToAdf,
} from './adf-editor-serializer';
import {
  BulletListIcon,
  ChevronDownIcon,
  EditorToolbarDropdown,
  EditorToolbarMenuItem,
  NumberedListIcon,
} from './EditorToolbarDropdown';
import { isListActive, toggleListOnSelectedBlocks } from './list-toolbar';
import {
  applyBlockTextStyle,
  BlockTextStyle,
  toggleMarkOnSelection,
} from './text-format-toolbar';
import { JiraAdfDocument } from './types';
import { JiraDocumentRenderer } from './JiraDocumentRenderer';

interface RichDescriptionEditorProps {
  document: JiraAdfDocument;
  disabled?: boolean;
  onSave: (document: JiraAdfDocument) => void;
  onCancel: () => void;
}

type TextStyle = BlockTextStyle;

const TEXT_STYLE_LABELS: Record<TextStyle, string> = {
  paragraph: 'Normal Text',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
};

function detectTextStyle(editor: ReturnType<typeof useEditor>): TextStyle {
  if (!editor) {
    return 'paragraph';
  }
  if (editor.isActive('heading', { level: 1 })) {
    return 'heading1';
  }
  if (editor.isActive('heading', { level: 2 })) {
    return 'heading2';
  }
  if (editor.isActive('heading', { level: 3 })) {
    return 'heading3';
  }
  return 'paragraph';
}

function toolbarButtonClass(isActive: boolean): string {
  return [
    'rich-description-editor__toolbar-btn',
    isActive ? 'rich-description-editor__toolbar-btn--active' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function RichDescriptionEditor({
  document,
  disabled = false,
  onSave,
  onCancel,
}: RichDescriptionEditorProps) {
  const initialState = adfToEditorState(document);
  const editorStateRef = useRef<AdfEditorState>(initialState);
  const loadedDocumentRef = useRef(JSON.stringify(document));
  const [textStyle, setTextStyle] = useState<TextStyle>('paragraph');
  const [, setEditorRevision] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({
        placeholder: 'Add a description…',
      }),
    ],
    content: {
      type: 'doc',
      content: initialState.content,
    },
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: () => setEditorRevision((value) => value + 1),
    onSelectionUpdate: ({ editor: currentEditor }) => {
      setTextStyle(detectTextStyle(currentEditor));
      setEditorRevision((value) => value + 1);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const serialized = JSON.stringify(document);
    if (serialized === loadedDocumentRef.current) {
      return;
    }
    loadedDocumentRef.current = serialized;
    const nextState = adfToEditorState(document);
    editorStateRef.current = nextState;
    editor.commands.setContent({ type: 'doc', content: nextState.content });
    setTextStyle(detectTextStyle(editor));
  }, [document, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleTextStyleChange = (style: TextStyle) => {
    if (!editor) {
      return;
    }
    applyBlockTextStyle(editor, style);
    setTextStyle(style);
    setEditorRevision((value) => value + 1);
  };

  const handleListChange = (listType: 'bulletList' | 'orderedList') => {
    if (!editor) {
      return;
    }
    toggleListOnSelectedBlocks(editor, listType);
    setEditorRevision((value) => value + 1);
  };

  const handleSave = () => {
    if (!editor) {
      return;
    }
    const json = editor.getJSON();
    const nextDocument = editorStateToAdf({
      content: json.content ?? [],
      preservedTables: editorStateRef.current.preservedTables,
    });
    loadedDocumentRef.current = JSON.stringify(nextDocument);
    onSave(nextDocument);
  };

  const preservedTables = editorStateRef.current.preservedTables;
  const listActive = isListActive(editor);
  const bulletActive = editor?.isActive('bulletList') ?? false;
  const orderedActive = editor?.isActive('orderedList') ?? false;

  return (
    <div className="rich-description-editor">
      <div className="rich-description-editor__panel">
        <div className="rich-description-editor__toolbar">
          <EditorToolbarDropdown
            label="Text style"
            disabled={disabled || !editor}
            trigger={
              <>
                <span className="rich-description-editor__dropdown-label">
                  {TEXT_STYLE_LABELS[textStyle]}
                </span>
                <ChevronDownIcon />
              </>
            }
          >
            {(closeMenu) => (
              <>
                <EditorToolbarMenuItem
                  label="Normal Text"
                  active={textStyle === 'paragraph'}
                  closeMenu={closeMenu}
                  onSelect={() => handleTextStyleChange('paragraph')}
                />
                <EditorToolbarMenuItem
                  label="Heading 1"
                  active={textStyle === 'heading1'}
                  closeMenu={closeMenu}
                  onSelect={() => handleTextStyleChange('heading1')}
                />
                <EditorToolbarMenuItem
                  label="Heading 2"
                  active={textStyle === 'heading2'}
                  closeMenu={closeMenu}
                  onSelect={() => handleTextStyleChange('heading2')}
                />
                <EditorToolbarMenuItem
                  label="Heading 3"
                  active={textStyle === 'heading3'}
                  closeMenu={closeMenu}
                  onSelect={() => handleTextStyleChange('heading3')}
                />
              </>
            )}
          </EditorToolbarDropdown>

          <div className="rich-description-editor__toolbar-divider" />

          <button
            type="button"
            aria-label="Bold"
            className={toolbarButtonClass(editor?.isActive('bold') ?? false)}
            disabled={disabled || !editor}
            onClick={() => {
              if (editor) {
                toggleMarkOnSelection(editor, 'bold');
                setEditorRevision((value) => value + 1);
              }
            }}
          >
            B
          </button>
          <button
            type="button"
            aria-label="Italic"
            className={toolbarButtonClass(editor?.isActive('italic') ?? false)}
            disabled={disabled || !editor}
            onClick={() => {
              if (editor) {
                toggleMarkOnSelection(editor, 'italic');
                setEditorRevision((value) => value + 1);
              }
            }}
          >
            I
          </button>
          <button
            type="button"
            aria-label="Underline"
            className={toolbarButtonClass(editor?.isActive('underline') ?? false)}
            disabled={disabled || !editor}
            onClick={() => {
              if (editor) {
                toggleMarkOnSelection(editor, 'underline');
                setEditorRevision((value) => value + 1);
              }
            }}
          >
            U
          </button>

          <div className="rich-description-editor__toolbar-divider" />

          <EditorToolbarDropdown
            label="Lists"
            disabled={disabled || !editor}
            trigger={
              <>
                <span
                  className={[
                    'rich-description-editor__dropdown-icon',
                    listActive
                      ? 'rich-description-editor__dropdown-icon--active'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <BulletListIcon />
                </span>
                <ChevronDownIcon />
              </>
            }
          >
            {(closeMenu) => (
              <>
                <EditorToolbarMenuItem
                  label="Bullet list"
                  icon={<BulletListIcon />}
                  active={bulletActive}
                  closeMenu={closeMenu}
                  onSelect={() => handleListChange('bulletList')}
                />
                <EditorToolbarMenuItem
                  label="Numbered list"
                  icon={<NumberedListIcon />}
                  active={orderedActive}
                  closeMenu={closeMenu}
                  onSelect={() => handleListChange('orderedList')}
                />
              </>
            )}
          </EditorToolbarDropdown>
        </div>

        <EditorContent editor={editor} className="rich-description-editor__content" />

        {preservedTables.length > 0 && (
          <div className="rich-description-editor__readonly-tables">
            <p className="rich-description-editor__readonly-label">
              Tables (read-only)
            </p>
            {preservedTables.map((entry) => (
              <JiraDocumentRenderer
                key={entry.originalIndex}
                document={{
                  type: 'doc',
                  version: 1,
                  content: [entry.node],
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rich-description-editor__actions">
        <button
          type="button"
          className="rich-description-editor__cancel-btn"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rich-description-editor__save-btn"
          disabled={disabled || !editor}
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
