"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, deleteDoc } from "firebase/firestore"; // deleteDoc 추가
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, PenLine, Loader2, Calendar, Trash2 } from "lucide-react"; // Trash2 추가
import Link from "next/link";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@mdxeditor/editor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

function ViewContent() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [data, setData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false); // 삭제 로딩 상태
  const editorRef = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u || !id) return router.push("/");
      const snap = await getDoc(doc(db, "records", id));
      if (snap.exists()) {
        const d = snap.data();
        setData({ id: snap.id, ...d });
        editorRef.current?.setMarkdown(d.content);
      } else router.push("/");
    });
    return () => unsub();
  }, [id, router]);

  useEffect(() => {
    if (data && editorRef.current) {
      editorRef.current.setMarkdown(data.content);
    }
  }, [data]);

  // ★ 삭제 핸들러 (View 페이지로 이동됨)
  const handleDelete = async () => {
    if (!confirm("정말로 이 기록을 영구 삭제하시겠습니까? (복구할 수 없습니다)")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "records", id!));
      router.push("/"); // 삭제 후 목록으로
    } catch (e) {
      console.error(e);
      alert("삭제 실패");
      setIsDeleting(false);
    }
  };

  if (!data) return <div className="h-screen flex items-center justify-center text-gray-600"><Loader2 className="animate-spin"/></div>;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center">
        <Link href="/" className="text-gray-500 hover:text-white flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4"/> List
        </Link>
        
        {/* 버튼 그룹 */}
        <div className="flex items-center gap-3">
          {/* 삭제 버튼 */}
          <button 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>} 
            Delete
          </button>

          {/* 수정 버튼 (Link) */}
          <Link 
            href={`/edit?id=${data.id}`} 
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-900/10 rounded-lg text-sm font-medium transition-colors"
          >
            <PenLine className="w-4 h-4"/> Edit
          </Link>
        </div>
      </nav>

      <header className="flex flex-col gap-4 border-b border-gray-800 pb-6 mt-4">
        <h1 className="text-3xl font-bold text-white leading-tight">{data.title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {data.created_at?.toDate().toLocaleDateString()}</span>
          {data.updated_at?.seconds !== data.created_at?.seconds && <span className="text-yellow-700 bg-yellow-900/10 px-2 rounded border border-yellow-900/30">Revised</span>}
        </div>
      </header>

      <article className="flex-1 mt-2">
        <NoteEditor ref={editorRef} markdown={data.content} readOnly={true} />
      </article>
    </main>
  );
}

export default function ViewPage() {
  return <Suspense fallback={<div/>}><ViewContent /></Suspense>;
}