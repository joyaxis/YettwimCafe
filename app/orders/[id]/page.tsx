"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import type { Order, OrderItem } from "../../../lib/types";
import Toast from "../../components/ui/Toast";
import OrderTimeline, { type OrderEvent } from "../_components/OrderTimeline";

const CUSTOMER_NAME_KEY = "cafe_customer_name_v1";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [toasts, setToasts] = useState<
    { id: string; message: string; tone?: "default" | "success" | "warning" }[]
  >([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);

  const pushToast = (
    message: string,
    tone: "default" | "success" | "warning" = "default",
  ) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message, tone }]);
  };

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      await supabase.auth.signInAnonymously();
    };

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const storedName = localStorage.getItem(CUSTOMER_NAME_KEY);
      if (!storedName) {
        router.replace("/customer/login");
        return;
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,subtotal,discount,total,pickup_time,note,created_at,customer_name",
        )
        .eq("id", orderId)
        .eq("customer_name", storedName)
        .maybeSingle();

      if (!orderData || !active) {
        return;
      }

      setOrder(orderData as Order);

      const { data: itemData } = await supabase
        .from("order_items")
        .select("id,order_id,menu_item_id,name,qty,price,status,recipe")
        .eq("order_id", orderId);

      if (!active) return;
      setItems((itemData as OrderItem[]) || []);

      const { data: eventData } = await supabase
        .from("order_status_events")
        .select("id,entity_type,from_status,to_status,created_at,order_item_id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (!active) return;
      setEvents(eventData || []);
    };

    ensureSession().then(() => load());
    const interval = window.setInterval(load, 3000);

    supabase.auth.getSession().then(({ data }) => {
      const customerId = data.session?.user?.id;
      if (!customerId) return;
      channel = supabase
        .channel(`order-detail-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            const updated = payload.new as Order;
            setOrder(updated);
            const code = updated.order_code || updated.id;
            pushToast(
              `${code} 주문 상태 변경 : "${updated.status}"`,
              "success",
            );
            supabase
              .from("order_status_events")
              .select(
                "id,entity_type,from_status,to_status,created_at,order_item_id",
              )
              .eq("order_id", orderId)
              .order("created_at", { ascending: false })
              .then(({ data }) => setEvents(data || []));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_items",
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const updated = payload.new as OrderItem;
            setItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            pushToast(
              `${updated.name} 상태 변경: ${updated.status}`,
              "warning",
            );
            supabase
              .from("order_status_events")
              .select(
                "id,entity_type,from_status,to_status,created_at,order_item_id",
              )
              .eq("order_id", orderId)
              .order("created_at", { ascending: false })
              .then(({ data }) => setEvents(data || []));
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  if (!order) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <Link className="text-sm text-stone-500 underline" href="/orders">
          주문 목록으로 돌아가기
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          주문 정보를 불러오는 중...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="rounded-full border border-stone-300 px-4 py-2 text-sm"
          href="/orders"
        >
          주문 목록으로 돌아가기
        </Link>
        <Link
          className="rounded-full border border-stone-300 px-4 py-2 text-sm"
          href="/"
        >
          홈으로
        </Link>
      </div>
      <header className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
        <h1 className="text-2xl font-semibold">
          주문번호 {order.order_code || order.id}
        </h1>
        <div className="mt-2 text-stone-500 flex items-center gap-2">
          <span>상태:</span>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-stone-500">
          {order.customer_name ? `주문자: ${order.customer_name} · ` : ""}
          주문 일시:{" "}
          {order.created_at
            ? new Date(order.created_at)
                .toLocaleString("sv-SE")
                .replace(" ", " ")
            : "-"}
        </p>
      </header>
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">메뉴 상세</h2>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`py-4 ${
                index === items.length - 1 ? "" : "border-b border-stone-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-stone-500">
                    {Number(item.price).toLocaleString("ko-KR")} × {item.qty}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.recipe && (
                <p className="mt-2 text-sm text-stone-500">
                  레시피: {item.recipe}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">결제 정보</h2>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <div className="mt-3 space-y-2 text-stone-600">
          <div className="flex items-center justify-between">
            <span>소계</span>
            <span>{Number(order.subtotal).toLocaleString("ko-KR")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>할인</span>
            <span>{Number(order.discount).toLocaleString("ko-KR")}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-ink">
            <span>총 결제 금액</span>
            <span>{Number(order.total).toLocaleString("ko-KR")}</span>
          </div>
        </div>
      </section>
      <Toast
        items={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: Order["status"] | OrderItem["status"];
}) {
  const base = "inline-flex rounded-full px-3 py-1 text-xs font-semibold";
  if (status === "완료" || status === "제조완료") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        {status}
      </span>
    );
  }
  if (status === "음료준비중" || status === "제조중") {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>{status}</span>
    );
  }
  if (status === "주문취소" || status === "취소") {
    return (
      <span className={`${base} bg-rose-100 text-rose-700`}>{status}</span>
    );
  }
  return (
    <span className={`${base} bg-stone-100 text-stone-600`}>{status}</span>
  );
}
