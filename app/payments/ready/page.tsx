"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TOSS_CLIENT_KEY = "test_ck_LlDJaYngro1kMBMMLQKn3ezGdRpX";
const CUSTOMER_KEY_STORAGE = "toss_customer_key_v1";

type TossPaymentRequest = {
  method: "TRANSFER";
  amount: { currency: "KRW"; value: number };
  orderId: string;
  orderName: string;
  customerName?: string;
  successUrl: string;
  failUrl: string;
  windowTarget?: "self" | "iframe";
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (payload: TossPaymentRequest) => Promise<void>;
      };
    };
  }
}

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.TossPayments) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-toss-payments]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.dataset.tossPayments = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load toss sdk"));
    document.body.appendChild(script);
  });
}

function getCustomerKey() {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(CUSTOMER_KEY_STORAGE);
  if (stored) return stored;
  const key = crypto.randomUUID();
  localStorage.setItem(CUSTOMER_KEY_STORAGE, key);
  return key;
}

export default function PaymentsReadyPage() {
  const params = useSearchParams();
  const [error, setError] = useState<string>("");
  const [openFailed, setOpenFailed] = useState(false);

  const query = useMemo(() => {
    const orderId = params.get("orderId") || "";
    const amount = Number(params.get("amount") || "0");
    const orderName = params.get("orderName") || "카페 주문";
    const customerName = params.get("customerName") || "";
    return { orderId, amount, orderName, customerName };
  }, [params]);

  const requestPayment = async () => {
    if (!query.orderId || !query.amount) {
      setError("결제 정보가 올바르지 않습니다.");
      return;
    }
    try {
      await loadTossScript();
      if (!window.TossPayments) {
        setError("결제 모듈을 불러오지 못했습니다.");
        return;
      }
      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: getCustomerKey() });
      const baseUrl =
        window.location.hostname === "localhost"
          ? window.location.origin
          : "http://yettwim-cafe.vercel.app";
      const payload: TossPaymentRequest = {
        method: "TRANSFER",
        amount: { currency: "KRW", value: query.amount },
        orderId: query.orderId,
        orderName: query.orderName,
        customerName: query.customerName || undefined,
        successUrl: `${baseUrl}/payments/success`,
        failUrl: `${baseUrl}/payments/fail`,
        windowTarget: "self",
      };
      await payment.requestPayment(payload);
    } catch {
      setError("결제 요청에 실패했습니다.");
    }
  };

  const openTossApp = () => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (!isAndroid && !isIOS) {
      setOpenFailed(true);
      return;
    }
    const storeUrl = isIOS
      ? "https://apps.apple.com/us/app/toss-make-finance-easier/id839333328"
      : "https://play.google.com/store/apps/details?id=viva.republica.toss";
    const timer = window.setTimeout(() => {
      window.location.href = storeUrl;
    }, 1200);
    window.location.href = "supertoss://";
    window.setTimeout(() => {
      window.clearTimeout(timer);
    }, 2000);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">토스 앱으로 결제하기</h1>
      <p className="text-sm text-stone-500">
        아래 버튼을 눌러 토스 앱에서 결제를 진행해주세요.
      </p>
      {error && (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="rounded-full border border-accent px-5 py-2 text-sm text-accent"
          onClick={openTossApp}
        >
          토스 앱으로 결제
        </button>
        <Link className="text-sm text-accent underline" href="/">
          주문 화면으로 돌아가기
        </Link>
        {openFailed && (
          <p className="text-xs text-stone-500">
            모바일 기기에서만 토스 앱 실행이 가능합니다.
          </p>
        )}
      </div>
    </main>
  );
}
