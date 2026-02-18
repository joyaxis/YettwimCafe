"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";
import Toast from "../components/ui/Toast";
import OrderFilters from "./_components/OrderFilters";
import { useRouter } from "next/navigation";

const CUSTOMER_NAME_KEY = "cafe_customer_name_v1";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; tone?: "default" | "success" | "warning" }[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"inProgress" | "completed" | "canceled">("inProgress");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const router = useRouter();
  const lastStatuses = useRef<Record<string, Order["status"]>>({});
  const initialLoaded = useRef(false);

  const pushToast = (message: string, tone: "default" | "success" | "warning" = "default") => {
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
      const storedName = localStorage.getItem(CUSTOMER_NAME_KEY);
      if (!storedName) {
        router.replace("/customer/login");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: orders } = await supabase
        .from("orders")
        .select("id,order_code,status,total,created_at")
        .eq("customer_name", storedName)
        .order("created_at", { ascending: false });
      if (!active) return;
      const nextOrders = (orders as Order[]) || [];
      if (initialLoaded.current) {
        nextOrders.forEach((order) => {
          const prevStatus = lastStatuses.current[order.id];
          if (prevStatus && prevStatus !== order.status) {
            const code = order.order_code || order.id;
            pushToast(`${code} 주문 상태 변경 : "${order.status}"`, "success");
          }
        });
      }
      lastStatuses.current = nextOrders.reduce<Record<string, Order["status"]>>((acc, order) => {
        acc[order.id] = order.status;
        return acc;
      }, {});
      initialLoaded.current = true;
      setOrders(nextOrders);
    };

    ensureSession().then(() => load());
    const interval = window.setInterval(load, 3000);

    supabase.auth.getSession().then(({ data }) => {
      const storedName = localStorage.getItem(CUSTOMER_NAME_KEY);
      if (!data.session || !storedName) return;
      const channelKey = storedName.replace(/\s+/g, "_");
      channel = supabase
        .channel(`orders-list-${channelKey}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `customer_name=eq.${storedName}`,
          },
          () => load()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_items",
          },
          () => {
            load();
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const code = (order.order_code || order.id).toLowerCase();
      const matchesQuery = query ? code.includes(query.toLowerCase()) : true;
      const orderDate = order.created_at?.slice(0, 10);
      const afterFrom = dateRange.from ? orderDate >= dateRange.from : true;
      const beforeTo = dateRange.to ? orderDate <= dateRange.to : true;
      return matchesQuery && afterFrom && beforeTo;
    });
  }, [orders, query, dateRange]);

  const inProgressOrders = useMemo(() => {
    return filteredOrders
      .filter(
        (order) => order.status !== "완료" && order.status !== "주문취소",
      )
      .slice()
      .sort(
        (a, b) =>
          (a.created_at || "").localeCompare(b.created_at || ""),
      );
  }, [filteredOrders]);
  const completedOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => order.status === "완료")
      .slice()
      .sort(
        (a, b) =>
          (b.created_at || "").localeCompare(a.created_at || ""),
      );
  }, [filteredOrders]);
  const canceledOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => order.status === "주문취소")
      .slice()
      .sort(
        (a, b) =>
          (b.created_at || "").localeCompare(a.created_at || ""),
      );
  }, [filteredOrders]);

  const activeOrders =
    activeTab === "completed"
      ? completedOrders
      : activeTab === "canceled"
        ? canceledOrders
        : inProgressOrders;
  const totalPages = Math.max(1, Math.ceil(activeOrders.length / PAGE_SIZE));
  const pagedOrders = activeOrders.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, query, dateRange.from, dateRange.to]);

  return (
    <main className="flex w-full flex-col gap-6 pb-10">
      <header className="bg-accent text-white">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">내 주문 내역</h1>
            </div>
            <Link className="rounded-full border border-white/70 px-4 py-2 text-sm text-white" href="/">
              홈으로
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6">

      <OrderFilters
        query={query}
        dateRange={dateRange}
        onQuery={setQuery}
        onDateRange={setDateRange}
      />

      <div className="flex flex-wrap gap-4 border-b border-stone-200 text-sm">
        {[
          { key: "inProgress", label: `진행 중 (${inProgressOrders.length})` },
          { key: "completed", label: `완료 (${completedOrders.length})` },
          { key: "canceled", label: `취소 (${canceledOrders.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`border-b-2 pb-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-stone-500"
            }`}
            onClick={() =>
              setActiveTab(tab.key as "inProgress" | "completed" | "canceled")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {pagedOrders.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-6">주문 내역이 없습니다.</p>
        ) : (
          pagedOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className={`flex items-center justify-between rounded-2xl border border-stone-200 p-6 transition hover:shadow-soft ${
                order.status === "완료" || order.status === "주문취소" ? "bg-stone-100" : "bg-white"
              }`}
            >
              <div>
                <p className="font-semibold">주문번호 {order.order_code || order.id}</p>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <span className="font-semibold">{Number(order.total).toLocaleString("ko-KR")}</span>
            </Link>
          ))
        )}
      </div>
      {activeOrders.length > PAGE_SIZE && (
        <Pagination current={page} total={totalPages} onChange={setPage} />
      )}
      <Toast
        items={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const base = "inline-flex rounded-full px-3 py-1 text-xs font-semibold";
  if (status === "완료") {
    return <span className={`${base} bg-emerald-100 text-emerald-700`}>{status}</span>;
  }
  if (status === "음료준비중") {
    return <span className={`${base} bg-amber-100 text-amber-700`}>{status}</span>;
  }
  if (status === "주문취소") {
    return <span className={`${base} bg-rose-100 text-rose-700`}>{status}</span>;
  }
  return <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>;
}

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const canPrev = current > 1;
  const canNext = current < total;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 disabled:opacity-40"
        onClick={() => onChange(current - 1)}
        disabled={!canPrev}
      >
        이전
      </button>
      <span className="text-xs text-stone-500">
        {current} / {total}
      </span>
      <button
        className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 disabled:opacity-40"
        onClick={() => onChange(current + 1)}
        disabled={!canNext}
      >
        다음
      </button>
    </div>
  );
}
