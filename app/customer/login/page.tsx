"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const CUSTOMER_NAME_KEY = "cafe_customer_name_v1";
const CUSTOMER_LOGIN_TIME_KEY = "cafe_customer_login_time_v1";

export default function CustomerLoginPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(CUSTOMER_NAME_KEY);
    if (stored) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = () => {
    const run = async () => {
      const trimmed = name.trim();
      if (!trimmed) {
        setMessage("주문자명을 입력해주세요.");
        return;
      }
      setMessage(null);
      const now = new Date();
      const time = now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      localStorage.setItem(CUSTOMER_NAME_KEY, trimmed);
      localStorage.setItem(CUSTOMER_LOGIN_TIME_KEY, time);
      const { data, error } = await supabase
        .from("yettwim_member")
        .select("id,role")
        .eq("name", trimmed)
        .limit(1);
      if (error) {
        setMessage("확인 중 오류가 발생했습니다.");
        return;
      }
      if (!data || data.length === 0) {
        setMessage("등록되지 않은 성도입니다. 관리자에게 문의해주세요.");
        return;
      }
      if (data[0]?.role === "admin" || data[0]?.role === "step") {
        router.replace("/admin");
        return;
      }
      router.replace("/");
    };
    run();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-10">
      <div className="w-full" style={{ marginTop: "-100px" }}>
        <h1 className="text-2xl font-semibold">예뜀카페 COFFEE THE DREAM</h1>
        <p className="mt-2 text-sm text-stone-500">
          주문을 위해 이름을 입력해주세요.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <label className="flex items-center gap-3 text-sm text-stone-500">
            <span className="min-w-[32px]">이름</span>
            <input
              className="flex-1 border-b border-stone-300 bg-transparent px-2 py-2 text-base focus:border-stone-500 focus:outline-none"
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            className="mt-2 rounded-full bg-accent px-5 py-2 text-white"
            onClick={handleLogin}
          >
            로그인
          </button>
          {message && <p className="text-sm text-accent">{message}</p>}
        </form>
      </div>
    </main>
  );
}
