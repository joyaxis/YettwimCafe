"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { isAdminUser } from "../../lib/admin";

export default function AdminNav({
  showTop = true,
  showMenu = true,
}: {
  showTop?: boolean;
  showMenu?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setUserEmail(data.session?.user?.email ?? null);
    };
    loadSession();
    isAdminUser().then((ok) => {
      if (!active) return;
      setLoggedIn(ok);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setLoggedIn(false);
        setUserEmail(null);
        return;
      }
      setUserEmail(session.user.email ?? null);
      isAdminUser().then((ok) => {
        if (!active) return;
        setLoggedIn(ok);
      });
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleAuthClick = async () => {
    if (loggedIn) {
      await supabase.auth.signOut();
      setMessage("로그아웃 되었습니다.");
      router.push("/");
      return;
    }
    router.push("/admin/login");
  };

  return (
    <div className="flex flex-col gap-2">
      {showTop && (
        <div className="flex w-full justify-end gap-2 text-[11px] text-white/70">
          <button
            className="transition hover:text-white"
            onClick={handleAuthClick}
          >
            {loggedIn ? "관리자 로그아웃" : "관리자 로그인"}
          </button>
          <Link
            className="transition hover:text-white"
            href="/"
          >
            홈
          </Link>
        </div>
      )}
      {showMenu && loggedIn && pathname !== "/admin/login" && (
        <nav className="flex flex-wrap gap-4 text-sm text-white">
          <NavButton href="/admin" current={pathname}>대시보드</NavButton>
          <NavButton href="/admin/orders" current={pathname}>주문</NavButton>
          <NavButton href="/admin/sales" current={pathname}>매출 현황</NavButton>
          {userEmail !== "dongsan.lord@gmail.com" && (
            <>
              <NavButton href="/admin/categories" current={pathname}>카테고리</NavButton>
              <NavButton href="/admin/menu" current={pathname}>메뉴</NavButton>
              <NavButton href="/admin/recipes" current={pathname}>레시피</NavButton>
            </>
          )}
        </nav>
      )}
      {showTop && message && <p className="mt-2 text-sm text-white/80">{message}</p>}
    </div>
  );
}

function NavButton({
  href,
  current,
  children,
}: {
  href: string;
  current: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isActive = current === href;
  return (
    <Link
      className={`border-b-2 px-1 py-2 transition ${
        isActive
          ? "border-white text-white"
          : "border-transparent text-white/80 hover:border-white/70 hover:text-white"
      }`}
      href={href}
      onClick={(event) => {
        if (isActive) {
          event.preventDefault();
          window.location.reload();
        }
      }}
    >
      {children}
    </Link>
  );
}
