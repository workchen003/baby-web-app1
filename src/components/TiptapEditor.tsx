'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './Tiptap.css';

interface TiptapEditorProps {
  initialContent?: string;
  onContentChange: (content: string) => void;
}

const TiptapEditor = ({ initialContent = '', onContentChange }: TiptapEditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
    ],
    content: initialContent || '<p>在這裡開始撰寫您的文章內容...</p>',
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
        },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  return (
    <div>
      {/* 工具列未來可加在此處 */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;