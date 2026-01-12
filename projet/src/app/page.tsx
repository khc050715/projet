"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChanged, User, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Lock, Save, Loader2, Maximize2, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), {
  ssr: false,
  loading: () => <div className="text-gray-600">Loading...</div>
});

interface RecordType {
  id: string;
  title: string;
  content: string;
  created_at: Timestamp | null;
  uid: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [records, setRecords] = useState<RecordType[]>([]);
  
  const MY_EMAIL = "your-email@example.com"; // 본인 이메일 필수

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordType)));
    });
    return () => unsub();
  }, [user]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, MY_EMAIL, password);
    } catch {
      setAuthError("코드가 일치하지 않습니다.");
      setLoading(false);
    }
  };

  const handleQuickSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid,
        title: title || "Untitled Knot",
        content: content,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: 'active'
      });
      setTitle(""); setContent("");
    } catch { alert("Error"); } finally { setIsSaving(false); }
  };

  const formatDate = (ts: Timestamp | null) => ts ? new Date(ts.toDate()).toLocaleDateString() : "";

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500"><Loader2 className="animate-spin"/></div>;

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-gray-900 p-4 ring-1 ring-gray-800"><Lock className="text-gray-400"/></div>
          <h1 className="text-2xl font-semibold text-gray-200">Projet: Identity Check</h1>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input type="password" required className="w-full bg-gray-900 border-0 rounded p-3 text-white ring-1 ring-gray-800 focus:ring-gray-600" placeholder="Code" value={password} onChange={e=>setPassword(e.target.value)}/>
            {authError && <div className="text-red-500 text-xs">{authError}</div>}
            <button className="w-full bg-white text-black font-bold p-3 rounded hover:bg-gray-200">Unlock</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 pb-24">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-widest text-gray-100">PROJET</h1>
        <button onClick={() => auth.signOut()} className="text-xs text-gray-500 hover:text-white">Lock</button>
      </header>

      {/* Quick Log */}
      <section className="mb-12 space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-gray-400 text-sm font-bold uppercase">Quick Log</h2>
          <Link href="/write" className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1">
            <Maximize2 className="w-3 h-3"/> Full Page
          </Link>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-lg p-4 space-y-4">
          <input type="text" placeholder="Title..." className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 border-b border-gray-800 pb-2 focus:outline-none focus:border-gray-500 transition-colors" value={title} onChange={(e) => setTitle(e.target.value)}/>
          <div className="min-h-25">
            <NoteEditor markdown={content} onChange={setContent} />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleQuickSave} disabled={isSaving} className="bg-white text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>} Save
            </button>
          </div>
        </div>
      </section>

      {/* History List (Clean View) */}
      <section className="space-y-4">
        <h2 className="text-gray-400 text-sm font-bold uppercase pl-3 border-l-2 border-gray-700">History</h2>
        {records.length === 0 && <div className="text-center text-gray-600 py-10">No records yet.</div>}
        {records.map(rec => (
          <Link href={`/view?id=${rec.id}`} key={rec.id} className="block group">
            <article className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-5 hover:border-gray-500 hover:bg-[#111] transition-all flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">{rec.title}</h3>
                <span className="text-xs text-gray-500 font-mono">{formatDate(rec.created_at)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors"/>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}