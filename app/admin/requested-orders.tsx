"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import type { Order } from "../../lib/types";

export default function OrdersRequested() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,order_code,status,total,created_at,customer_name")
        .not("status", "in", "(완료,주문취소)")
        .order("created_at", { ascending: false })
        .limit(5);
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(완료,주문취소)");
      if (!active) return;
      setOrders((data as Order[]) || []);
      setTotalCount(count || 0);
    };
    load();
    const interval = window.setInterval(load, 3000);

    const channel = supabase
      .channel("admin-requested-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
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
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold">
            현재 주문 건수 (총 {totalCount}건)
          </h2>
        </div>
        <Link className="text-sm text-accent underline" href="/admin/orders">
          전체 보기
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {orders.length === 0 ? (
          <p className="text-stone-500">주문 내역이 없습니다.</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-xl bg-clay px-4 py-3"
            >
              <div>
                <Link
                  className="font-semibold text-accent underline"
                  href={`/admin/orders#${order.id}`}
                >
                  주문번호 {order.order_code || order.id}
                </Link>
                <p className="text-sm text-stone-500">
                  {order.customer_name
                    ? `주문자 ${order.customer_name} · `
                    : ""}
                  상태: {order.status}
                </p>
              </div>
              <span className="font-semibold">
                {Number(order.total).toLocaleString("ko-KR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
