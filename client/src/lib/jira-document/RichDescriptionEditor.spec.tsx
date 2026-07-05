import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RichDescriptionEditor } from './RichDescriptionEditor';
import { blocksToAdf } from './adf-utils';

jest.mock('@tiptap/react', () => {
  const mockChain = {
    focus: jest.fn().mockReturnThis(),
    toggleBold: jest.fn().mockReturnThis(),
    toggleItalic: jest.fn().mockReturnThis(),
    toggleUnderline: jest.fn().mockReturnThis(),
    toggleBulletList: jest.fn().mockReturnThis(),
    toggleOrderedList: jest.fn().mockReturnThis(),
    setHeading: jest.fn().mockReturnThis(),
    setParagraph: jest.fn().mockReturnThis(),
    run: jest.fn(),
  };

  return {
    EditorContent: ({ className }: { className?: string }) => (
      <div className={className} data-testid="editor-content" />
    ),
    useEditor: jest.fn(() => ({
      chain: () => mockChain,
      isActive: jest.fn(() => false),
      getJSON: jest.fn(() => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Updated text' }],
          },
        ],
      })),
      commands: {
        setContent: jest.fn(),
      },
      setEditable: jest.fn(),
    })),
  };
});

describe('RichDescriptionEditor', () => {
  const sampleDocument = blocksToAdf([
    { type: 'paragraph', text: 'Initial description' },
  ]);

  it('should render toolbar and action buttons', () => {
    render(
      <RichDescriptionEditor
        document={sampleDocument}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Text style')).toBeInTheDocument();
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline')).toBeInTheDocument();
    expect(screen.getByLabelText('Lists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onSave with serialized ADF document', () => {
    const onSave = jest.fn();

    render(
      <RichDescriptionEditor
        document={sampleDocument}
        onSave={onSave}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'doc',
        version: 1,
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'paragraph',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text', text: 'Updated text' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('should call onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();

    render(
      <RichDescriptionEditor
        document={sampleDocument}
        onSave={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
