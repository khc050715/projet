"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, PenLine, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@mdxeditor/editor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

function ViewContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [data, setData] = useState<any>(null);
  const editorRef = useRef<MDXEditorMethods>(null); // Ref 생성

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u || !id) return router.push("/");
      const snap = await getDoc(doc(db, "records", id));
      if (snap.exists()) {
        const d = snap.data();
        setData({ id: snap.id, ...d });
        // 데이터 로드 후 에디터 업데이트
        editorRef.current?.setMarkdown(d.content);
      } else router.push("/");
    });
    return () => unsub();
  }, [id, router]);

  // data 상태가 바뀌거나 컴포넌트가 마운트된 후에도 시도 (안전장치)
  useEffect(() => {
    if (data && editorRef.current) {
      editorRef.current.setMarkdown(data.content);
    }
  }, [data]);

  if (!data) return <div className="h-screen flex items-center justify-center text-gray-600"><Loader2 className="animate-spin"/></div>;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center">
        <Link href="/" className="text-gray-500 hover:text-white flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4"/> List
        </Link>
        <Link href={`/edit?id=${data.id}`} className="text-gray-500 hover:text-yellow-500 flex items-center gap-2 text-sm font-medium transition-colors">
          <PenLine className="w-4 h-4"/> Edit
        </Link>
      </nav>

      <header className="flex flex-col gap-4 border-b border-gray-800 pb-6 mt-4">
        <h1 className="text-3xl font-bold text-white leading-tight">{data.title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {data.created_at?.toDate().toLocaleDateString()}</span>
          {data.updated_at?.seconds !== data.created_at?.seconds && <span className="text-yellow-700 bg-yellow-900/10 px-2 rounded border border-yellow-900/30">Revised</span>}
        </div>
      </header>

      <article className="flex-1 mt-2">
        {/* Ref 연결 */}
        <NoteEditor ref={editorRef} markdown={data.content} readOnly={true} />
      </article>
    </main>
  );
}

export default function ViewPage() {
  return <Suspense fallback={<div/>}><ViewContent /></Suspense>;
}