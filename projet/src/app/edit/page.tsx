"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { ArrowLeft, Save, Loader2, History, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@/components/NoteEditor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

function EditForm() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { user } = useAuth(true);
  
  const editorRef = useRef<MDXEditorMethods>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [original, setOriginal] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetchDoc = async () => {
      const docRef = doc(db, "records", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setTitle(d.title);
        setContent(d.content);
        setTags(d.tags || []);
        setOriginal(d);
        editorRef.current?.setMarkdown(d.content);
        const revSnap = await getDocs(query(collection(docRef, "revisions"), orderBy("archived_at", "desc")));
        setRevisions(revSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    };
    fetchDoc();
  }, [user, id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
      setTagInput("");
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleUpdate = async () => {
    if (!title || !content) return;
    setIsSaving(true);
    if (original) await addDoc(collection(doc(db, "records", id!), "revisions"), { 
      snapshot_title: original.title, snapshot_content: original.content, snapshot_tags: original.tags, archived_at: serverTimestamp(), archived_by: user!.uid 
    });
    await updateDoc(doc(db, "records", id!), { title, content, tags, updated_at: serverTimestamp(), last_modified_by: user!.uid });
    router.push(`/view?id=${id}`);
  };

  const handleRestore = (rev: any) => {
    if (confirm("Restore this version?")) { 
      setTitle(rev.snapshot_title); setContent(rev.snapshot_content); setTags(rev.snapshot_tags || []); 
      editorRef.current?.setMarkdown(rev.snapshot_content); window.scrollTo(0, 0); 
    }
  };

  if (!original) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500"/></div>;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center">
        <Link href={`/view?id=${id}`} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4"/> Cancel
        </Link>
        <button onClick={handleUpdate} disabled={isSaving} className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-900/20">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Update
        </button>
      </nav>

      <section className="flex flex-col gap-6 mt-4">
        <input type="text" className="w-full bg-transparent text-3xl font-bold text-white placeholder-zinc-700 border-none outline-none p-0" value={title} onChange={e => setTitle(e.target.value)}/>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-sm font-medium">
              {tag} <button onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-3 h-3"/></button>
            </span>
          ))}
          {/* ★ 표준 클래스 적용: min-w-[100px] -> min-w-24 */}
          <input type="text" placeholder="Add notes..." className="bg-transparent text-zinc-400 placeholder-zinc-700 outline-none min-w-24" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleKeyDown}/>
        </div>
        <div className="min-h-100 border border-zinc-800 rounded-xl p-1 bg-[#0a0a0a]">
          <NoteEditor ref={editorRef} markdown={content} onChange={setContent} />
        </div>
      </section>

      <section className="border-t border-zinc-800 pt-8 flex flex-col gap-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4"/> Revision History
        </h2>
        <div className="flex flex-col gap-3">
          {revisions.map(rev => (
            <div key={rev.id} className="flex justify-between items-center p-4 rounded-lg bg-[#111] border border-zinc-800 hover:border-zinc-700 transition-all group">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs text-zinc-500 font-mono">{rev.archived_at?.toDate().toLocaleString()}</span>
                <span className="text-sm text-zinc-300 truncate font-medium">{rev.snapshot_title}</span>
              </div>
              <button onClick={() => handleRestore(rev)} className="opacity-0 group-hover:opacity-100 text-xs bg-zinc-800 text-amber-500 px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-all flex items-center gap-1">
                <RotateCcw className="w-3 h-3"/> Restore
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function EditPage() { return <Suspense fallback={<div/>}><EditForm /></Suspense>; }