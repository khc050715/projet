"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

export default function WritePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => !u ? router.push("/") : setUser(u));
    return () => unsub();
  }, [router]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    await addDoc(collection(db, "records"), { uid: user.uid, title, content, created_at: serverTimestamp(), updated_at: serverTimestamp(), status: "active" });
    router.push("/");
  };

  if (!user) return null;

  return (
    <main className="projet-container">
      <nav className="flex justify-between items-center">
        <Link href="/" className="text-gray-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4"/> Back
        </Link>
        <button onClick={handleSave} disabled={isSaving} className="bg-white text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Record
        </button>
      </nav>

      <div className="flex flex-col gap-6 flex-1 mt-4">
        <input type="text" placeholder="Title..." autoFocus className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-700 border-none outline-none p-0" value={title} onChange={e => setTitle(e.target.value)}/>
        <div className="flex-1 border-t border-gray-800 pt-6">
          <NoteEditor markdown={content} onChange={setContent} />
        </div>
      </div>
    </main>
  );
}