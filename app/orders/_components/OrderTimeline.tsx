"use client";

import type { OrderItem } from "../../../lib/types";

export type OrderEvent = {
  id: string;
  entity_type: "order" | "item";
  from_status: string | null;
  to_status: string;
  created_at: string;
  order_item_id: string | null;
  item_name?: string | null;
};

export default function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-stone-500">상태 변경 이력이 없습니다.</p>;
  }

  return (
    <ol className="divide-y divide-stone-200 border-t border-stone-200">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
          <p className="text-sm text-stone-700">
            <span className="font-semibold">
              {event.entity_type === "order"
                ? "주문 상태"
                : `메뉴 상태${event.item_name ? ` (${event.item_name})` : ""}`}
            </span>
            <span className="mx-2 text-stone-400">·</span>
            <span className="text-stone-500">
              {event.from_status ? `${event.from_status} → ` : ""}
              {event.to_status}
            </span>
          </p>
          <span className="text-xs text-stone-400">
            {new Date(event.created_at).toLocaleString("ko-KR")}
          </span>
        </li>
      ))}
    </ol>
  );
}
