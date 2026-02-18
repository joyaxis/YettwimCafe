"use client";

import { useMemo } from "react";
import type { Order } from "../../../lib/types";

export default function OrderFilters({
  query,
  dateRange,
  onQuery,
  onDateRange,
}: {
  query: string;
  dateRange: { from: string; to: string };
  onQuery: (value: string) => void;
  onDateRange: (value: { from: string; to: string }) => void;
}) {
  const dateError = useMemo(() => {
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      return "조회 시작일이 종료일보다 빠르거나 같아야 합니다.";
    }
    return "";
  }, [dateRange.from, dateRange.to]);

  return (
    <div className="flex flex-wrap gap-3">
      <input
        className="rounded-full border border-stone-200 px-4 py-2 text-sm"
        placeholder="주문번호 검색"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
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
      </div>
      {dateError && <p className="text-xs text-red-500">{dateError}</p>}
    </div>
  );
}
