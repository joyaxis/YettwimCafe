"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { isAdminUser } from "../../lib/admin";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        setReady(true);
        setAllowed(false);
        return;
      }
      const ok = await isAdminUser();
      if (!active) return;
      setAllowed(ok);
      setReady(true);
    };
    check();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p>관리자 권한 확인 중...</p>
      </div>
    );
  }

  if (!allowed) {
    router.replace("/admin/login");
    return null;
  }

  return <>{children}</>;
}
