"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { onAuthStateChanged, User, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Lock, Save, Loader2, Maximize2, ArrowRight, Plus } from "lucide-react";
import dynamic from "next/dynamic";
// NoteEditor와 MDXEditorMethods 타입 가져오기
import { MDXEditorMethods } from "@/components/NoteEditor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { 
  ssr: false, 
  loading: () => <div className="text-gray-600 h-20 flex items-center">Loading...</div> 
});

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 입력 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  
  // ★ 에디터 제어용 Ref 추가
  const editorRef = useRef<MDXEditorMethods>(null);

  const [records, setRecords] = useState<any[]>([]);
  const MY_EMAIL = "your-email@example.com"; 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, MY_EMAIL, password); } 
    catch { alert("Code mismatch"); }
  };

  const handleQuickSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid, 
        title: title || "Untitled Knot", 
        content, 
        created_at: serverTimestamp(), 
        updated_at: serverTimestamp(), 
        status: 'active'
      });
      
      // ★ 저장 성공 후 초기화 로직 강화
      setTitle(""); 
      setContent("");
      editorRef.current?.setMarkdown(""); // 에디터 내부 텍스트 강제 삭제

    } catch { alert("Error"); } finally { setIsSaving(false); }
  };

  const formatDate = (ts: Timestamp) => ts ? new Date(ts.toDate()).toLocaleDateString() : "";

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500"><Loader2 className="animate-spin"/></div>;
  if (!user) return (
    <main className="h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="inline-block p-4 rounded-full bg-gray-900 border border-gray-800"><Lock className="text-gray-400 w-6 h-6"/></div>
        <form onSubmit={handleUnlock} className="flex flex-col gap-3">
          <input type="password" required className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-center text-white focus:border-gray-500" placeholder="Identity Code" value={password} onChange={e=>setPassword(e.target.value)}/>
          <button className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-gray-200">Unlock</button>
        </form>
      </div>
    </main>
  );

  return (
    <main className="projet-container">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-gray-800 pb-4">
        <h1 className="text-lg font-bold tracking-[0.2em] text-gray-100">PROJET</h1>
        <button onClick={() => auth.signOut()} className="text-xs text-gray-500 hover:text-white transition-colors">LOCK</button>
      </header>

      {/* Quick Log */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quick Log</h2>
          <Link href="/write" className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-medium">
            <Maximize2 className="w-3 h-3"/> Full Mode
          </Link>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <input type="text" placeholder="Title..." className="bg-transparent text-lg font-bold text-white placeholder-gray-600 border-none outline-none p-0" value={title} onChange={(e) => setTitle(e.target.value)}/>
          <div className="min-h-30 -ml-4">
            {/* ★ Ref 연결 */}
            <NoteEditor ref={editorRef} markdown={content} onChange={setContent} />
          </div>
          <div className="flex justify-end border-t border-gray-800 pt-3 mt-2">
            <button onClick={handleQuickSave} disabled={isSaving} className="bg-white text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Record
            </button>
          </div>
        </div>
      </section>

      {/* History List */}
      <section className="flex flex-col gap-3 flex-1">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">History</h2>
        {records.map(rec => (
          <Link href={`/view?id=${rec.id}`} key={rec.id} className="block group">
            <article className="bg-transparent border border-gray-800 rounded-xl p-5 hover:bg-[#111] hover:border-gray-600 transition-all flex justify-between items-center group-hover:translate-x-1 duration-200">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-gray-200 group-hover:text-white transition-colors">{rec.title}</h3>
                <span className="text-xs text-gray-500 font-mono">{formatDate(rec.created_at)}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors"/>
            </article>
          </Link>
        ))}
        {records.length === 0 && <div className="text-center text-gray-600 py-10 text-sm">기록이 시작되지 않았습니다.</div>}
      </section>
    </main>
  );
}