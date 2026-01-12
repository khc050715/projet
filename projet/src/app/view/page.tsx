"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  doc, getDoc, updateDoc, collection, addDoc, 
  serverTimestamp, query, orderBy, getDocs, Timestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Save, Loader2, History, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

interface RevisionType {
  id: string;
  snapshot_title: string;
  snapshot_content: string;
  archived_at: Timestamp;
}

function EditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalData, setOriginalData] = useState<any>(null);
  
  const [revisions, setRevisions] = useState<RevisionType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);

      if (!id) return;

      try {
        const docRef = doc(db, "records", id);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setContent(data.content || "");
          setOriginalData(data);

          const revQuery = query(
            collection(docRef, "revisions"), 
            orderBy("archived_at", "desc")
          );
          const revSnap = await getDocs(revQuery);
          setRevisions(revSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RevisionType)));
        } else {
          alert("기록을 찾을 수 없습니다.");
          router.push("/");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, [id, router]);

  const handleRestore = (rev: RevisionType) => {
    if (confirm(`[${formatDate(rev.archived_at)}] 버전으로 내용을 되돌리시겠습니까?`)) {
      setTitle(rev.snapshot_title);
      setContent(rev.snapshot_content);
      // 스크롤을 맨 위로 올려 변경된 내용 확인
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUpdate = async () => {
    if (!title.trim() || !content.trim() || !id || !user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, "records", id);

      if (originalData) {
        await addDoc(collection(docRef, "revisions"), {
          snapshot_title: originalData.title,
          snapshot_content: originalData.content,
          archived_at: serverTimestamp(),
          archived_by: user.uid,
          revision_note: "User Edit"
        });
      }

      await updateDoc(docRef, {
        title: title,
        content: content,
        updated_at: serverTimestamp(),
        last_modified_by: user.uid,
      });

      router.push(`/view?id=${id}`);
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
      setIsSaving(false);
    }
  };

  const formatDate = (ts: Timestamp) => {
    if (!ts) return "";
    return new Date(ts.toDate()).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500"><Loader2 className="animate-spin"/></div>;

  return (
    <main className="min-h-screen bg-black text-gray-200 p-6 md:p-12 border-x border-gray-900/50 max-w-5xl mx-auto flex flex-col gap-16">
      
      {/* 1. 상단: 에디터 영역 (전체 너비 사용) */}
      <section className="space-y-8">
        <nav className="flex justify-between items-center">
          <Link href={`/view?id=${id}`} className="text-gray-500 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4"/> Cancel
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-yellow-600 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-900/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Original will be archived
            </span>
            <button 
              onClick={handleUpdate} 
              disabled={isSaving} 
              className="bg-yellow-600 text-white px-6 py-2 rounded font-bold hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-yellow-900/20 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Update Revision
            </button>
          </div>
        </nav>

        <div className="space-y-6">
          <input
            type="text"
            className="w-full bg-transparent text-4xl md:text-5xl font-bold text-white placeholder-gray-800 border-b border-gray-800 pb-4 focus:border-yellow-600 focus:outline-none transition-colors"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="min-h-[60vh] border border-gray-800 rounded-lg bg-[#0a0a0a] focus-within:ring-1 focus-within:ring-yellow-900/50 transition-all p-1">
            <NoteEditor markdown={content} onChange={setContent} />
          </div>
        </div>
      </section>

      {/* 2. 하단: 리비전 히스토리 (넓은 공간 활용) */}
      <aside className="border-t border-gray-800 pt-10">
        <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-widest text-xs mb-6 pl-1">
          <History className="w-4 h-4"/>
          Revision History
        </div>

        {revisions.length === 0 ? (
          <div className="text-gray-700 text-sm italic pl-1">아직 수정 이력이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisions.map((rev) => (
              <div key={rev.id} className="group p-5 rounded-lg bg-[#111] border border-gray-800 hover:border-gray-600 hover:bg-[#161616] transition-all flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3"/> {formatDate(rev.archived_at)}
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-gray-300 truncate mb-1">{rev.snapshot_title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{rev.snapshot_content}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-800/50 flex justify-end">
                  <button 
                    onClick={() => handleRestore(rev)}
                    className="text-xs bg-gray-800 hover:bg-yellow-900 text-gray-400 hover:text-yellow-500 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3"/> Restore this version
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

    </main>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading editor...</div>}>
      <EditForm />
    </Suspense>
  );
}