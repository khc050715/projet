"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@/components/NoteEditor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false, loading: () => <div className="h-20 flex items-center text-zinc-600">Loading...</div> });

export default function WritePage() {
  const router = useRouter();
  const { user, loading } = useAuth(true);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user!.uid, title, content, tags,
        created_at: serverTimestamp(), updated_at: serverTimestamp(), status: "active"
      });
      router.push("/");
    } catch { alert("Error"); setIsSaving(false); }
  };

  if (loading) return null;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center mb-4">
        <Link href="/" className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4"/> Back
        </Link>
        <button onClick={handleSave} disabled={isSaving} className="bg-zinc-100 text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-white disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Record
        </button>
      </nav>

      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <input type="text" placeholder="Title..." autoFocus className="w-full bg-transparent text-4xl font-bold text-white placeholder-zinc-700 border-none outline-none p-0" value={title} onChange={e => setTitle(e.target.value)}/>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-sm font-medium animate-in zoom-in duration-200">
              {tag} <button onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-3 h-3"/></button>
            </span>
          ))}
          {/* ★ 표준 클래스 적용: min-w-[120px] -> min-w-32 */}
          <input type="text" placeholder={tags.length === 0 ? "Add notes... (Enter)" : ""} className="bg-transparent text-zinc-400 placeholder-zinc-700 outline-none min-w-32" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleKeyDown}/>
        </div>
        <div className="flex-1 border-t border-zinc-800 pt-6">
          <NoteEditor markdown={content} onChange={setContent} />
        </div>
      </div>
    </main>
  );
}