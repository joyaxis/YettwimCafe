"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentFailPage() {
  const params = useSearchParams();
  const code = params.get("code") || "";
  const message = params.get("message") || "결제가 취소되었습니다.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">결제가 실패했습니다</h1>
      <p className="text-sm text-stone-600">{message}</p>
      {code && <p className="text-xs text-stone-400">오류 코드: {code}</p>}
      <Link className="text-sm text-accent underline" href="/">
        주문 화면으로 돌아가기
      </Link>
    </main>
  );
}
