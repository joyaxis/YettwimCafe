"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function OrderStats() {
  const [stats, setStats] = useState<
    { label: string; count: number; total: number }[]
  >([]);
  const [monthly, setMonthly] = useState<
    { month: number; count: number; total: number }[]
  >([]);
  const currentYear = new Date().getFullYear();
  const chartWidth = 1200;
  const chartHeight = 320;
  const chartBaseY = 240;
  const chartPlotHeight = 200;
  const chartLabelY = 290;
  const chartPaddingLeft = 60;
  const chartPaddingRight = 20;

  const mobileWidth = 720;
  const mobileHeight = 288;
  const mobileBaseY = 210;
  const mobilePlotHeight = 150;
  const mobileLabelY = 250;
  const mobilePaddingLeft = 44;
  const mobilePaddingRight = 16;
  const chartInnerWidth = chartWidth - chartPaddingLeft - chartPaddingRight;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const { data: yearly } = await supabase
        .from("orders")
        .select("total,created_at,status,order_items(qty)")
        .gte("created_at", yearStart.toISOString())
        .not("status", "eq", "주문취소");
      if (!active) return;

      const month = { count: 0, total: 0 };
      const year = { count: 0, total: 0 };

      const monthlyBuckets = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0,
        total: 0,
      }));

      (
        yearly || []
      ).forEach((row: { total: number; created_at: string; order_items?: { qty: number }[] }) => {
        const created = new Date(row.created_at);
        const amount = Number(row.total) || 0;
        const menuCount = (row.order_items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        if (created >= yearStart) {
          year.count += menuCount;
          year.total += amount;
          const m = created.getMonth();
          monthlyBuckets[m].count += menuCount;
          monthlyBuckets[m].total += amount;
        }
        if (created >= monthStart) {
          month.count += menuCount;
          month.total += amount;
        }
      });

      setStats([
        { label: "월간", count: month.count, total: month.total },
      ]);
      setMonthly(monthlyBuckets);
    };

    load();
    const interval = window.setInterval(load, 3000);

    const channel = supabase
      .channel("admin-order-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const maxMonthlyCount = 15;
  const maxMonthlyTotal = Math.max(1, ...monthly.map((m) => m.total));
  const currentMonth = new Date().getMonth() + 1;
  const mobileMonthly = [-1, 0, 1].map((offset) => {
    const month = ((currentMonth - 1 + offset + 12) % 12) + 1;
    return monthly.find((m) => m.month === month) || { month, count: 0, total: 0 };
  });
  const mobileMaxCount = Math.max(1, ...mobileMonthly.map((m) => m.count));
  const mobileMaxTotal = Math.max(1, ...mobileMonthly.map((m) => m.total));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats
        .filter((s) => s.label !== "월간")
        .map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{stat.label}</span>
              <span className="text-xs text-stone-500">
                {stat.count}건 · {stat.total.toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="mt-4 aspect-square w-full rounded-lg bg-stone-100 p-2">
              <div className="flex h-full items-end gap-3">
                <div className="flex w-1/2 flex-col items-center gap-1">
                  <div
                    className="w-full rounded bg-accent"
                    style={{
                      height: `${Math.min(
                        100,
                        (stat.count / Math.max(1, ...stats.map((s) => s.count))) * 100
                      )}%`,
                    }}
                  />
                  <span className="text-xs text-stone-500">건수</span>
                </div>
                <div className="flex w-1/2 flex-col items-center gap-1">
                  <div
                    className="w-full rounded bg-blue-500"
                    style={{
                      height: `${Math.min(
                        100,
                        (stat.total / Math.max(1, ...stats.map((s) => s.total))) * 100
                      )}%`,
                    }}
                  />
                  <span className="text-xs text-stone-500">금액</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 pb-2 md:col-span-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{currentYear}년 월별 주문현황</span>
          <span className="text-xs text-stone-500">건수(막대) · 금액(꺾은선)</span>
        </div>
        <div className="mt-3 w-full">
          <>
            <div className="hidden h-72 w-full md:block">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-full w-full">
            <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#f5f5f4" rx="16" />
            <text x="12" y="18" fontSize="12" fill="#78716c">
              금액(원)
            </text>
            {monthly.map((m, idx) => {
              const barWidth = chartInnerWidth / 12;
              const barGap = 10;
              const x = chartPaddingLeft + idx * barWidth + barGap;
              const usableWidth = barWidth - barGap * 2;
              const barHeight = (Math.min(m.count, maxMonthlyCount) / maxMonthlyCount) * chartPlotHeight;
              const y = chartBaseY - barHeight;
              return (
                <g key={m.month}>
                  <rect
                    x={x}
                    y={y}
                    width={usableWidth}
                    height={barHeight}
                    fill="#c35b3f"
                    rx="8"
                  />
                  <title>{`${m.month}월 · 건수 ${m.count}건 · 금액 ${m.total.toLocaleString("ko-KR")}`}</title>
                  <text
                    x={x + usableWidth / 2}
                    y={Math.min(chartBaseY - 5, y + 22)}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#ffffff"
                  >
                    {m.count}
                  </text>
                  <text
                    x={x + usableWidth / 2}
                    y={chartLabelY}
                    textAnchor="middle"
                    fontSize="16"
                    fill="#78716c"
                  >
                    {m.month}월
                  </text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const value = Math.round(maxMonthlyTotal * ratio);
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
              points={monthly
                .map((m, idx) => {
                  const x =
                    chartPaddingLeft +
                    idx * (chartInnerWidth / 12) +
                    (chartInnerWidth / 12) / 2;
                  const y = chartBaseY - (m.total / maxMonthlyTotal) * chartPlotHeight;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {monthly.map((m, idx) => {
              const x =
                chartPaddingLeft +
                idx * (chartInnerWidth / 12) +
                (chartInnerWidth / 12) / 2;
              const y = chartBaseY - (m.total / maxMonthlyTotal) * chartPlotHeight;
              return (
                <g key={`dot-${m.month}`}>
                  <circle cx={x} cy={y} r="6" fill="#3b82f6">
                    <title>{`${m.month}월 · 건수 ${m.count}건 · 금액 ${m.total.toLocaleString("ko-KR")}`}</title>
                  </circle>
                  <text x={x} y={Math.max(14, y - 10)} textAnchor="middle" fontSize="12" fill="#1d4ed8">
                    {m.total.toLocaleString("ko-KR")}
                  </text>
                </g>
              );
            })}
              </svg>
            </div>
            <div className="block h-72 w-full md:hidden">
              <svg viewBox={`0 0 ${mobileWidth} ${mobileHeight}`} className="h-full w-full">
            <rect x="0" y="0" width={mobileWidth} height={mobileHeight} fill="#f5f5f4" rx="16" />
            <text x="10" y="16" fontSize="10" fill="#78716c">
              금액(원)
            </text>
            {mobileMonthly.map((m, idx) => {
              const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
              const barWidth = innerWidth / mobileMonthly.length;
              const barGap = 6;
              const x = mobilePaddingLeft + idx * barWidth + barGap;
              const usableWidth = barWidth - barGap * 2;
              const barHeight = (Math.min(m.count, maxMonthlyCount) / maxMonthlyCount) * mobilePlotHeight;
              const y = mobileBaseY - barHeight;
              return (
                <g key={`m-${m.month}`}>
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
                    {m.count}
                  </text>
                  <text
                    x={x + usableWidth / 2}
                    y={mobileLabelY}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#78716c"
                  >
                    {m.month}월
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
              points={mobileMonthly
                .map((m, idx) => {
                  const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
                  const x =
                    mobilePaddingLeft +
                    idx * (innerWidth / mobileMonthly.length) +
                    (innerWidth / mobileMonthly.length) / 2;
                  const y = mobileBaseY - (m.total / mobileMaxTotal) * mobilePlotHeight;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {mobileMonthly.map((m, idx) => {
              const innerWidth = mobileWidth - mobilePaddingLeft - mobilePaddingRight;
              const x =
                mobilePaddingLeft +
                idx * (innerWidth / mobileMonthly.length) +
                (innerWidth / mobileMonthly.length) / 2;
              const y = mobileBaseY - (m.total / mobileMaxTotal) * mobilePlotHeight;
              return (
                <g key={`dot-mobile-${m.month}`}>
                  <circle cx={x} cy={y} r="4" fill="#3b82f6">
                    <title>{`${m.month}월 · 건수 ${m.count}건 · 금액 ${m.total.toLocaleString("ko-KR")}`}</title>
                  </circle>
                </g>
              );
            })}
              </svg>
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
