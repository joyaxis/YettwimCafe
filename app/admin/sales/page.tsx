"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
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
    status?: string;
  } | null;
};

export default function AdminSalesPage() {
  const [items, setItems] = useState<SalesRow[]>([]);
  const [date, setDate] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = async () => {
    let query = supabase
      .from("order_items")
      .select(
        "id,name,qty,price,orders:order_id(created_at,customer_name,status)",
      )
      .order("created_at", { ascending: false, foreignTable: "orders" });

    const { data } = await query;
    const filtered = ((data as SalesRow[]) || []).filter((item) => {
      if (item.orders?.status !== "완료") return false;
      if (nameQuery.trim()) {
        const q = nameQuery.trim().toLowerCase();
        const matchesCustomer = (item.orders?.customer_name || "")
          .toLowerCase()
          .includes(q);
        const matchesMenu = (item.name || "").toLowerCase().includes(q);
        if (!matchesCustomer && !matchesMenu) return false;
      }
      if (!date) return true;
      const createdAt = item.orders?.created_at;
      if (!createdAt) return false;
      const localDate = new Date(createdAt);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}` === date;
    });
    const monthFiltered = date
      ? filtered
      : filtered.filter((item) => {
          const createdAt = item.orders?.created_at;
          if (!createdAt) return false;
          const localDate = new Date(createdAt);
          return (
            localDate.getFullYear() === month.getFullYear() &&
            localDate.getMonth() === month.getMonth()
          );
        });

    const sorted = monthFiltered.sort((a, b) => {
      const aTime = a.orders?.created_at
        ? new Date(a.orders.created_at).getTime()
        : 0;
      const bTime = b.orders?.created_at
        ? new Date(b.orders.created_at).getTime()
        : 0;
      return bTime - aTime;
    });
    setItems(sorted);
  };

  useEffect(() => {
    load();
  }, [date, nameQuery, month]);

  useEffect(() => {
    if (!date) return;
    const [y, m] = date.split("-").map(Number);
    if (!y || !m) return;
    setMonth(new Date(y, m - 1, 1));
  }, [date]);

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.qty),
        0,
      ),
    [items],
  );

  const handleExport = () => {
    const rows = items.map((item) => {
      const createdAt = item.orders?.created_at
        ? new Date(item.orders.created_at)
        : null;
      const dateLabel = createdAt
        ? createdAt.toISOString().slice(0, 10)
        : "";
      const amount = Number(item.price) * Number(item.qty);
      return {
        날짜: dateLabel,
        메뉴명: item.name,
        금액: amount,
        주문자: item.orders?.customer_name || "",
      };
    });
    const totalRow = {
      날짜: "",
      메뉴명: "합계",
      금액: totalAmount,
      주문자: "",
    };
    const sheet = XLSX.utils.json_to_sheet([...rows, totalRow], {
      header: ["날짜", "메뉴명", "금액", "주문자"],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "매출현황");
    const label = date
      ? date
      : `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    XLSX.writeFile(wb, `sales-${label}.xlsx`);
  };

  return (
    <AdminGate>
      <div className="bg-white">
        <div>
          <h2 className="text-lg font-semibold">매출 현황</h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-base text-stone-600">
            <button
              className="rounded-full border border-stone-300 px-2 py-1 text-xs text-stone-500"
              onClick={() => {
                setDate("");
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1),
                );
              }}
            >
              이전
            </button>
            <span>
              {month.getFullYear()}년 {month.getMonth() + 1}월
            </span>
            <button
              className="rounded-full border border-stone-300 px-2 py-1 text-xs text-stone-500"
              onClick={() => {
                setDate("");
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1),
                );
              }}
            >
              다음
            </button>
          </div>
          <div className="grid gap-2 md:flex md:flex-wrap md:items-center">
            <div className="relative md:w-auto">
              <input
                type="date"
                className="w-[140px] rounded-full border border-stone-200 px-2 py-1.5 pr-3 text-xs md:w-auto md:px-4 md:py-2 md:pr-3 md:text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                className="w-full border-b border-stone-300 bg-transparent px-1 py-2 pr-9 text-sm focus:border-stone-500 focus:outline-none"
                placeholder="주문자 및 메뉴명 검색"
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
            <button
              className="rounded-full border border-accent px-4 py-2 text-sm text-accent"
              onClick={handleExport}
            >
              엑셀 다운로드
            </button>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200">
          <div className="hidden grid-cols-[140px_1fr_160px_140px] items-center gap-4 bg-clay px-6 py-3 text-sm font-semibold text-center md:grid">
            <span>날짜</span>
            <span>메뉴명</span>
            <span>금액</span>
            <span>주문자</span>
          </div>
          <div className="divide-y divide-stone-200 px-4 py-2 md:px-0 md:py-0">
            {items.length === 0 ? (
              <p className="px-2 py-4 text-stone-500 md:px-6">
                표시할 내역이 없습니다.
              </p>
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
                      <span className="text-xs text-stone-500 md:hidden">
                        날짜
                      </span>
                      <span className="text-sm text-stone-700 md:text-center">
                        {createdAt}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">
                        메뉴명
                      </span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">
                        금액
                      </span>
                      <span className="text-sm font-semibold text-stone-700 md:text-center">
                        {amount.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-stone-500 md:hidden">
                        주문자
                      </span>
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
