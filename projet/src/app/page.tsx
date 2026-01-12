// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  deleteDoc, // 삭제 함수
  doc,       // 문서 특정 함수
  query,     // 쿼리 생성
  orderBy,   // 정렬
  onSnapshot, // 실시간 감시
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Lock, Save, Loader2, Trash2, Clock } from "lucide-react";
import dynamic from "next/dynamic";

// 에디터 동적 로딩
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), {
  ssr: false,
  loading: () => <div className="text-gray-600">Editor Loading...</div>
});

// 기록 데이터 타입 정의
interface RecordType {
  id: string;
  content: string;
  created_at: Timestamp | null;
  uid: string;
}

export default function Home() {
  // --- [상태 관리] ---
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  // ★ 기록 목록 상태 추가
  const [records, setRecords] = useState<RecordType[]>([]);

  // 본인 이메일 (수정 필수)
  const MY_EMAIL = "yours@email.com"; 

  // 1. 인증 및 데이터 리스너 연결
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // ★ 2. 기록 실시간 동기화 (로그인 된 상태에서만 동작)
  useEffect(() => {
    if (!user) {
      setRecords([]); // 로그아웃 시 기록 비움
      return;
    }

    // records 컬렉션을 '작성일 역순'으로 구독
    const q = query(collection(db, "records"), orderBy("created_at", "desc"));
    
    const unsubscribeDocs = onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecordType[];
      setRecords(fetchedRecords);
    });

    return () => unsubscribeDocs();
  }, [user]);

  // 3. 잠금 해제
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, MY_EMAIL, password);
    } catch (err) {
      setAuthError("코드가 일치하지 않습니다.");
      setLoading(false);
    }
  };

  // 4. 기록 저장
  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "records"), {
        uid: user.uid,
        content: content,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: 'active'
      });
      setSaveMessage("기록되었습니다.");
      setContent(""); // 저장 후 에디터 비우기
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error: ", error);
      setSaveMessage("저장 실패.");
    } finally {
      setIsSaving(false);
    }
  };

  // ★ 5. 기록 삭제 기능
  const handleDelete = async (id: string) => {
    if (!confirm("이 기록을 영원히 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "records", id));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // --- [날짜 포맷팅 함수] ---
  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.toDate()).toLocaleString('ko-KR', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- [렌더링] ---
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-gray-500"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-gray-900 p-4 ring-1 ring-gray-800">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-200">Projet: Identity Check</h1>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input type="password" required className="block w-full rounded-md border-0 bg-gray-900 py-3 px-4 text-gray-100 ring-1 ring-inset ring-gray-800 focus:ring-2 focus:ring-gray-600" placeholder="Identity Code" value={password} onChange={(e) => setPassword(e.target.value)} />
            {authError && <div className="text-xs text-red-500">{authError}</div>}
            <button type="submit" className="w-full rounded-md bg-white py-3 font-bold text-black hover:bg-gray-200">Unlock</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-3xl mx-auto p-6 pb-24">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold tracking-widest text-gray-100">PROJET</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-green-500/80 font-mono">● Connected</span>
          <button onClick={() => auth.signOut()} className="text-xs text-gray-500 hover:text-gray-300">Lock</button>
        </div>
      </header>

      {/* 입력 영역 */}
      <section className="mb-16 space-y-4">
        <div className="min-h-[200px] p-4 border border-gray-800 rounded-lg bg-[#111]">
          <NoteEditor markdown={content} onChange={setContent} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-green-500 font-mono pl-2">{saveMessage}</span>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-white text-black text-sm font-bold rounded hover:bg-gray-200 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Record Knot"}
          </button>
        </div>
      </section>

      {/* ★ 리스트 영역: 과거의 기록들 */}
      <section className="space-y-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-l-2 border-gray-700 pl-3">
          History of Existence
        </h2>
        
        <div className="space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-10 text-gray-600 italic">
              아직 기록된 실존이 없습니다.
            </div>
          ) : (
            records.map((rec) => (
              <article key={rec.id} className="group relative p-5 rounded-lg border border-gray-800 bg-[#0a0a0a] hover:border-gray-600 transition-all">
                {/* 상단 정보: 날짜 */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatDate(rec.created_at)}
                  </div>
                  <button 
                    onClick={() => handleDelete(rec.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all"
                    title="Delete Knot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 본문 내용 (Preview) */}
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap font-sans">
                  {/* 여기서는 MDX 원본을 텍스트로 보여줍니다. 추후 렌더링 기능을 붙일 수 있습니다. */}
                  {rec.content}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}