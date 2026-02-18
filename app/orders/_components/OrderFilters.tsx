"use client";

import { useMemo } from "react";
import type { Order } from "../../../lib/types";

export default function OrderFilters({
  query,
  statusFilter,
  dateRange,
  onQuery,
  onStatus,
  onDateRange,
}: {
  query: string;
  statusFilter: "all" | Order["status"];
  dateRange: { from: string; to: string };
  onQuery: (value: string) => void;
  onStatus: (value: "all" | Order["status"]) => void;
  onDateRange: (value: { from: string; to: string }) => void;
}) {
  const label = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return "";
    return `${dateRange.from || "-"} ~ ${dateRange.to || "-"}`;
  }, [dateRange]);

  return (
    <div className="flex flex-wrap gap-3">
      <input
        className="rounded-full border border-stone-200 px-4 py-2 text-sm"
        placeholder="주문번호 검색"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <select
        className="rounded-full border border-stone-200 px-4 py-2 text-sm"
        value={statusFilter}
        onChange={(e) => onStatus(e.target.value as "all" | Order["status"])}
      >
        <option value="all">전체 상태</option>
        <option value="주문요청">주문요청</option>
        <option value="음료준비중">음료준비중</option>
        <option value="완료">완료</option>
        <option value="주문취소">주문취소</option>
      </select>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm">
        <span className="text-stone-500">날짜</span>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => onDateRange({ ...dateRange, from: e.target.value })}
          className="border-none bg-transparent text-sm outline-none"
        />
        <span className="text-stone-400">~</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => onDateRange({ ...dateRange, to: e.target.value })}
          className="border-none bg-transparent text-sm outline-none"
        />
        <span className="ml-2 text-stone-500">{label}</span>
      </div>
    </div>
  );
}
