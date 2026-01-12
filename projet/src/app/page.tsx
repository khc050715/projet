// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, User, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Lock, Save, Loader2, PenLine, Maximize2 } from "lucide-react";
import dynamic from "next/dynamic";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), {
  ssr: false,
  loading: () => <div className="text-gray-600">Loading...</div>
});

// 데이터 타입 정의
interface RecordType {
  id: string;
  title: string;   // 제목 추가
  content: string;
  created_at: Timestamp | null;
  uid: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 입력 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // 리스트 상태
  const [records, setRecords] = useState<RecordType[]>([]);
  
  const MY_EMAIL = "your-email@example.com"; // 본인 이메일 입력

  // 인증 및 데이터 로드
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecordType)));
    });
    return () => unsubscribeData();
  }, [user]);

  // 잠금 해제
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, MY_EMAIL, password);
    } catch (err) {
      setAuthError("코드가 일치하지 않습니다.");
      setLoading(false);
    }
  };

  // 빠른 저장
  const handleQuickSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid,
        title: title || "Untitled Knot", // 제목이 없으면 기본값
        content: content,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: 'active'
      });
      setTitle("");
      setContent("");
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  // 날짜 포맷
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
      {/* 헤더 */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-widest text-gray-100">PROJET</h1>
        <button onClick={() => auth.signOut()} className="text-xs text-gray-500 hover:text-white">Lock</button>
      </header>

      {/* 빠른 작성 영역 */}
      <section className="mb-12 space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-gray-400 text-sm font-bold uppercase">Quick Log</h2>
          <Link href="/write" className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1">
            <Maximize2 className="w-3 h-3"/> Full Page Mode
          </Link>
        </div>
        
        <div className="bg-[#111] border border-gray-800 rounded-lg p-4 space-y-4">
          <input 
            type="text" 
            placeholder="Title of this Knot..." 
            className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 border-b border-gray-800 pb-2 focus:outline-none focus:border-gray-500 transition-colors"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="min-h-150px">
            <NoteEditor markdown={content} onChange={setContent} />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleQuickSave} disabled={isSaving} className="bg-white text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
              Save Knot
            </button>
          </div>
        </div>
      </section>

      {/* 리스트 영역 (MDX 렌더링) */}
      <section className="space-y-8">
        <h2 className="text-gray-400 text-sm font-bold uppercase pl-3 border-l-2 border-gray-700">History</h2>
        {records.map(rec => (
          <article key={rec.id} className="group relative bg-[#0a0a0a] border border-gray-800 rounded-lg p-6 hover:border-gray-600 transition-all">
            <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-200">{rec.title}</h3>
                <span className="text-xs text-gray-500 font-mono">{formatDate(rec.created_at)}</span>
              </div>
              <Link href={`/edit?id=${rec.id}`} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-yellow-500 transition-all p-2">
                <PenLine className="w-4 h-4"/>
              </Link>
            </div>
            {/* MDX Viewer Mode */}
            <div className="opacity-80">
              <NoteEditor markdown={rec.content} readOnly={true} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}