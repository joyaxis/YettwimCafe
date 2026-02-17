"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  is_hot: boolean;
  is_ice: boolean;
};

type DraftItem = {
  menuId: string;
  name: string;
  price: number;
  temp: "HOT" | "ICE";
  qty: number;
};

export default function OrderEntry() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [temp, setTemp] = useState<"HOT" | "ICE" | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id,name,price,is_hot,is_ice")
        .order("created_at", { ascending: true });
      setMenu((data as MenuItem[]) || []);
    };
    load();
  }, []);

  const selectedMenu = useMemo(
    () => menu.find((item) => item.id === selectedId) || null,
    [menu, selectedId],
  );

  useEffect(() => {
    if (!selectedMenu) {
      setTemp(null);
      return;
    }
    if (selectedMenu.is_hot && selectedMenu.is_ice) {
      setTemp("HOT");
      return;
    }
    if (selectedMenu.is_hot) {
      setTemp("HOT");
      return;
    }
    if (selectedMenu.is_ice) {
      setTemp("ICE");
      return;
    }
    setTemp(null);
  }, [selectedMenu]);

  const addItem = (amount: number) => {
    if (!selectedMenu) {
      setStatus("메뉴를 선택해주세요.");
      return false;
    }
    if (amount < 1) {
      setStatus("수량은 1 이상이어야 합니다.");
      return false;
    }
    if (!temp) {
      setStatus("온도 옵션을 선택해주세요.");
      return false;
    }
    if (temp === "HOT" && !selectedMenu.is_hot) {
      setStatus("HOT 옵션이 없는 메뉴입니다.");
      return false;
    }
    if (temp === "ICE" && !selectedMenu.is_ice) {
      setStatus("ICE 옵션이 없는 메뉴입니다.");
      return false;
    }
    setStatus(null);
    setItems((prev) => {
      const keyTemp = temp ?? "HOT";
      const index = prev.findIndex(
        (item) => item.menuId === selectedMenu.id && item.temp === keyTemp,
      );
      if (index === -1) {
        return [
          ...prev,
          {
            menuId: selectedMenu.id,
            name: `${selectedMenu.name} (${keyTemp})`,
            price: Number(selectedMenu.price),
            temp: keyTemp,
            qty: amount,
          },
        ];
      }
      return prev.map((item, i) =>
        i === index ? { ...item, qty: item.qty + amount } : item,
      );
    });
    return true;
  };

  const selectedQty = useMemo(() => {
    if (!selectedMenu || !temp) return 0;
    const found = items.find(
      (item) => item.menuId === selectedMenu.id && item.temp === temp
    );
    return found?.qty || 0;
  }, [items, selectedMenu, temp]);

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0,
  );

  const submitOrder = async () => {
    if (items.length === 0) {
      setStatus("주문할 메뉴를 추가해주세요.");
      return;
    }
    if (!customerName.trim()) {
      setStatus("주문자명을 입력해주세요.");
      return;
    }
    setStatus(null);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        status: "주문요청",
        subtotal: total,
        discount: 0,
        total,
        customer_name: customerName.trim() || "관리자 주문",
      })
      .select("id")
      .single();
    if (error || !order) {
      setStatus("주문 등록에 실패했습니다.");
      return;
    }
    const { error: itemError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        status: "주문요청",
      })),
    );
    if (itemError) {
      setStatus("주문 상세 저장에 실패했습니다.");
      return;
    }
    setItems([]);
    setSelectedId("");
    setCustomerName("");
    setStatus("주문이 등록되었습니다.");
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold">주문하기</h2>
      <div className="mt-4 grid gap-3">
        <div className="relative">
          <input
            className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-10"
            placeholder="주문자명 입력"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          {customerName && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400"
              onClick={() => setCustomerName("")}
              aria-label="입력 지우기"
              title="입력 지우기"
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="rounded-xl border border-stone-200 px-4 py-2"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">메뉴 선택</option>
          {menu.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          {!selectedMenu && (
            <>
              <button
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-400 opacity-60 cursor-not-allowed"
                disabled
              >
                HOT
              </button>
              <button
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-400 opacity-60 cursor-not-allowed"
                disabled
              >
                ICE
              </button>
            </>
          )}
          {selectedMenu?.is_hot && (
            <button
              className={`rounded-full border px-3 py-1.5 text-sm ${
                temp === "HOT"
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-stone-300 text-stone-600"
              }`}
              onClick={() => setTemp("HOT")}
            >
              HOT
            </button>
          )}
          {selectedMenu?.is_ice && (
            <button
              className={`rounded-full border px-3 py-1.5 text-sm ${
                temp === "ICE"
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-stone-300 text-stone-600"
              }`}
              onClick={() => setTemp("ICE")}
            >
              ICE
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              className="h-7 w-7 rounded-full bg-accent text-white"
              onClick={() => {
                if (!selectedMenu || !temp) return;
                setItems((prev) =>
                  prev
                    .map((p) =>
                      p.menuId === selectedMenu.id && p.temp === temp
                        ? { ...p, qty: p.qty - 1 }
                        : p
                    )
                    .filter((p) => p.qty > 0)
                );
              }}
            >
              -
            </button>
            <span className="w-6 text-center text-sm">{selectedQty}</span>
            <button
              className="h-7 w-7 rounded-full bg-accent text-white"
              onClick={() => {
                addItem(1);
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div>
          <h3 className="text-sm font-semibold text-stone-700">주문 메뉴</h3>
          <div className="mt-2 h-px w-full bg-stone-200" />
        </div>
        {items.length === 0 ? (
          <p className="text-stone-500">추가된 메뉴가 없습니다.</p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.menuId}-${index}`}
              className="grid items-center gap-3 md:grid-cols-[1fr_auto]"
            >
              <div className="flex items-center gap-2">
                <span>{item.name}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.temp === "HOT"
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {item.temp}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2 rounded-full border border-stone-200 px-2 py-1">
                  <button
                    className="h-6 w-6 rounded-full bg-accent text-white"
                    onClick={() =>
                      setItems((prev) =>
                        prev
                          .map((p, i) =>
                            i === index ? { ...p, qty: p.qty - 1 } : p,
                          )
                          .filter((p) => p.qty > 0),
                      )
                    }
                  >
                    -
                  </button>
                  <span className="w-6 text-center">{item.qty}</span>
                  <button
                    className="h-6 w-6 rounded-full bg-accent text-white"
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, qty: p.qty + 1 } : p,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
                <span className="w-16 text-right font-semibold">
                  {(item.price * item.qty).toLocaleString("ko-KR")}
                </span>
                <button
                  className="inline-flex h-6 w-6 items-center justify-center text-sm text-stone-500"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                  aria-label="삭제"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm font-semibold">
        <span>합계</span>
        <span>{total.toLocaleString("ko-KR")}</span>
      </div>

      <button
        className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-white"
        onClick={submitOrder}
      >
        주문 등록
      </button>
      {status && <p className="mt-3 text-sm text-accent">{status}</p>}
    </div>
  );
}
