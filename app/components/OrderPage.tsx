"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PwaClient from "./PwaClient";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import type { MenuItem } from "../../lib/types";
import Toast from "./ui/Toast";

const ORDER_STATUS = ["주문요청", "음료준비중", "완료", "주문취소"] as const;

type LocalOrder = {
  id: string;
  order_code?: string | null;
  status: (typeof ORDER_STATUS)[number];
  total: number;
  created_at: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const LOCAL_ORDER_KEY = "cafe_local_orders_v1";
const CUSTOMER_NAME_KEY = "cafe_customer_name_v1";
const CUSTOMER_LOGIN_TIME_KEY = "cafe_customer_login_time_v1";

function loadLocalOrders(): LocalOrder[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_ORDER_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: LocalOrder[]) {
  localStorage.setItem(LOCAL_ORDER_KEY, JSON.stringify(orders));
}

export default function OrderPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [featured, setFeatured] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<
    Record<string, { HOT: number; ICE: number }>
  >({});
  const [status, setStatus] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>("12:30");
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [toasts, setToasts] = useState<
    { id: string; message: string; tone?: "default" | "success" | "warning" }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [featuredKey, setFeaturedKey] = useState<string>("");
  const [tempById, setTempById] = useState<Record<string, "HOT" | "ICE">>({});
  const [orderOpen, setOrderOpen] = useState(true);
  const lastOrderStatuses = useRef<Record<string, LocalOrder["status"]>>({});
  const initialOrdersLoaded = useRef(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(true);
  const [customerName, setCustomerName] = useState<string>("");
  const [copyNotice, setCopyNotice] = useState<string>("");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [loginTime, setLoginTime] = useState<string>("");
  const router = useRouter();
  const { todayOrders, todayLabel } = useMemo(() => {
    const now = new Date();
    const todayKey = now.toLocaleDateString("sv-SE");
    const todayLabel = `${now.getMonth() + 1}/${now.getDate()}`;
    const todayOrders = localOrders.filter((order) => {
      if (!order.created_at) return false;
      const localDate = new Date(order.created_at).toLocaleDateString("sv-SE");
      return localDate === todayKey;
    });
    return { todayOrders, todayLabel };
  }, [localOrders]);

  const pushToast = (
    message: string,
    tone: "default" | "success" | "warning" = "default",
  ) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message, tone }]);
  };

  useEffect(() => {
    setLocalOrders(loadLocalOrders());
    const storedName = localStorage.getItem(CUSTOMER_NAME_KEY) || "";
    const storedTime = localStorage.getItem(CUSTOMER_LOGIN_TIME_KEY) || "";
    if (!storedName) {
      router.replace("/customer/login");
      return;
    }
    setCustomerName(storedName);
    setLoginTime(storedTime);
  }, [router]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: number | null = null;
    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      await supabase.auth.signInAnonymously();
    };
    const loadOrders = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!customerName) return;
      if (!sessionData.session) return;
      const { data } = await supabase
        .from("orders")
        .select("id,order_code,status,total,created_at")
        .eq("customer_name", customerName)
        .order("created_at", { ascending: false });
      if (!active) return;
      const orders = (data as LocalOrder[]) || [];
      if (initialOrdersLoaded.current) {
        orders.forEach((order) => {
          const prev = lastOrderStatuses.current[order.id];
          if (prev && prev !== order.status) {
            const code = order.order_code || order.id;
            pushToast(`${code} 주문 상태 변경 : "${order.status}"`, "success");
          }
        });
      }
      lastOrderStatuses.current = orders.reduce<
        Record<string, LocalOrder["status"]>
      >((acc, order) => {
        acc[order.id] = order.status;
        return acc;
      }, {});
      initialOrdersLoaded.current = true;
      setLocalOrders(orders);
      saveLocalOrders(orders);
    };
    ensureSession().finally(async () => {
      if (!active) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || !customerName) return;
      await loadOrders();
      interval = window.setInterval(loadOrders, 3000);

      const channelKey = customerName.replace(/\s+/g, "_");
      channel = supabase
        .channel(`orders-${channelKey}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `customer_name=eq.${customerName}`,
          },
          () => loadOrders(),
        )
        .subscribe();
    });
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [customerName]);

  useEffect(() => {
    let active = true;
    supabase
      .from("menu_items")
      .select(
        "id,name,description,price,category,image_url,recipe,is_hidden,is_hot,is_ice",
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const visible = ((data as MenuItem[]) || []).filter(
          (item) => !item.is_hidden,
        );
        setMenu(visible);
        if (visible.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const stored = localStorage.getItem("featured_menu_v1");
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { date: string; id: string };
              if (parsed.date === today) {
                const hit = visible.find((item) => item.id === parsed.id);
                if (hit) {
                  setFeatured(hit);
                  setFeaturedKey(parsed.id);
                  return;
                }
              }
            } catch {
              // ignore parse error
            }
          }
          const pick = visible[Math.floor(Math.random() * visible.length)];
          setFeatured(pick);
          setFeaturedKey(pick.id);
          localStorage.setItem(
            "featured_menu_v1",
            JSON.stringify({ date: today, id: pick.id }),
          );
        }
      });
    supabase
      .from("categories")
      .select("name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setCategoryOrder(
          (data || []).map((item: { name: string }) => item.name),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menu.map((item) => item.category || "기타"));
    const ordered = categoryOrder.filter((name) => set.has(name));
    const rest = Array.from(set)
      .filter((name) => !ordered.includes(name))
      .sort((a, b) => a.localeCompare(b));
    return ["전체", ...ordered, ...rest];
  }, [menu, categoryOrder]);

  const filteredMenu = useMemo(() => {
    if (activeCategory === "전체") return menu;
    return menu.filter((item) => (item.category || "기타") === activeCategory);
  }, [menu, activeCategory]);

  const totals = useMemo(() => {
    const subtotal = menu.reduce((sum, item) => {
      const qty = (cart[item.id]?.HOT || 0) + (cart[item.id]?.ICE || 0);
      return sum + qty * Number(item.price || 0);
    }, 0);
    const discount = 0;
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }, [cart, menu]);

  const hasCartItems = useMemo(
    () =>
      menu.some(
        (item) => (cart[item.id]?.HOT || 0) + (cart[item.id]?.ICE || 0) > 0,
      ),
    [cart, menu],
  );

  const getSelectedTemp = (item: MenuItem) => {
    const preferred =
      tempById[item.id] ?? (item.is_hot ? "HOT" : item.is_ice ? "ICE" : null);
    if (preferred === "HOT" && item.is_hot) return "HOT";
    if (preferred === "ICE" && item.is_ice) return "ICE";
    if (item.is_hot) return "HOT";
    if (item.is_ice) return "ICE";
    return null;
  };

  const updateQty = (
    item: MenuItem,
    diff: number,
    forcedTemp?: "HOT" | "ICE",
  ) => {
    const temp = forcedTemp ?? getSelectedTemp(item);
    if (!temp) return;
    setCart((prev) => {
      const current = prev[item.id] || { HOT: 0, ICE: 0 };
      const nextValue = Math.max(0, current[temp] + diff);
      return {
        ...prev,
        [item.id]: { ...current, [temp]: nextValue },
      };
    });
  };

  const handleOrder = async () => {
    if (!totals.total) {
      setStatus("메뉴를 선택한 뒤 주문하세요.");
      return;
    }

    const storedName = localStorage.getItem(CUSTOMER_NAME_KEY);
    if (!storedName) {
      setStatus("주문자명을 먼저 입력해주세요.");
      router.replace("/customer/login");
      return;
    }

    let session = await supabase.auth.getSession();
    if (!session.data.session) {
      await supabase.auth.signInAnonymously();
      session = await supabase.auth.getSession();
    }
    const customerToken = session.data.session?.user?.id;
    if (!customerToken) {
      setStatus("로그인 세션이 없습니다. 새로고침 후 다시 시도하세요.");
      return;
    }

    const items = menu.flatMap((item) => {
      const hotQty = cart[item.id]?.HOT || 0;
      const iceQty = cart[item.id]?.ICE || 0;
      const result = [];
      if (hotQty > 0) {
        result.push({
          menu_item_id: item.id,
          name: `${item.name} (HOT)`,
          qty: hotQty,
          price: item.price,
          status: "주문요청",
          recipe: item.recipe,
        });
      }
      if (iceQty > 0) {
        result.push({
          menu_item_id: item.id,
          name: `${item.name} (ICE)`,
          qty: iceQty,
          price: item.price,
          status: "주문요청",
          recipe: item.recipe,
        });
      }
      return result;
    });

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        status: "주문요청",
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        pickup_time: pickupTime,
        customer_name: storedName,
        customer_token: customerToken,
      })
      .select("id,order_code,status,total,created_at")
      .single();

    if (error || !order) {
      setStatus("주문 등록에 실패했습니다.");
      return;
    }

    const { error: itemError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        ...item,
      })),
    );

    if (itemError) {
      setStatus("주문 상세 저장에 실패했습니다.");
      return;
    }

    const nextOrders = [
      {
        id: order.id,
        order_code: order.order_code,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
      },
      ...localOrders,
    ];
    setLocalOrders(nextOrders);
    saveLocalOrders(nextOrders);
    setCart({});
    setTempById({});
    setStatus("");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <PwaClient />
      <div className="flex items-center justify-between -mt-6 text-xs text-stone-500">
        <button
          className="text-accent underline"
          onClick={async () => {
            const isStandalone =
              window.matchMedia("(display-mode: standalone)").matches ||
              (window.navigator as { standalone?: boolean }).standalone ===
                true;
            if (isStandalone) return;
            if (installPrompt) {
              await installPrompt.prompt();
              setInstallPrompt(null);
              return;
            }
            const ua = navigator.userAgent.toLowerCase();
            if (
              ua.includes("iphone") ||
              ua.includes("ipad") ||
              ua.includes("ipod")
            ) {
              setShowIosInstall(true);
              return;
            }
            alert("브라우저 메뉴에서 '홈 화면에 추가'를 선택하세요.");
          }}
        >
          홈 화면에 추가
        </button>
        <div className="flex items-center">
          {customerName && <span>{customerName}님 반갑습니다</span>}
          <span className="mx-2">|</span>
          <button
            className="underline"
            onClick={async () => {
              localStorage.removeItem(CUSTOMER_NAME_KEY);
              localStorage.removeItem(CUSTOMER_LOGIN_TIME_KEY);
              setCustomerName("");
              setLoginTime("");
              await supabase.auth.signOut();
              router.replace("/customer/login");
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
      <header className="grid gap-6 rounded-3xl bg-clay p-6 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
            COFFEE THE DREAM
          </p>
          <h1 className="mt-3 text-4xl font-semibold">메뉴 주문</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="rounded-full bg-accent px-5 py-2 text-white shadow-soft"
              href="#menu"
            >
              메뉴 보기
            </a>
            <a
              className="rounded-full border border-accent px-5 py-2 text-accent"
              href="/orders"
            >
              주문 내역 ({localOrders.length}건)
            </a>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-4">
          <p className="text-sm text-stone-500">오늘의 추천</p>
          <h2 className="mt-3 text-xl font-semibold">
            {featured?.name || "추천 메뉴 없음"}
          </h2>
          <p className="text-stone-500">
            {featured?.description || "등록된 메뉴가 없습니다."}
          </p>
        </div>
      </header>

      <div className="grid gap-10">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {todayLabel} 주문 내역 ({todayOrders.length}건)
                </h3>
                <button
                  className="text-sm text-accent"
                  onClick={() => setMyOrdersOpen((prev) => !prev)}
                >
                  {myOrdersOpen ? "접기" : "펼치기"}
                </button>
              </div>
              <p className="text-sm text-stone-500">
                오늘 주문한 내역만 표시됩니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a className="text-sm text-accent underline" href="/orders">
                상세 내역
              </a>
            </div>
          </div>
          {myOrdersOpen && (
            <div className="mt-4 space-y-3">
              {todayOrders.length === 0 ? (
                <p className="text-stone-500">아직 주문 내역이 없습니다.</p>
              ) : (
                todayOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-clay px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        className="font-semibold text-accent underline"
                        href={`/orders/${order.id}`}
                      >
                        {order.order_code || order.id}
                      </a>
                      <StatusBadge status={order.status} />
                    </div>
                    <span className="font-semibold">
                      {Number(order.total).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
        <section id="menu" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className={`rounded-full border px-4 py-2 text-sm ${
                  activeCategory === category
                    ? "border-accent bg-accent text-white"
                    : "border-stone-300 text-stone-600"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {Object.entries(
            filteredMenu.reduce<Record<string, MenuItem[]>>((acc, item) => {
              const key = item.category || "기타";
              acc[key] ||= [];
              acc[key].push(item);
              return acc;
            }, {}),
          )
            .sort(([a], [b]) => {
              const aIndex = categories.indexOf(a);
              const bIndex = categories.indexOf(b);
              if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            })
            .map(([category, items]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-lg font-semibold">{category}</h3>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="flex h-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      <h4 className="mt-1 text-lg font-semibold">
                        {item.name}
                      </h4>
                      <p className="min-h-[3.5rem] flex-1 text-sm text-stone-500">
                        {item.description}
                      </p>
                      <div className="space-y-3">
                        <span className="block text-right text-lg font-semibold">
                          {Number(item.price).toLocaleString("ko-KR")}
                        </span>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          {(item.is_hot || item.is_ice) && (
                            <div className="flex items-center gap-2 text-sm text-stone-500">
                              {item.is_hot && (
                                <button
                                  className={`rounded-full border px-3.5 py-1.5 ${
                                    getSelectedTemp(item) === "HOT"
                                      ? "border-red-500 bg-red-500 text-white"
                                      : "border-stone-300"
                                  }`}
                                  onClick={() =>
                                    setTempById((prev) => ({
                                      ...prev,
                                      [item.id]: "HOT",
                                    }))
                                  }
                                >
                                  HOT
                                </button>
                              )}
                              {item.is_ice && (
                                <button
                                  className={`rounded-full border px-3.5 py-1.5 ${
                                    getSelectedTemp(item) === "ICE"
                                      ? "border-blue-500 bg-blue-500 text-white"
                                      : "border-stone-300"
                                  }`}
                                  onClick={() =>
                                    setTempById((prev) => ({
                                      ...prev,
                                      [item.id]: "ICE",
                                    }))
                                  }
                                >
                                  ICE
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex w-full items-center justify-between rounded-full border border-stone-200 px-2 py-1 md:w-auto md:justify-center md:gap-3">
                            <button
                              className="h-7 w-7 rounded-full bg-accent text-white"
                              onClick={() => updateQty(item, -1)}
                            >
                              -
                            </button>
                            <span className="w-6 text-center">
                              {(cart[item.id]?.HOT || 0) +
                                (cart[item.id]?.ICE || 0)}
                            </span>
                            <button
                              className="h-7 w-7 rounded-full bg-accent text-white"
                              onClick={() => updateQty(item, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
        </section>

        {hasCartItems && (
          <aside
            id="order"
            className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:bottom-6 md:right-6 md:left-auto md:w-[420px] lg:w-[460px] transition-all duration-300 ease-out ${
              orderOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-90"
            }`}
          >
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setOrderOpen((prev) => !prev)}
              >
                <span className="text-lg font-semibold">주문 메뉴</span>
                <span className="text-sm text-stone-500">
                  {orderOpen ? "접기" : "펼치기"}
                </span>
              </button>
              <div className="mt-3 h-px w-full bg-stone-200" />
              {orderOpen && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <button
                      className="text-sm text-accent"
                      onClick={() => {
                        if (
                          window.confirm("담은 메뉴를 모두 비우시겠습니까?")
                        ) {
                          setCart({});
                        }
                      }}
                    >
                      비우기
                    </button>
                  </div>
                  <div className="space-y-3">
                    {menu.filter(
                      (item) =>
                        (cart[item.id]?.HOT || 0) + (cart[item.id]?.ICE || 0) >
                        0,
                    ).length === 0 ? (
                      <p className="text-stone-500">
                        아직 담긴 메뉴가 없습니다.
                      </p>
                    ) : (
                      menu.flatMap((item) => {
                        const rows = [];
                        const hotQty = cart[item.id]?.HOT || 0;
                        const iceQty = cart[item.id]?.ICE || 0;
                        if (hotQty > 0) {
                          rows.push(
                            <div
                              key={`${item.id}-hot`}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold">
                                  {item.name}
                                  <span className="ml-2 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">
                                    HOT
                                  </span>
                                </p>
                                <p className="text-sm text-stone-500">
                                  {Number(item.price).toLocaleString("ko-KR")} ×{" "}
                                  {hotQty}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-semibold">
                                  {(Number(item.price) * hotQty).toLocaleString(
                                    "ko-KR",
                                  )}
                                </span>
                                <div className="flex items-center gap-2 rounded-full border border-stone-200 px-2 py-1">
                                  <button
                                    className="h-6 w-6 rounded-full bg-accent text-white"
                                    onClick={() => updateQty(item, -1, "HOT")}
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center">
                                    {hotQty}
                                  </span>
                                  <button
                                    className="h-6 w-6 rounded-full bg-accent text-white"
                                    onClick={() => {
                                      setTempById((prev) => ({
                                        ...prev,
                                        [item.id]: "HOT",
                                      }));
                                      updateQty(item, 1, "HOT");
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>,
                          );
                        }
                        if (iceQty > 0) {
                          rows.push(
                            <div
                              key={`${item.id}-ice`}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold">
                                  {item.name}
                                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                                    ICE
                                  </span>
                                </p>
                                <p className="text-sm text-stone-500">
                                  {Number(item.price).toLocaleString("ko-KR")} ×{" "}
                                  {iceQty}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-semibold">
                                  {(Number(item.price) * iceQty).toLocaleString(
                                    "ko-KR",
                                  )}
                                </span>
                                <div className="flex items-center gap-2 rounded-full border border-stone-200 px-2 py-1">
                                  <button
                                    className="h-6 w-6 rounded-full bg-accent text-white"
                                    onClick={() => {
                                      setTempById((prev) => ({
                                        ...prev,
                                        [item.id]: "ICE",
                                      }));
                                      updateQty(item, -1, "ICE");
                                    }}
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center">
                                    {iceQty}
                                  </span>
                                  <button
                                    className="h-6 w-6 rounded-full bg-accent text-white"
                                    onClick={() => {
                                      setTempById((prev) => ({
                                        ...prev,
                                        [item.id]: "ICE",
                                      }));
                                      updateQty(item, 1, "ICE");
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>,
                          );
                        }
                        return rows;
                      })
                    )}
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <h3 className="text-lg font-semibold">결제 정보</h3>
                    <div className="mt-4 space-y-2 text-stone-600">
                      <div className="flex items-center justify-between">
                        <span>소계</span>
                        <span>{totals.subtotal.toLocaleString("ko-KR")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>할인</span>
                        <span>{totals.discount.toLocaleString("ko-KR")}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-semibold text-ink">
                        <span>총 결제 금액</span>
                        <span>{totals.total.toLocaleString("ko-KR")}</span>
                      </div>
                      <div className="h-[2px]" />
                      <div className="bg-clay px-4 py-3 text-center text-stone-600">
                        계좌이체 : 카카오뱅크 3333311427151 (이주희)
                        <button
                          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 text-sm text-stone-600"
                          aria-label="계좌번호 복사"
                          title="계좌번호 복사하기"
                          onClick={() => {
                            navigator.clipboard.writeText("3333311427151");
                            setCopyNotice("복사되었습니다.");
                            window.setTimeout(() => setCopyNotice(""), 2000);
                          }}
                        >
                          ⧉
                        </button>
                        {copyNotice && (
                          <span className="ml-2 text-xs text-stone-500">
                            {copyNotice}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="mt-[20px] w-full rounded-full bg-accent px-4 py-3 text-white shadow-soft"
                      onClick={handleOrder}
                    >
                      주문 완료
                    </button>
                    {status && (
                      <p className="mt-3 text-sm text-accent">{status}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <Toast
        items={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      {showIosInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-soft">
            <h3 className="text-lg font-semibold">iOS에서 홈 화면에 추가</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-600">
              <li>하단의 “⋯” 버튼(더보기)을 누르세요.</li>
              <li>목록에서 “공유”를 선택하세요.</li>
              <li>공유 메뉴에서 “홈 화면에 추가”를 선택하세요.</li>
              <li>이름을 확인한 뒤 “추가”를 누르세요.</li>
            </ol>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600"
                onClick={() => setShowIosInstall(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <a className="text-xs text-stone-500 underline" href="/admin">
          관리자 페이지
        </a>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: LocalOrder["status"] }) {
  const base = "inline-flex rounded-full px-3 py-1 text-xs font-semibold";
  if (status === "완료") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        {status}
      </span>
    );
  }
  if (status === "음료준비중") {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>{status}</span>
    );
  }
  if (status === "주문취소") {
    return (
      <span className={`${base} bg-rose-100 text-rose-700`}>{status}</span>
    );
  }
  return (
    <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>
  );
}
