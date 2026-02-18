"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const amount = params.get("amount") || "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">결제가 완료되었습니다</h1>
      {orderId && (
        <p className="text-sm text-stone-600">주문번호: {orderId}</p>
      )}
      {amount && (
        <p className="text-sm text-stone-600">
          결제 금액: {Number(amount).toLocaleString("ko-KR")}원
        </p>
      )}
      <Link className="text-sm text-accent underline" href="/orders">
        내 주문 내역 보기
      </Link>
    </main>
  );
}
