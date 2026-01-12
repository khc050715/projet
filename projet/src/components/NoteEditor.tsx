// components/NoteEditor.tsx
"use client";

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods
} from "@mdxeditor/editor";
import { ForwardedRef } from "react";
import "@/app/mdx-editor.css"; // 방금 만든 CSS 임포트

interface EditorProps {
  markdown: string;
  editorRef?: ForwardedRef<MDXEditorMethods> | null;
  onChange?: (markdown: string) => void;
}

// Next.js에서 동적 로딩을 위해 컴포넌트로 분리
export default function NoteEditor({ markdown, editorRef, onChange }: EditorProps) {
  return (
    <div className="w-full prose prose-invert max-w-none">
      <MDXEditor
        ref={editorRef}
        markdown={markdown}
        onChange={onChange}
        className="mdx-editor outline-none"
        placeholder="어떤 실존을 기록하시겠습니까..."
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin()
        ]}
      />
    </div>
  );
}