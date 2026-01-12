"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth, formatDate, RecordType } from "@/lib/hooks";
import { Lock, Plus, ArrowRight, Maximize2, Loader2, X, Search } from "lucide-react"; // Search 아이콘 추가
import dynamic from "next/dynamic";
import { MDXEditorMethods } from "@/components/NoteEditor";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { 
  ssr: false, 
  loading: () => <div className="h-20 flex items-center text-zinc-600">Editor Loading...</div> 
});

export default function Home() {
  const { user, loading } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  
  const [records, setRecords] = useState<RecordType[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordType[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // 필터 상태
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // ★ 검색어 상태 추가

  const editorRef = useRef<MDXEditorMethods>(null);
  
  const MY_EMAIL = "host@email.com"; 

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordType));
      setRecords(docs);
      
      const tagSet = new Set<string>();
      docs.forEach(doc => doc.tags?.forEach(tag => tagSet.add(tag)));
      setAllTags(Array.from(tagSet).sort());
    });
  }, [user]);

  // ★ 통합 필터링 로직 (태그 + 검색어)
  useEffect(() => {
    let result = records;

    // 1. 태그 필터
    if (selectedTag) {
      result = result.filter(r => r.tags?.includes(selectedTag));
    }

    // 2. 검색어 필터 (제목 or 내용 or 태그)
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(lowerQuery) || 
        r.content.toLowerCase().includes(lowerQuery) ||
        r.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      );
    }

    setFilteredRecords(result);
  }, [selectedTag, searchTerm, records]);

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

  const handleQuickSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid, title: title || "Untitled Knot", content, tags,
        created_at: serverTimestamp(), updated_at: serverTimestamp(), status: 'active'
      });
      setTitle(""); setContent(""); setTags([]); editorRef.current?.setMarkdown(""); 
    } catch { alert("저장 실패"); } finally { setIsSaving(false); }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, MY_EMAIL, password); } catch { alert("Error"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin"/></div>;

  if (!user) return (
    <main className="h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="w-full max-w-xs space-y-8 text-center animate-in fade-in duration-700">
        <div className="inline-flex p-5 rounded-full bg-zinc-900 border border-zinc-800 shadow-xl"><Lock className="text-zinc-400 w-6 h-6"/></div>
        <h1 className="text-xl font-medium text-zinc-200 tracking-wider">PROJET IDENTITY</h1>
        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <input type="password" required className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center text-white focus:border-zinc-600 focus:bg-zinc-900 transition-all placeholder-zinc-700" placeholder="Passcode" value={password} onChange={e=>setPassword(e.target.value)}/>
          <button className="w-full bg-white text-black font-bold p-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5">Unlock System</button>
        </form>
      </div>
    </main>
  );

  return (
    <main className="projet-container animate-in slide-in-from-bottom-4 duration-500">
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
        <div className="card flex flex-col gap-4 bg-zinc-900/50">
          <input type="text" placeholder="Title..." className="bg-transparent text-lg font-bold text-white placeholder-zinc-700 border-none outline-none p-0" value={title} onChange={(e) => setTitle(e.target.value)}/>
          
          <div className="flex flex-wrap items-center gap-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">
                {tag} <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3"/></button>
              </span>
            ))}
            <input type="text" placeholder={tags.length === 0 ? "Add tags..." : ""} className="bg-transparent text-sm text-zinc-400 placeholder-zinc-700 outline-none min-w-20" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleKeyDown}/>
          </div>

          <div className="min-h-20 -ml-4">
            <NoteEditor ref={editorRef} markdown={content} onChange={setContent} />
          </div>
          <div className="flex justify-end pt-2 border-t border-zinc-800/50">
            <button onClick={handleQuickSave} disabled={isSaving} className="bg-zinc-100 text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white hover:scale-105 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-white/5">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Record
            </button>
          </div>
        </div>
      </section>

      {/* ★ Search & Filters */}
      <section className="flex flex-col gap-4">
        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/>
          <input 
            type="text" 
            placeholder="Search existence..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:bg-zinc-900/80 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 태그 목록 */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Notes</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!selectedTag ? 'bg-zinc-200 text-black' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedTag === tag ? 'bg-amber-600 border-amber-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
              >
                # {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* List */}
      <section className="flex flex-col gap-3 flex-1">
        {filteredRecords.map(rec => (
          <Link href={`/view?id=${rec.id}`} key={rec.id} className="block group">
            <article className="card hover:bg-zinc-800/50 flex justify-between items-center group-hover:border-zinc-700">
              <div className="flex flex-col gap-1.5 overflow-hidden">
                <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">
                  {/* 검색어 하이라이팅 처리 (선택사항) */}
                  {rec.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                  <span>{formatDate(rec.created_at)}</span>
                  {rec.tags && rec.tags.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {rec.tags.slice(0, 3).map(tag => <span key={tag} className="text-zinc-600">#{tag}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0"/>
            </article>
          </Link>
        ))}
        {filteredRecords.length === 0 && (
          <div className="text-center text-zinc-700 py-12 text-sm font-mono flex flex-col items-center gap-2">
            <Search className="w-6 h-6 opacity-20"/>
            <span>No matching existence found.</span>
          </div>
        )}
      </section>
    </main>
  );
}