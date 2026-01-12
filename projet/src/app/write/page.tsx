// src/app/write/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth"; // User 타입 import 추가
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// MDX 에디터 동적 로딩 (SSR 방지)
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { 
  ssr: false,
  loading: () => <div className="text-gray-500 p-4">Editor Loading...</div>
});

export default function WritePage() {
  const router = useRouter();
  
  // 상태 관리
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 인증 체크
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/"); // 비로그인 시 홈으로 리다이렉트
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [router]);

  // 저장 핸들러
  const handleSave = async () => {
    // 제목이나 내용이 없으면 저장하지 않음
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    
    if (!user) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid,
        title: title,       // 제목 분리 저장
        content: content,   // MDX 내용 저장
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: "active"
      });
      
      // 저장 성공 시 홈으로 이동
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
      setIsSaving(false);
    }
  };

  // 인증 로딩 중이거나 유저가 없으면 빈 화면(또는 로더)
  if (!user) return null;

  return (
    <main className="min-h-screen bg-black text-gray-200 p-6 md:p-12 max-w-4xl mx-auto border-x border-gray-900/50">
      {/* 네비게이션 */}
      <nav className="flex justify-between items-center mb-10">
        <Link href="/" className="text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4"/> Back to Log
        </Link>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          Record Knot
        </button>
      </nav>

      {/* 작성 영역 */}
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* 제목 입력 */}
        <input
          type="text"
          placeholder="Title of Existence..."
          autoFocus
          className="w-full bg-transparent text-4xl font-bold text-white placeholder-gray-800 border-none outline-none"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        
        {/* 에디터 영역 */}
        <div className="min-h-[60vh] border-t border-gray-800 pt-6">
          <NoteEditor markdown={content} onChange={setContent} />
        </div>
      </div>
    </main>
  );
}