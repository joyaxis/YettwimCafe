"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { isAdminUser } from "../../../lib/admin";

export default function AdminLoginPage() {
  const EMAIL_KEY = "admin_saved_email_v1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    let active = true;
    const check = async () => {
      const ok = await isAdminUser();
      if (!active) return;
      if (ok) {
        router.replace("/admin");
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [router]);

  const signIn = async () => {
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage("로그인 실패: " + error.message);
      return;
    }
    if (rememberEmail && email) {
      window.localStorage.setItem(EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(EMAIL_KEY);
    }
    const ok = await isAdminUser();
    if (!ok) {
      setMessage("관리자 권한이 없습니다.");
      return;
    }
    router.replace("/admin");
  };


  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-semibold">관리자 로그인</h2>
      <p className="mt-2 text-sm text-stone-500">Supabase Auth 계정으로 로그인합니다.</p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
      >
        <input
          className="rounded-xl border border-stone-200 px-4 py-2"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded-xl border border-stone-200 px-4 py-2"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
          />
          이메일 주소 저장하기
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-accent px-5 py-2 text-white" type="submit">
            로그인
          </button>
        </div>
        {message && <p className="text-sm text-accent">{message}</p>}
      </form>
    </div>
  );
}
