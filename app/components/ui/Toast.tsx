"use client";

import { useEffect, useState } from "react";

export type ToastItem = {
  id: string;
  message: string;
  tone?: "default" | "success" | "warning";
};

export default function Toast({
  items,
  onRemove,
}: {
  items: ToastItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <ToastRow key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastRow({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => onRemove(item.id), 300);
      return () => clearTimeout(t);
    }
  }, [visible, item.id, onRemove]);

  return (
    <div
      className={`rounded-xl px-4 py-2 text-sm text-white shadow-soft transition duration-300 ${
        visible ? "opacity-100" : "opacity-0 translate-y-1"
      } ${toneClass(item.tone)}`}
    >
      {item.message}
    </div>
  );
}

function toneClass(tone?: "default" | "success" | "warning") {
  if (tone === "success") return "bg-emerald-600";
  if (tone === "warning") return "bg-amber-600";
  return "bg-ink";
}
