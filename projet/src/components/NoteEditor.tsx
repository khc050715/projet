// src/components/NoteEditor.tsx
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
import "@/app/mdx-editor.css";

interface EditorProps {
  markdown: string;
  editorRef?: ForwardedRef<MDXEditorMethods> | null;
  onChange?: (markdown: string) => void;
  readOnly?: boolean; // 읽기 전용 모드 추가
}

export default function NoteEditor({ markdown, editorRef, onChange, readOnly = false }: EditorProps) {
  return (
    <div className={`w-full prose prose-invert max-w-none ${readOnly ? 'pointer-events-none' : ''}`}>
      <MDXEditor
        ref={editorRef}
        markdown={markdown}
        onChange={readOnly ? undefined : onChange}
        readOnly={readOnly} // 플러그인 레벨 지원
        className={`mdx-editor outline-none ${readOnly ? 'read-only' : ''}`}
        placeholder={readOnly ? "" : "실존을 기록하십시오..."}
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