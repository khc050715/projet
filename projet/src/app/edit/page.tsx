// src/app/edit/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Save, Loader2, History, AlertTriangle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// 에디터 로딩
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

function EditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // URL에서 ?id=... 값을 가져옴

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalData, setOriginalData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. 초기 데이터 로드
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/");
        return;
      }
      setUser(u);

      if (!id) {
        alert("잘못된 접근입니다.");
        router.push("/");
        return;
      }

      // 문서 가져오기
      try {
        const docRef = doc(db, "records", id);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setContent(data.content || "");
          setOriginalData(data); // 수정 전 원본 데이터를 상태에 보존
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

  // 2. 수정 및 리비전 저장 (핵심 로직)
  const handleUpdate = async () => {
    if (!title.trim() || !content.trim() || !id || !user) return;
    
    // 변경 사항이 없으면 알림
    if (originalData.content === content && originalData.title === title) {
      alert("변경 사항이 없습니다.");
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, "records", id);

      // A. [Revision] 과거의 실존을 백업 (revisions 서브 컬렉션)
      if (originalData) {
        await addDoc(collection(docRef, "revisions"), {
          // 과거 데이터 스냅샷
          snapshot_title: originalData.title,
          snapshot_content: originalData.content,
          snapshot_created_at: originalData.created_at, // 원본 생성일
          
          // 리비전 메타데이터
          archived_at: serverTimestamp(),
          archived_by: user.uid,
          revision_note: "User Edit"
        });
      }

      // B. [Update] 현재의 실존을 갱신
      await updateDoc(docRef, {
        title: title,
        content: content,
        updated_at: serverTimestamp(),
        last_modified_by: user.uid,
        revision_count: (originalData.revision_count || 0) + 1 // 수정 횟수 증가
      });

      // 완료 후 홈으로
      router.push("/");

    } catch (e) {
      console.error("Revision failed:", e);
      alert("저장 중 오류가 발생했습니다.");
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-gray-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-gray-200 p-6 md:p-12 max-w-4xl mx-auto border-x border-gray-900">
      {/* 네비게이션 */}
      <nav className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4"/> Cancel
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-yellow-900/20 border border-yellow-800/50 text-yellow-600 text-xs font-mono">
            <History className="w-3 h-3"/>
            <span>Revision Mode</span>
          </div>
        </div>

        <button 
          onClick={handleUpdate} 
          disabled={isSaving} 
          className="bg-yellow-600 text-white px-6 py-2 rounded font-bold hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(202,138,4,0.3)]"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          {isSaving ? "Archiving..." : "Update Revision"}
        </button>
      </nav>

      {/* 수정 영역 */}
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">Title of Existence</label>
          <input
            type="text"
            className="w-full bg-transparent text-4xl font-bold text-white placeholder-gray-800 border-b border-gray-800 pb-4 focus:border-yellow-600 focus:outline-none transition-colors"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-widest">
            <span>Content Logic</span>
            <span className="text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Original will be archived</span>
          </label>
          <div className="min-h-[60vh] border border-gray-800 rounded-lg bg-[#0a0a0a] p-1 focus-within:ring-1 focus-within:ring-yellow-900 transition-all">
            <NoteEditor markdown={content} onChange={setContent} />
          </div>
        </div>
      </div>
    </main>
  );
}

// Suspense 감싸기 (useSearchParams 사용 시 필수)
export default function EditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading editor...</div>}>
      <EditForm />
    </Suspense>
  );
}