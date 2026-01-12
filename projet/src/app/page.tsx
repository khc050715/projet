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
  deleteDoc, 
  updateDoc, // 수정 함수
  doc, 
  getDoc,    // 단일 문서 읽기 (버전 관리용)
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Lock, Save, Loader2, Trash2, Clock, RotateCcw, PenLine } from "lucide-react"; // 아이콘 추가
import dynamic from "next/dynamic";

// 에디터 동적 로딩
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), {
  ssr: false,
  loading: () => <div className="text-gray-600">Editor Loading...</div>
});

interface RecordType {
  id: string;
  content: string;
  created_at: Timestamp | null;
  updated_at?: Timestamp | null;
  uid: string;
}

export default function Home() {
  // --- [상태 관리] ---
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);

  // 에디터 및 데이터 상태
  const [content, setContent] = useState("");
  const [records, setRecords] = useState<RecordType[]>([]);
  
  // ★ 수정 모드 상태 (editingId가 있으면 수정 모드)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const MY_EMAIL = "yours@email.com"; // ★ 본인 이메일로 수정 필수

  // 1. 인증 및 초기화
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터 동기화
  useEffect(() => {
    if (!user) {
      setRecords([]);
      return;
    }
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

  // ★ 4. 저장 및 수정 핸들러 (핵심 로직)
  const handleSave = async () => {
    if (!content.trim() || !user) return;
    setIsSaving(true);

    try {
      if (editingId) {
        // [수정 모드]: 과거를 보존하고 현재를 갱신
        const docRef = doc(db, "records", editingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const oldData = docSnap.data();
          
          // 1. revisions 서브컬렉션에 현재 상태 백업
          await addDoc(collection(docRef, "revisions"), {
            content_snapshot: oldData.content,
            archived_at: serverTimestamp(),
            original_created_at: oldData.created_at || null
          });

          // 2. 본문 업데이트
          await updateDoc(docRef, {
            content: content,
            updated_at: serverTimestamp(),
            // status: 'modified' // 필요 시 상태 변경 가능
          });
          setSaveMessage("수정 및 백업 완료.");
        }
      } else {
        // [새 글 모드]: 신규 생성
        await addDoc(collection(db, "records"), {
          uid: user.uid,
          content: content,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          status: 'active'
        });
        setSaveMessage("기록되었습니다.");
      }

      // 저장 후 초기화
      setContent("");
      setEditingId(null); // 수정 모드 해제
      setTimeout(() => setSaveMessage(""), 3000);

    } catch (error) {
      console.error("Error: ", error);
      setSaveMessage("오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // ★ 5. 수정 모드 진입
  const handleEdit = (record: RecordType) => {
    setEditingId(record.id);
    setContent(record.content); // 에디터에 내용 로드
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 에디터 위치로 스크롤
    setSaveMessage("과거의 실존을 수정합니다.");
  };

  // ★ 6. 수정 취소 (새 글 쓰기로 복귀)
  const handleCancelEdit = () => {
    setEditingId(null);
    setContent("");
    setSaveMessage("새로운 항해를 준비합니다.");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  // 7. 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 기록을 영원히 삭제하시겠습니까? (복구 불가)")) return;
    try {
      await deleteDoc(doc(db, "records", id));
      if (editingId === id) handleCancelEdit(); // 삭제한 글을 수정 중이었다면 취소
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // 날짜 포맷팅
  const formatDate = (timestamp: Timestamp | null | undefined) => {
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

      {/* 에디터 영역 */}
      <section className="mb-16 space-y-4">
        <div className={`min-h-50 p-4 border rounded-lg bg-[#111] transition-all ${editingId ? "border-yellow-600 ring-1 ring-yellow-900" : "border-gray-800"}`}>
          <NoteEditor markdown={content} onChange={setContent} />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono pl-2 ${editingId ? "text-yellow-500" : "text-green-500"}`}>
              {saveMessage || (editingId ? "Editing Mode..." : "Ready to log.")}
            </span>
            {editingId && (
               <button onClick={handleCancelEdit} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                 <RotateCcw className="w-3 h-3" /> Cancel
               </button>
            )}
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded disabled:opacity-50 transition-colors ${
              editingId 
                ? "bg-yellow-600 text-white hover:bg-yellow-700" 
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Processing..." : (editingId ? "Update Revision" : "Record Knot")}
          </button>
        </div>
      </section>

      {/* 리스트 영역 */}
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
              <article 
                key={rec.id} 
                className={`group relative p-5 rounded-lg border bg-[#0a0a0a] transition-all ${
                    editingId === rec.id ? "border-yellow-900/50 bg-yellow-900/10" : "border-gray-800 hover:border-gray-600"
                }`}
              >
                {/* 상단 정보 */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(rec.created_at)}</span>
                    {/* 수정된 기록 표시 */}
                    {rec.updated_at && rec.updated_at.toMillis() !== rec.created_at?.toMillis() && (
                        <span className="text-yellow-600/70 ml-1">(Revised)</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(rec)}
                      className="text-gray-600 hover:text-yellow-500 transition-all"
                      title="Revise Existence"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(rec.id)}
                      className="text-gray-600 hover:text-red-500 transition-all"
                      title="Delete Knot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 본문 내용 (지금은 Raw Text, 다음 단계에서 뷰어로 교체 예정) */}
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap font-sans">
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