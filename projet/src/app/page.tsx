"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth, formatDate, RecordType } from "@/lib/hooks"; // ★ 커스텀 훅 사용
import { Lock, Plus, ArrowRight, Maximize2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@/components/NoteEditor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { 
  ssr: false, 
  loading: () => <div className="h-20 flex items-center text-zinc-600">Editor Loading...</div> 
});

export default function Home() {
  // ★ 한 줄로 인증 처리 완료
  const { user, loading } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  
  // 타입 적용 (any 제거)
  const [records, setRecords] = useState<RecordType[]>([]);
  const editorRef = useRef<MDXEditorMethods>(null);
  
  const MY_EMAIL = "host@email.com"; 

  // 데이터 구독
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordType)));
    });
  }, [user]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, MY_EMAIL, password); } 
    catch { alert("코드가 올바르지 않습니다."); }
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
      
      // 초기화
      setTitle(""); 
      setContent("");
      editorRef.current?.setMarkdown(""); 
    } catch { alert("저장 실패"); } finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin"/></div>;

  if (!user) return (
    <main className="h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="w-full max-w-xs space-y-8 text-center animate-in fade-in duration-700">
        <div className="inline-flex p-5 rounded-full bg-zinc-900 border border-zinc-800 shadow-xl">
          <Lock className="text-zinc-400 w-6 h-6"/>
        </div>
        <h1 className="text-xl font-medium text-zinc-200 tracking-wider">PROJET IDENTITY</h1>
        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <input 
            type="password" 
            required 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-white focus:border-zinc-600 focus:bg-zinc-900 transition-all placeholder-zinc-700" 
            placeholder="Passcode" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
          />
          <button className="w-full bg-white text-black font-bold p-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5">
            Unlock System
          </button>
        </form>
      </div>
    </main>
  );

  return (
    <main className="projet-container animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
        <h1 className="text-sm font-bold tracking-[0.3em] text-zinc-100">PROJET</h1>
        <button onClick={() => auth.signOut()} className="text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-wider">Lock</button>
      </header>

      {/* Quick Log */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Quick Log</h2>
          <Link href="/write" className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors">
            <Maximize2 className="w-3 h-3"/> Expand
          </Link>
        </div>
        
        {/* Card Style 적용 */}
        <div className="card flex flex-col gap-4 bg-zinc-900/50">
          <input 
            type="text" 
            placeholder="Title of existence..." 
            className="bg-transparent text-lg font-bold text-white placeholder-zinc-700 border-none outline-none p-0" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="min-h-25 -ml-4">
            <NoteEditor ref={editorRef} markdown={content} onChange={setContent} />
          </div>
          <div className="flex justify-end pt-2 border-t border-zinc-800/50">
            <button 
              onClick={handleQuickSave} 
              disabled={isSaving} 
              className="bg-zinc-100 text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 transition-all shadow-lg shadow-white/5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} 
              Record
            </button>
          </div>
        </div>
      </section>

      {/* History List */}
      <section className="flex flex-col gap-3 flex-1">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">History</h2>
        <div className="flex flex-col gap-3">
          {records.map(rec => (
            <Link href={`/view?id=${rec.id}`} key={rec.id} className="block group">
              <article className="card hover:bg-zinc-800/50 flex justify-between items-center group-hover:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors">{rec.title}</h3>
                  <span className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                    {formatDate(rec.created_at)}
                    {rec.updated_at && rec.created_at?.seconds !== rec.updated_at?.seconds && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    )}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all"/>
              </article>
            </Link>
          ))}
        </div>
        {records.length === 0 && <div className="text-center text-zinc-700 py-12 text-sm font-mono">No existence recorded yet.</div>}
      </section>
    </main>
  );
}