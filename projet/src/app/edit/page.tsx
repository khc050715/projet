"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  doc, getDoc, updateDoc, collection, addDoc, 
  serverTimestamp, query, orderBy, getDocs 
} from "firebase/firestore"; // deleteDoc 제거됨
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, Save, Loader2, History, RotateCcw } from "lucide-react"; // Trash2 제거됨
import Link from "next/link";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@mdxeditor/editor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

function EditForm() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [user, setUser] = useState<any>(null);
  
  const editorRef = useRef<MDXEditorMethods>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u || !id) return router.push("/");
      setUser(u);
      
      const docRef = doc(db, "records", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setTitle(d.title);
        setContent(d.content);
        setOriginal(d);
        editorRef.current?.setMarkdown(d.content);

        const revSnap = await getDocs(query(collection(docRef, "revisions"), orderBy("archived_at", "desc")));
        setRevisions(revSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });
    return () => unsub();
  }, [id, router]);

  const handleUpdate = async () => {
    if (!title || !content) return;
    setIsSaving(true);
    if (original) await addDoc(collection(doc(db, "records", id!), "revisions"), { 
      snapshot_title: original.title, 
      snapshot_content: original.content, 
      archived_at: serverTimestamp(), 
      archived_by: user.uid 
    });
    await updateDoc(doc(db, "records", id!), { 
      title, 
      content, 
      updated_at: serverTimestamp(), 
      last_modified_by: user.uid 
    });
    router.push(`/view?id=${id}`);
  };

  const handleRestore = (rev: any) => {
    if (confirm("이 버전으로 내용을 되돌리시겠습니까?")) { 
      setTitle(rev.snapshot_title); 
      setContent(rev.snapshot_content); 
      editorRef.current?.setMarkdown(rev.snapshot_content);
      window.scrollTo(0, 0); 
    }
  };

  if (!original) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-600"/></div>;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center">
        <Link href={`/view?id=${id}`} className="text-gray-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4"/> Cancel
        </Link>
        
        {/* 업데이트 버튼만 남김 */}
        <button 
          onClick={handleUpdate} 
          disabled={isSaving} 
          className="bg-yellow-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-yellow-900/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
          Update
        </button>
      </nav>

      <section className="flex flex-col gap-6 mt-4">
        <input 
          type="text" 
          className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-700 border-none outline-none p-0" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
        />
        <div className="min-h-100 border border-gray-800 rounded-xl p-1 bg-[#0a0a0a]">
          <NoteEditor 
            ref={editorRef} 
            markdown={content} 
            onChange={setContent} 
          />
        </div>
      </section>

      <section className="border-t border-gray-800 pt-8 flex flex-col gap-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4"/> Revision History
        </h2>
        {revisions.length === 0 ? <p className="text-gray-700 text-sm italic">No revisions yet.</p> : 
          <div className="flex flex-col gap-3">
            {revisions.map(rev => (
              <div key={rev.id} className="flex justify-between items-center p-4 rounded-lg bg-[#111] border border-gray-800 hover:border-gray-600 transition-all group">
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span className="text-xs text-gray-500 font-mono">{rev.archived_at?.toDate().toLocaleString()}</span>
                  <span className="text-sm text-gray-300 truncate font-medium">{rev.snapshot_title}</span>
                </div>
                <button 
                  onClick={() => handleRestore(rev)} 
                  className="opacity-0 group-hover:opacity-100 text-xs bg-gray-800 text-yellow-500 px-3 py-1.5 rounded-md hover:bg-yellow-900/30 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3"/> Restore
                </button>
              </div>
            ))}
          </div>
        }
      </section>
    </main>
  );
}

export default function EditPage() { 
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-gray-600"/></div>}>
      <EditForm />
    </Suspense>
  ); 
}