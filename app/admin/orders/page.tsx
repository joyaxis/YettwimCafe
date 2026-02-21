"use client";

import { useEffect, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";
import type { Order, OrderItem } from "../../../lib/types";
import OrderTimeline, {
  type OrderEvent,
} from "../../orders/_components/OrderTimeline";

const ORDER_STATUSES: Order["status"][] = [
  "주문요청",
  "음료준비중",
  "완료",
  "주문취소",
];
const ITEM_STATUSES: OrderItem["status"][] = [
  "주문요청",
  "제조중",
  "제조완료",
  "취소",
];

type OrderWithItems = Order & { order_items: OrderItem[] };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [nameQuery, setNameQuery] = useState("");
  const [dateError, setDateError] = useState("");
  const [allPage, setAllPage] = useState(1);
  const [inProgressPage, setInProgressPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [canceledPage, setCanceledPage] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "all" | "inProgress" | "completed" | "canceled"
  >("all");
  const PAGE_SIZE = 10;
  const isInDateRange = (createdAt?: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const date = createdAt?.slice(0, 10);
    if (!date) return false;
    return (
      date >= (dateRange.from || "0000-00-00") &&
      date <= (dateRange.to || "9999-12-31")
    );
  };
  const allOrders = orders
    .filter(
      (order) =>
        isInDateRange(order.created_at) &&
        (!nameQuery ||
          (order.customer_name || "")
            .toLowerCase()
            .includes(nameQuery.toLowerCase())),
    )
    .slice()
    .sort(
      (a, b) => (b.created_at || "").localeCompare(a.created_at || ""),
    );
  const inProgressOrders = allOrders
    .filter(
      (order) =>
        order.status !== "완료" && order.status !== "주문취소",
    )
    .slice()
    .sort(
      (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    );
  const completedOrders = allOrders
    .filter(
      (order) =>
        order.status === "완료",
    )
    .slice()
    .sort(
      (a, b) => (b.created_at || "").localeCompare(a.created_at || ""),
    );
  const canceledOrders = allOrders
    .filter(
      (order) =>
        order.status === "주문취소",
    )
    .slice()
    .sort(
      (a, b) => (b.created_at || "").localeCompare(a.created_at || ""),
    );
  const allTotalPages = Math.max(1, Math.ceil(allOrders.length / PAGE_SIZE));
  const inProgressTotalPages = Math.max(
    1,
    Math.ceil(inProgressOrders.length / PAGE_SIZE),
  );
  const completedTotalPages = Math.max(
    1,
    Math.ceil(completedOrders.length / PAGE_SIZE),
  );
  const canceledTotalPages = Math.max(
    1,
    Math.ceil(canceledOrders.length / PAGE_SIZE),
  );
  const pagedAllOrders = allOrders.slice(
    (allPage - 1) * PAGE_SIZE,
    allPage * PAGE_SIZE,
  );
  const pagedInProgressOrders = inProgressOrders.slice(
    (inProgressPage - 1) * PAGE_SIZE,
    inProgressPage * PAGE_SIZE,
  );
  const pagedCompletedOrders = completedOrders.slice(
    (completedPage - 1) * PAGE_SIZE,
    completedPage * PAGE_SIZE,
  );
  const pagedCanceledOrders = canceledOrders.slice(
    (canceledPage - 1) * PAGE_SIZE,
    canceledPage * PAGE_SIZE,
  );

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_code,status,subtotal,discount,total,pickup_time,note,created_at,customer_name,order_items(id,order_id,menu_item_id,name,qty,price,status,recipe)",
      )
      .order("created_at", { ascending: true });
    setOrders((data as OrderWithItems[]) || []);
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 3000);
    const channel = supabase
      .channel("admin-orders")
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
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      setDateError("조회 시작일이 종료일보다 빠르거나 같아야 합니다.");
    } else {
      setDateError("");
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    setAllPage(1);
    setInProgressPage(1);
    setCompletedPage(1);
    setCanceledPage(1);
  }, [dateRange.from, dateRange.to, nameQuery]);

  const updateOrderStatus = async (
    id: string,
    status: Order["status"],
    fromStatus: Order["status"],
  ) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    await supabase.from("order_status_events").insert({
      order_id: id,
      entity_type: "order",
      from_status: fromStatus,
      to_status: status,
    });

    if (status === "완료") {
      await supabase
        .from("order_items")
        .update({ status: "제조완료" })
        .eq("order_id", id);
      await supabase.from("order_status_events").insert({
        order_id: id,
        entity_type: "item",
        from_status: "제조중",
        to_status: "제조완료",
      });
    }
    if (status === "음료준비중") {
      await supabase
        .from("order_items")
        .update({ status: "제조중" })
        .eq("order_id", id);
      await supabase.from("order_status_events").insert({
        order_id: id,
        entity_type: "item",
        from_status: "주문요청",
        to_status: "제조중",
      });
    }
    if (status === "주문취소") {
      await supabase
        .from("order_items")
        .update({ status: "취소" })
        .eq("order_id", id);
      await supabase.from("order_status_events").insert({
        order_id: id,
        entity_type: "item",
        from_status: "제조중",
        to_status: "취소",
      });
    }

    await load();
  };

  const updateItemStatus = async (
    id: string,
    status: OrderItem["status"],
    fromStatus: OrderItem["status"],
    orderId: string,
  ) => {
    await supabase.from("order_items").update({ status }).eq("id", id);
    await supabase.from("order_status_events").insert({
      order_id: orderId,
      order_item_id: id,
      entity_type: "item",
      from_status: fromStatus,
      to_status: status,
    });
    await load();
  };

  return (
    <AdminGate>
      <div className="space-y-6">
        <div className="bg-white md:flex md:justify-end">
          <div className="grid gap-2 md:hidden">
            <span className="text-sm text-stone-500">조회 날짜</span>
            <div className="flex items-center gap-2 px-2">
              <div className="relative">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, from: e.target.value })
                  }
                  className="w-[140px] rounded-full border border-stone-200 px-2 py-1 pr-3 text-xs"
                />
              </div>
              <span className="text-stone-400">~</span>
              <div className="relative">
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, to: e.target.value })
                  }
                  className="w-[140px] rounded-full border border-stone-200 px-2 py-1 pr-3 text-xs"
                />
              </div>
            </div>
            <span className="text-sm text-stone-500">주문자명</span>
            <div className="relative w-full px-2">
              <input
                type="text"
                placeholder="주문자명 검색"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="w-full border-b border-stone-300 bg-transparent px-1 py-2 pr-8 text-sm focus:border-stone-500 focus:outline-none"
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
            {dateError && (
              <p className="px-2 text-xs text-red-500">{dateError}</p>
            )}
          </div>
          <div className="hidden items-center justify-end gap-3 md:flex md:flex-wrap">
            <span className="text-sm text-stone-500">조회 날짜</span>
            <div className="relative">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="rounded-full border border-stone-200 px-3 py-2 pr-3 text-sm"
              />
            </div>
            <span className="text-stone-400">~</span>
            <div className="relative">
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="rounded-full border border-stone-200 px-3 py-2 pr-3 text-sm"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="주문자명 검색"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="border-b border-stone-300 bg-transparent px-1 py-2 pr-8 text-sm focus:border-stone-500 focus:outline-none"
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
            {dateError && (
              <p className="text-xs text-red-500">{dateError}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-b border-stone-200 text-sm">
          {[
            { key: "all", label: `전체 (${allOrders.length})` },
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
                setActiveTab(
                  tab.key as "all" | "inProgress" | "completed" | "canceled",
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "all" && (
          <>
            {allOrders.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <p>주문 내역이 없습니다.</p>
              </div>
            ) : (
              pagedAllOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-2xl border border-stone-200 p-6 ${
                    order.status === "완료" || order.status === "주문취소"
                      ? "bg-stone-100"
                      : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          주문번호 {order.order_code || order.id}
                        </h3>
                        {(order.status === "완료" ||
                          order.status === "주문취소") && (
                          <button
                            className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600"
                            onClick={async () => {
                              if (!confirm("삭제하시겠습니까?")) return;
                              await supabase
                                .from("orders")
                                .delete()
                                .eq("id", order.id);
                              window.location.reload();
                              await load();
                            }}
                          >
                            주문 삭제
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">
                        {order.customer_name
                          ? `주문자 ${order.customer_name} · `
                          : ""}
                        총 결제 {Number(order.total).toLocaleString("ko-KR")} ·
                        주문 일시{" "}
                        {order.created_at
                          ? new Date(order.created_at)
                              .toLocaleString("sv-SE")
                              .replace(" ", " ")
                          : "-"}
                      </p>
                    </div>
                    <select
                      className="rounded-xl border border-stone-200 px-3 py-2"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as Order["status"],
                          order.status,
                        )
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <OrderItemsPanel
                    items={order.order_items || []}
                    orderId={order.id}
                    defaultOpen={
                      order.status !== "완료" && order.status !== "주문취소"
                    }
                    onUpdate={updateItemStatus}
                  />
                </div>
              ))
            )}
            {allOrders.length > PAGE_SIZE && (
              <Pagination
                current={allPage}
                total={allTotalPages}
                onChange={setAllPage}
              />
            )}
          </>
        )}

        {activeTab === "inProgress" && (
          <>
            {inProgressOrders.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <p>진행 중인 주문이 없습니다.</p>
              </div>
            ) : (
              pagedInProgressOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-2xl border border-stone-200 p-6 ${
                    order.status === "완료" || order.status === "주문취소"
                      ? "bg-stone-100"
                      : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          주문번호 {order.order_code || order.id}
                        </h3>
                        {(order.status === "완료" ||
                          order.status === "주문취소") && (
                          <button
                            className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600"
                            onClick={async () => {
                              if (!confirm("삭제하시겠습니까?")) return;
                              await supabase
                                .from("orders")
                                .delete()
                                .eq("id", order.id);
                              window.location.reload();
                              await load();
                            }}
                          >
                            주문 삭제
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">
                        {order.customer_name
                          ? `주문자 ${order.customer_name} · `
                          : ""}
                        총 결제 {Number(order.total).toLocaleString("ko-KR")} ·
                        주문 일시{" "}
                        {order.created_at
                          ? new Date(order.created_at)
                              .toLocaleString("sv-SE")
                              .replace(" ", " ")
                          : "-"}
                      </p>
                    </div>
                    <select
                      className="rounded-xl border border-stone-200 px-3 py-2"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as Order["status"],
                          order.status,
                        )
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <OrderItemsPanel
                    items={order.order_items || []}
                    orderId={order.id}
                    defaultOpen={
                      order.status !== "완료" && order.status !== "주문취소"
                    }
                    onUpdate={updateItemStatus}
                  />
                </div>
              ))
            )}
            {inProgressOrders.length > PAGE_SIZE && (
              <Pagination
                current={inProgressPage}
                total={inProgressTotalPages}
                onChange={setInProgressPage}
              />
            )}
          </>
        )}

        {activeTab === "completed" && (
          <>
            {completedOrders.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <p>주문 내역이 없습니다.</p>
              </div>
            ) : (
              pagedCompletedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-2xl border border-stone-200 p-6 ${
                    order.status === "완료" || order.status === "주문취소"
                      ? "bg-stone-100"
                      : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          주문번호 {order.order_code || order.id}
                        </h3>
                        {(order.status === "완료" ||
                          order.status === "주문취소") && (
                          <button
                            className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600"
                            onClick={async () => {
                              if (!confirm("삭제하시겠습니까?")) return;
                              await supabase
                                .from("orders")
                                .delete()
                                .eq("id", order.id);
                              window.location.reload();
                              await load();
                            }}
                          >
                            주문 삭제
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">
                        {order.customer_name
                          ? `주문자 ${order.customer_name} · `
                          : ""}
                        총 결제 {Number(order.total).toLocaleString("ko-KR")} ·
                        주문 일시{" "}
                        {order.created_at
                          ? new Date(order.created_at)
                              .toLocaleString("sv-SE")
                              .replace(" ", " ")
                          : "-"}
                      </p>
                    </div>
                    <select
                      className="rounded-xl border border-stone-200 px-3 py-2"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as Order["status"],
                          order.status,
                        )
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <OrderItemsPanel
                    items={order.order_items || []}
                    orderId={order.id}
                    defaultOpen={
                      order.status !== "완료" && order.status !== "주문취소"
                    }
                    onUpdate={updateItemStatus}
                  />
                </div>
              ))
            )}
            {completedOrders.length > PAGE_SIZE && (
              <Pagination
                current={completedPage}
                total={completedTotalPages}
                onChange={setCompletedPage}
              />
            )}
          </>
        )}

        {activeTab === "canceled" && (
          <>
            {canceledOrders.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6">
                <p>주문 내역이 없습니다.</p>
              </div>
            ) : (
              pagedCanceledOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-2xl border border-stone-200 p-6 ${
                    order.status === "완료" || order.status === "주문취소"
                      ? "bg-stone-100"
                      : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          주문번호 {order.order_code || order.id}
                        </h3>
                        {(order.status === "완료" ||
                          order.status === "주문취소") && (
                          <button
                            className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-600"
                            onClick={async () => {
                              if (!confirm("삭제하시겠습니까?")) return;
                              await supabase
                                .from("orders")
                                .delete()
                                .eq("id", order.id);
                              window.location.reload();
                              await load();
                            }}
                          >
                            주문 삭제
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">
                        {order.customer_name
                          ? `주문자 ${order.customer_name} · `
                          : ""}
                        총 결제 {Number(order.total).toLocaleString("ko-KR")} ·
                        주문 일시{" "}
                        {order.created_at
                          ? new Date(order.created_at)
                              .toLocaleString("sv-SE")
                              .replace(" ", " ")
                          : "-"}
                      </p>
                    </div>
                    <select
                      className="rounded-xl border border-stone-200 px-3 py-2"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as Order["status"],
                          order.status,
                        )
                      }
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <OrderItemsPanel
                    items={order.order_items || []}
                    orderId={order.id}
                    defaultOpen={
                      order.status !== "완료" && order.status !== "주문취소"
                    }
                    onUpdate={updateItemStatus}
                  />
                </div>
              ))
            )}
            {canceledOrders.length > PAGE_SIZE && (
              <Pagination
                current={canceledPage}
                total={canceledTotalPages}
                onChange={setCanceledPage}
              />
            )}
          </>
        )}

      </div>
    </AdminGate>
  );
}

function OrderTimelineAdmin({
  orderId,
  items,
  defaultOpen,
}: {
  orderId: string;
  items: OrderItem[];
  defaultOpen: boolean;
}) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("order_status_events")
        .select("id,entity_type,from_status,to_status,created_at,order_item_id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (!active) return;
      setEvents((data as OrderEvent[]) || []);
    };
    load();

    const channel = supabase
      .channel(`admin-order-events-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_status_events",
          filter: `order_id=eq.${orderId}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-clay p-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <h4 className="text-sm font-semibold">상태 변경 이력</h4>
        <span className="text-xs text-stone-500">
          {open ? "접기" : "펼치기"}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <OrderTimeline
            events={events.map((event) => ({
              ...event,
              item_name:
                items.find((item) => item.id === event.order_item_id)?.name ||
                null,
            }))}
          />
        </div>
      )}
    </div>
  );
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

function OrderItemsPanel({
  items,
  orderId,
  defaultOpen,
  onUpdate,
}: {
  items: OrderItem[];
  orderId: string;
  defaultOpen: boolean;
  onUpdate: (
    id: string,
    status: OrderItem["status"],
    fromStatus: OrderItem["status"],
    orderId: string,
  ) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <h4 className="text-sm font-semibold">주문 메뉴 ({items.length}건)</h4>
        <span className="text-xs text-stone-500">
          {open ? "접기" : "펼치기"}
        </span>
      </button>
      {open && (
        <div className="mt-3 divide-y divide-stone-200 border-t border-stone-200">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-stone-500">
                  {Number(item.price).toLocaleString("ko-KR")} × {item.qty}
                </p>
                {item.recipe && (
                  <div className="mt-1 text-sm text-stone-500">
                    레시피: {item.recipe}
                  </div>
                )}
              </div>
              <select
                className="rounded-xl border border-stone-200 px-3 py-2"
                value={item.status}
                onChange={(e) =>
                  onUpdate(
                    item.id,
                    e.target.value as OrderItem["status"],
                    item.status,
                    orderId,
                  )
                }
              >
                {ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
