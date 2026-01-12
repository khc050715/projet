import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

// RecordType에 tags 추가
export interface RecordType {
  id: string;
  uid: string;
  title: string;
  content: string;
  tags: string[]; // ★ 핵심: 노트(태그) 배열
  created_at: Timestamp | null;
  updated_at?: Timestamp | null;
  status?: string;
  revision_count?: number;
}

export const formatDate = (ts: Timestamp | null | undefined) => {
  if (!ts) return "";
  return new Date(ts.toDate()).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

export function useAuth(requireAuth = false) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (requireAuth && !currentUser) {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [requireAuth, router]);

  return { user, loading };
}