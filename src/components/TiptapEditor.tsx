// src/components/TiptapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './Tiptap.css';

// 1. 定義 props 型別，接收一個回呼函式
interface TiptapEditorProps {
  onContentChange: (content: string) => void;
}

const TiptapEditor = ({ onContentChange }: TiptapEditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
    ],
    content: '<p>在這裡開始撰寫您的文章內容...</p>',
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
        },
    },
    // 2. 當編輯器內容更新時，觸發 onUpdate
    onUpdate: ({ editor }) => {
      // 呼叫傳入的 onContentChange 函式，並傳遞 HTML 內容
      onContentChange(editor.getHTML());
    },
  });

  return (
    <div>
      {/* 未來可以在這裡加上工具列按鈕 */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;