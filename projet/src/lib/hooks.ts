import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

// 데이터 타입 정의 (전역 사용)
export interface RecordType {
  id: string;
  uid: string;
  title: string;
  content: string;
  created_at: Timestamp | null;
  updated_at?: Timestamp | null;
  status?: string;
  revision_count?: number;
}

// 날짜 포맷팅 유틸리티
export const formatDate = (ts: Timestamp | null | undefined) => {
  if (!ts) return "";
  return new Date(ts.toDate()).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

// 인증 및 유저 상태 관리 훅
export function useAuth(requireAuth = false) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // 로그인이 필요한 페이지인데 유저가 없으면 홈으로 튕김
      if (requireAuth && !currentUser) {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [requireAuth, router]);

  return { user, loading };
}