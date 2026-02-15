"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function DailySales() {
  const [dailySales, setDailySales] = useState({ count: 0, total: 0 });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      const { data: today } = await supabase
        .from("orders")
        .select("total,created_at,status,order_items(qty)")
        .gte("created_at", dayStart.toISOString())
        .lt("created_at", dayEnd.toISOString())
        .not("status", "eq", "주문취소");
      if (!active) return;
      const totals = (today || []).reduce(
        (acc, row: { total: number; order_items?: { qty: number }[] }) => {
          acc.count += (row.order_items || []).reduce(
            (sum, item) => sum + (Number(item.qty) || 0),
            0,
          );
          acc.total += Number(row.total) || 0;
          return acc;
        },
        { count: 0, total: 0 },
      );
      setDailySales(totals);
    };

    load();
    const interval = window.setInterval(load, 3000);

    const channel = supabase
      .channel("admin-daily-sales")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">금일 매출</h2>
      </div>
      <div className="mt-4">
        <p className="text-base text-stone-700">
          주문 건수 : <span className="font-semibold">{dailySales.count}건</span> | 총 주문 금액 :{" "}
          <span className="font-semibold">{dailySales.total.toLocaleString("ko-KR")}원</span>
        </p>
      </div>
    </div>
  );
}
