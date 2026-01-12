"use client";

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods // 이 타입이 중요합니다
} from "@mdxeditor/editor";
import { forwardRef } from "react";
import "@/app/mdx-editor.css";

interface EditorProps {
  markdown: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
}

// forwardRef를 사용하여 부모가 에디터의 메서드(setMarkdown 등)에 접근할 수 있게 합니다.
const NoteEditor = forwardRef<MDXEditorMethods, EditorProps>(({ markdown, onChange, readOnly = false }, ref) => {
  return (
    <div className={`w-full prose prose-invert max-w-none ${readOnly ? 'pointer-events-none' : ''}`}>
      <MDXEditor
        ref={ref} // 부모로부터 받은 ref를 여기에 연결
        markdown={markdown}
        onChange={readOnly ? undefined : onChange}
        readOnly={readOnly}
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
});

NoteEditor.displayName = "NoteEditor";

export default NoteEditor;