"use client";

import { useMemo } from "react";

export default function InstallPage() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform = useMemo(() => {
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    if (/android/i.test(ua)) return "android";
    return "other";
  }, [ua]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">예뜀카페</p>
        <h1 className="mt-3 text-3xl font-semibold">홈 화면에 추가하기</h1>
        <p className="mt-2 text-sm text-stone-500">
          앱처럼 빠르게 사용하려면 홈 화면에 추가하세요.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">안드로이드 (Chrome)</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-600">
          <li>오른쪽 상단의 메뉴(⋮) 버튼을 누르세요.</li>
          <li>“홈 화면에 추가”를 선택하세요.</li>
          <li>표시되는 이름을 확인한 뒤 “추가”를 누르세요.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">iOS (Safari)</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-600">
          <li>하단의 공유 버튼(□↑)을 누르세요.</li>
          <li>“홈 화면에 추가”를 선택하세요.</li>
          <li>표시되는 이름을 확인한 뒤 “추가”를 누르세요.</li>
        </ol>
      </section>

      {platform !== "other" && (
        <p className="text-xs text-stone-500">
          현재 기기: {platform === "ios" ? "iOS" : "Android"}
        </p>
      )}
    </main>
  );
}
