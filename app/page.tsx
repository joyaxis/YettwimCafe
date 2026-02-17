"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    router.replace(isStandalone ? "/customer/login" : "/install");
    setChecking(false);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-6 text-sm text-stone-500">
      {checking ? "화면을 준비 중입니다..." : "이동 중입니다..."}
    </main>
  );
}
