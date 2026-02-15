"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MenuStat = {
  name: string;
  count: number;
  total: number;
};

export default function MenuStats() {
  const [stats, setStats] = useState<MenuStat[]>([]);
  const currentYear = new Date().getFullYear();
  const chartWidth = 1200;
  const chartHeight = 320;
  const chartBaseY = 240;
  const chartPlotHeight = 200;
  const chartLabelY = 290;
  const maxBarCount = 15;
  const chartPaddingLeft = 60;
  const chartPaddingRight = 20;
  const chartInnerWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const mobileWidth = 720;
  const mobileHeight = 240;
  const mobileBaseY = 175;
  const mobilePlotHeight = 120;
  const mobileLabelY = 220;
  const mobilePaddingLeft = 44;
  const mobilePaddingRight = 16;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

      const { data } = await supabase
        .from("order_items")
        .select("name,qty,price,orders!inner(created_at,status)")
        .gte("orders.created_at", yearStart.toISOString())
        .lt("orders.created_at", yearEnd.toISOString())
        .not("orders.status", "eq", "주문취소");
      if (!active) return;

      const map = new Map<string, MenuStat>();
      (data || []).forEach((row: { name: string; qty: number; price: number }) => {
        const key = row.name || "알 수 없음";
        const next = map.get(key) || { name: key, count: 0, total: 0 };
        const qty = Number(row.qty) || 0;
        const price = Number(row.price) || 0;
        next.count += qty;
        next.total += qty * price;
        map.set(key, next);
      });

      const list = Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setStats(list);
    };

    load();
    const interval = window.setInterval(load, 3000);

    const channel = supabase
      .channel("admin-menu-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const maxTotal = Math.max(1, ...stats.map((item) => item.total));
  const mobileStats = stats.slice(0, 3);
  const mobileMaxTotal = Math.max(1, ...mobileStats.map((item) => item.total));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 pb-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">메뉴별 주문현황</h2>
        <span className="text-xs text-stone-500">
          {currentYear}년 기준
        </span>
      </div>
      <div className="mt-4">
        {stats.length === 0 ? (
          <p className="text-sm text-stone-500">주문 내역이 없습니다.</p>
        ) : (
          <>
            <div className="hidden h-72 w-full md:block">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
            <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#f5f5f4" rx="16" />
            <text x="12" y="18" fontSize="12" fill="#78716c">
              금액(원)
            </text>
            {stats.map((item, idx) => {
              const barWidth = chartInnerWidth / stats.length;
              const barGap = 10;
              const x = chartPaddingLeft + idx * barWidth + barGap;
              const usableWidth = barWidth - barGap * 2;
              const barHeight = (Math.min(item.count, maxBarCount) / maxBarCount) * chartPlotHeight;
              const y = chartBaseY - barHeight;
              return (
                <g key={item.name}>
                  <rect
                    x={x}
                    y={y}
                    width={usableWidth}
                    height={barHeight}
                    fill="#c35b3f"
                    rx="8"
                  />
                  <title>{`${item.name} · 수량 ${item.count} · 매출 ${item.total.toLocaleString("ko-KR")}`}</title>
                  <text
                    x={x + usableWidth / 2}
                    y={Math.min(chartBaseY - 5, y + 22)}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#ffffff"
                  >
                    {item.count}
                  </text>
                  <text
                    x={x + usableWidth / 2}
                    y={chartLabelY}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#78716c"
                  >
                    <title>{item.name}</title>
                    {item.name.length > 6 ? `${item.name.slice(0, 6)}…` : item.name}
                  </text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const value = Math.round(maxTotal * ratio);
              const y = chartBaseY - ratio * chartPlotHeight;
              return (
                <g key={`y-${idx}`}>
                  <line
                    x1={chartPaddingLeft}
                    x2={chartWidth}
                    y1={y}
                    y2={y}
                    stroke="#e7e5e4"
                    strokeDasharray="4 4"
                  />
                  <text x="12" y={y - 4} fontSize="12" fill="#78716c">
                    {value.toLocaleString("ko-KR")}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              points={stats
                .map((item, idx) => {
                  const x =
                    chartPaddingLeft +
                    idx * (chartInnerWidth / stats.length) +
                    (chartInnerWidth / stats.length) / 2;
                  const y = chartBaseY - (item.total / maxTotal) * chartPlotHeight;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {stats.map((item, idx) => {
              const x =
                chartPaddingLeft +
                idx * (chartInnerWidth / stats.length) +
                (chartInnerWidth / stats.length) / 2;
              const y = chartBaseY - (item.total / maxTotal) * chartPlotHeight;
              return (
                <g key={`dot-${item.name}`}>
                  <circle cx={x} cy={y} r="6" fill="#3b82f6">
                    <title>{`${item.name} · 수량 ${item.count} · 매출 ${item.total.toLocaleString("ko-KR")}`}</title>
                  </circle>
                  <text x={x} y={Math.max(14, y - 10)} textAnchor="middle" fontSize="12" fill="#1d4ed8">
                    {item.total.toLocaleString("ko-KR")}
                  </text>
                </g>
              );
            })}
              </svg>
            </div>
            <div className="block h-44 w-full md:hidden">
              <svg viewBox={`0 0 ${mobileWidth} ${mobileHeight}`} className="h-full w-full">
            <rect x="0" y="0" width={mobileWidth} height={mobileHeight} fill="#f5f5f4" rx="16" />
            <text x="10" y="16" fontSize="10" fill="#78716c">
              금액(원)
            </text>
            {mobileStats.map((item, idx) => {
              const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
              const barWidth = innerWidth / mobileStats.length;
              const barGap = 6;
              const x = mobilePaddingLeft + idx * barWidth + barGap;
              const usableWidth = barWidth - barGap * 2;
              const barHeight = (Math.min(item.count, maxBarCount) / maxBarCount) * mobilePlotHeight;
              const y = mobileBaseY - barHeight;
              return (
                <g key={`m-${item.name}`}>
                  <rect
                    x={x}
                    y={y}
                    width={usableWidth}
                    height={barHeight}
                    fill="#c35b3f"
                    rx="6"
                  />
                  <text
                    x={x + usableWidth / 2}
                    y={Math.min(mobileBaseY - 4, y + 16)}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#ffffff"
                  >
                    {item.count}
                  </text>
                  <text
                    x={x + usableWidth / 2}
                    y={mobileLabelY}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#78716c"
                  >
                    {item.name.length > 4 ? `${item.name.slice(0, 4)}…` : item.name}
                  </text>
                </g>
              );
            })}
            {[0, 0.5, 1].map((ratio, idx) => {
              const value = Math.round(mobileMaxTotal * ratio);
              const y = mobileBaseY - ratio * mobilePlotHeight;
              return (
                <g key={`y-mobile-${idx}`}>
                  <line
                    x1={mobilePaddingLeft}
                    x2={mobileWidth}
                    y1={y}
                    y2={y}
                    stroke="#e7e5e4"
                    strokeDasharray="4 4"
                  />
                  <text x="8" y={y - 4} fontSize="10" fill="#78716c">
                    {value.toLocaleString("ko-KR")}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              points={mobileStats
                .map((item, idx) => {
                  const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
                  const x =
                    mobilePaddingLeft +
                    idx * (innerWidth / mobileStats.length) +
                    (innerWidth / mobileStats.length) / 2;
                  const y = mobileBaseY - (item.total / mobileMaxTotal) * mobilePlotHeight;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {mobileStats.map((item, idx) => {
              const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
              const x =
                mobilePaddingLeft +
                idx * (innerWidth / mobileStats.length) +
                (innerWidth / mobileStats.length) / 2;
              const y = mobileBaseY - (item.total / mobileMaxTotal) * mobilePlotHeight;
              return (
                <g key={`dot-mobile-${item.name}`}>
                  <circle cx={x} cy={y} r="4" fill="#3b82f6">
                    <title>{`${item.name} · 수량 ${item.count} · 매출 ${item.total.toLocaleString("ko-KR")}`}</title>
                  </circle>
                </g>
              );
            })}
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
