"use client";

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods, // 이 타입이 중요함
  MDXEditorProps
} from "@mdxeditor/editor";
import { forwardRef } from "react";
import "@/app/mdx-editor.css";

// 외부에서 쓸 수 있게 export
export type { MDXEditorMethods };

interface EditorProps extends MDXEditorProps {
  markdown: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
}

const NoteEditor = forwardRef<MDXEditorMethods, EditorProps>(({ markdown, onChange, readOnly = false, ...props }, ref) => {
  return (
    <div className={`w-full prose prose-invert max-w-none ${readOnly ? 'pointer-events-none' : ''}`}>
      <MDXEditor
        ref={ref}
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
        {...props}
      />
    </div>
  );
});

NoteEditor.displayName = "NoteEditor";

export default NoteEditor;