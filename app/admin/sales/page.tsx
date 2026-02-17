"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";

type SalesRow = {
  id: string;
  name: string;
  qty: number;
  price: number;
  orders?: {
    created_at?: string;
    customer_name?: string | null;
  } | null;
};

export default function AdminSalesPage() {
  const [items, setItems] = useState<SalesRow[]>([]);
  const [date, setDate] = useState("");
  const [nameQuery, setNameQuery] = useState("");

  const load = async () => {
    let query = supabase
      .from("order_items")
      .select("id,name,qty,price,orders:order_id(created_at,customer_name)")
      .order("created_at", { ascending: false, foreignTable: "orders" });

    if (nameQuery.trim()) {
      query = query.ilike("orders.customer_name", `%${nameQuery.trim()}%`);
    }

    const { data } = await query;
    const filtered = ((data as SalesRow[]) || []).filter((item) => {
      if (!date) return true;
      const createdAt = item.orders?.created_at;
      if (!createdAt) return false;
      const localDate = new Date(createdAt);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}` === date;
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = a.orders?.created_at ? new Date(a.orders.created_at).getTime() : 0;
      const bTime = b.orders?.created_at ? new Date(b.orders.created_at).getTime() : 0;
      return bTime - aTime;
    });
    setItems(sorted);
  };

  useEffect(() => {
    load();
  }, [date, nameQuery]);

  const totalAmount = useMemo(
    () =>
      items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0),
    [items]
  );

  return (
    <AdminGate>
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">매출 현황</h2>
            <p className="mt-1 text-sm text-stone-500">주문 메뉴 기준으로 표시됩니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="date"
                className="rounded-full border border-stone-200 px-4 py-2 pr-9 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {date && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                  onClick={() => setDate("")}
                  aria-label="날짜 지우기"
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="relative">
              <input
                className="rounded-full border border-stone-200 px-4 py-2 pr-9 text-sm"
                placeholder="주문자 검색"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
              />
              {nameQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                  onClick={() => setNameQuery("")}
                  aria-label="검색어 지우기"
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200">
          <div className="hidden grid-cols-[140px_1fr_160px_140px] items-center gap-4 bg-clay px-6 py-3 text-sm font-semibold text-center md:grid">
            <span>날짜</span>
            <span>메뉴명</span>
            <span>금액</span>
            <span>주문자</span>
          </div>
          <div className="divide-y divide-stone-200 px-4 py-2 md:px-0 md:py-0">
            {items.length === 0 ? (
              <p className="px-2 py-4 text-stone-500 md:px-6">표시할 내역이 없습니다.</p>
            ) : (
              items.map((item) => {
                const createdAt = item.orders?.created_at?.slice(0, 10) || "-";
                const amount = Number(item.price) * Number(item.qty);
                return (
                  <div
                    key={item.id}
                    className="grid gap-3 py-3 md:grid-cols-[140px_1fr_160px_140px] md:items-center md:px-6"
                  >
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">날짜</span>
                      <span className="text-sm text-stone-700 md:text-center">
                        {createdAt}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">메뉴명</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">금액</span>
                      <span className="text-sm font-semibold text-stone-700 md:text-center">
                        {amount.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">주문자</span>
                      <span className="text-sm text-stone-700 md:text-center">
                        {item.orders?.customer_name || "-"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-stone-200 px-6 py-4 text-right text-sm">
            합계 금액:{" "}
            <span className="font-semibold text-stone-800">
              {totalAmount.toLocaleString("ko-KR")}원
            </span>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
