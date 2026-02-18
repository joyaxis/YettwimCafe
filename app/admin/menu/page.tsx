"use client";

import { useEffect, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";
import type { MenuItem } from "../../../lib/types";

const emptyItem = {
  name: "",
  description: "",
  price: 0,
  category: "",
  is_hot: false,
  is_ice: false,
};

export default function AdminMenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [draft, setDraft] = useState(emptyItem);
  const [status, setStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"gallery" | "list">("list");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [showHidden, setShowHidden] = useState(false);
  const [menuTab, setMenuTab] = useState<"list" | "recipe">("list");
  const [recipeDrafts, setRecipeDrafts] = useState<Record<string, string>>({});
  const [recipeNotice, setRecipeNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin_menu_view");
    if (saved === "list" || saved === "gallery") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_menu_view", viewMode);
  }, [viewMode]);

  const load = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select(
        "id,name,description,price,category,recipe,is_hidden,is_hot,is_ice",
      )
      .order("created_at", { ascending: true });
    const nextMenu = (data as MenuItem[]) || [];
    setMenu(nextMenu);
    setRecipeDrafts((prev) => {
      const next = { ...prev };
      nextMenu.forEach((item) => {
        if (next[item.id] === undefined) {
          next[item.id] = item.recipe || "";
        }
      });
      return next;
    });

    const { data: categoryData } = await supabase
      .from("categories")
      .select("name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setCategories(
      (categoryData || []).map((item: { name: string }) => item.name),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const addItem = async () => {
    setStatus(null);
    const { error } = await supabase.from("menu_items").insert({
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      category: draft.category,
      is_hidden: false,
      is_hot: draft.is_hot ?? false,
      is_ice: draft.is_ice ?? false,
    });
    if (error) {
      setStatus("추가 실패: " + error.message);
      return;
    }
    setDraft(emptyItem);
    await load();
  };

  const updateItem = async (
    id: string,
    field: keyof MenuItem,
    value: string | number | boolean,
  ) => {
    await supabase
      .from("menu_items")
      .update({ [field]: value })
      .eq("id", id);
    await load();
  };

  const updateRecipe = async (id: string, recipe: string) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ recipe })
      .eq("id", id);
    if (error) {
      setRecipeNotice(`저장 실패: ${error.message}`);
      window.setTimeout(() => setRecipeNotice(null), 3000);
      return;
    }
    await load();
    setRecipeNotice("저장되었습니다");
    window.setTimeout(() => setRecipeNotice(null), 2000);
  };

  const deleteItem = async (id: string, name: string) => {
    if (!window.confirm(`선택한 "${name}" 을(를) 삭제하시겠습니까?`)) {
      return;
    }
    await supabase.from("menu_items").delete().eq("id", id);
    await load();
  };

  return (
    <AdminGate>
      <div className="space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">메뉴 추가</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="grid gap-3 md:col-span-2 md:grid-cols-[140px_1fr_120px_auto]">
              <select
                className="rounded-xl border border-stone-200 px-4 py-2"
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                <option value="">카테고리 선택</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-9"
                  placeholder="메뉴명"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                {draft.name && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                    onClick={() => setDraft({ ...draft, name: "" })}
                    aria-label="메뉴명 지우기"
                    title="지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 md:contents">
                <div className="relative w-48 md:w-full">
                  <input
                    className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-4"
                    type="number"
                    min="0"
                    placeholder="가격"
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({ ...draft, price: Number(e.target.value) })
                    }
                  />
                  {draft.price !== 0 && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                      onClick={() => setDraft({ ...draft, price: 0 })}
                      aria-label="가격 지우기"
                      title="지우기"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-start gap-4 text-sm text-stone-600 md:justify-end">
                  <label className="flex items-center gap-2 text-red-600">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          is_hot: e.target.checked,
                        }))
                      }
                    />
                    HOT
                  </label>
                  <label className="flex items-center gap-2 text-blue-500">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          is_ice: e.target.checked,
                        }))
                      }
                    />
                    ICE
                  </label>
                </div>
              </div>
            </div>
            <div className="relative md:col-span-2">
              <input
                className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-9"
                placeholder="설명"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
              {draft.description && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                  onClick={() => setDraft({ ...draft, description: "" })}
                  aria-label="설명 지우기"
                  title="지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="rounded-full bg-accent px-5 py-2 text-white"
              onClick={addItem}
            >
              추가
            </button>
          </div>
          {status && <p className="mt-3 text-sm text-accent">{status}</p>}
        </div>

        <div className="flex flex-nowrap items-center gap-3">
          <div className="flex items-center gap-6 border-b border-stone-200 text-base text-stone-500">
            <button
              className={`-mb-px border-b-2 px-1 py-2 transition ${
                menuTab === "list"
                  ? "border-accent text-stone-900"
                  : "border-transparent hover:border-stone-300 hover:text-stone-700"
              }`}
              onClick={() => setMenuTab("list")}
            >
              메뉴 목록
            </button>
            <button
              className={`-mb-px border-b-2 px-1 py-2 transition ${
                menuTab === "recipe"
                  ? "border-accent text-stone-900"
                  : "border-transparent hover:border-stone-300 hover:text-stone-700"
              }`}
              onClick={() => setMenuTab("recipe")}
            >
              레시피
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
            {menuTab === "list" && (
              <>
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                  />
                  숨김 포함
                </label>
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                    viewMode === "list"
                      ? "border-accent text-accent"
                      : "border-stone-300 text-stone-500"
                  }`}
                  onClick={() => setViewMode("list")}
                  aria-label="리스트 보기"
                  title="리스트 보기"
                >
                  <span className="sr-only">리스트 보기</span>≡
                </button>
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                    viewMode === "gallery"
                      ? "border-accent text-accent"
                      : "border-stone-300 text-stone-500"
                  }`}
                  onClick={() => setViewMode("gallery")}
                  aria-label="갤러리 보기"
                  title="갤러리 보기"
                >
                  <span className="sr-only">갤러리 보기</span>▦
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["전체", ...categories, "기타"]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((category) => (
              <button
                key={category}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  activeCategory === category
                    ? "bg-accent text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
        </div>

        {menuTab === "recipe" ? (
          <>
            {recipeNotice && (
              <p className="text-sm text-accent">{recipeNotice}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {menu
                .filter((item) =>
                  activeCategory === "전체"
                    ? true
                    : (item.category || "기타") === activeCategory,
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200 bg-white p-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <button
                        className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600"
                        onClick={() =>
                          updateRecipe(item.id, recipeDrafts[item.id] || "")
                        }
                      >
                        저장
                      </button>
                    </div>
                    <textarea
                      className="mt-3 min-h-[120px] w-full rounded-xl border border-stone-200 px-4 py-2"
                      value={recipeDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setRecipeDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="레시피를 입력하세요"
                    />
                  </div>
                ))}
            </div>
          </>
        ) : viewMode === "gallery" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {menu
              .filter((item) =>
                activeCategory === "전체"
                  ? true
                  : (item.category || "기타") === activeCategory,
              )
              .filter((item) => (showHidden ? true : !item.is_hidden))
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6"
                >
                  <div className="mt-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-300 text-red-600"
                      onClick={() => deleteItem(item.id, item.name)}
                      aria-label="삭제"
                      title="삭제"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_1fr]">
                      <div className="grid gap-2">
                        <label className="text-sm text-stone-500">
                          카테고리
                        </label>
                        <select
                          className="rounded-xl border border-stone-200 px-4 py-2"
                          value={item.category || ""}
                          onChange={(e) =>
                            updateItem(item.id, "category", e.target.value)
                          }
                        >
                          <option value="">선택</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm text-stone-500">메뉴명</label>
                        <input
                          className="rounded-xl border border-stone-200 px-4 py-2"
                          defaultValue={item.name}
                          onBlur={(e) =>
                            updateItem(item.id, "name", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_1.6fr] md:items-center">
                      <div className="grid gap-2">
                        <label className="text-sm text-stone-500">가격</label>
                        <input
                          className="rounded-xl border border-stone-200 px-4 py-2"
                          type="number"
                          defaultValue={item.price}
                          onBlur={(e) =>
                            updateItem(item.id, "price", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2 md:items-center">
                        <span className="text-sm text-stone-500 opacity-0">
                          온도
                        </span>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
                          <label className="flex items-center gap-2 text-red-600">
                            <input
                              type="checkbox"
                              defaultChecked={item.is_hot}
                              onChange={(e) =>
                                updateItem(item.id, "is_hot", e.target.checked)
                              }
                            />
                            HOT
                          </label>
                          <label className="flex items-center gap-2 text-blue-500">
                            <input
                              type="checkbox"
                              defaultChecked={item.is_ice}
                              onChange={(e) =>
                                updateItem(item.id, "is_ice", e.target.checked)
                              }
                            />
                            ICE
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm text-stone-500">설명</label>
                      <input
                        className="rounded-xl border border-stone-200 px-4 py-2"
                        defaultValue={item.description || ""}
                        onBlur={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <input
                          id={`hide-${item.id}`}
                          type="checkbox"
                          defaultChecked={item.is_hidden}
                          onChange={(e) =>
                            updateItem(item.id, "is_hidden", e.target.checked)
                          }
                        />
                        <label
                          htmlFor={`hide-${item.id}`}
                          className="cursor-pointer"
                        >
                          주문 화면에서 숨기기
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="hidden grid-cols-[140px_1fr_120px_220px_110px_120px] items-center gap-3 rounded-t-2xl border-b border-stone-200 bg-clay px-4 py-3 text-sm font-semibold text-center md:grid">
              <span>카테고리</span>
              <span>메뉴명</span>
              <span>가격</span>
              <span>온도옵션</span>
              <span>메뉴 숨김</span>
              <span>편집</span>
            </div>
            <div className="divide-y divide-stone-200">
              {menu
                .filter((item) =>
                  activeCategory === "전체"
                    ? true
                    : (item.category || "기타") === activeCategory,
                )
                .filter((item) => (showHidden ? true : !item.is_hidden))
                .map((item) => (
                  <div key={item.id} className="px-4 py-4 text-sm">
                    <div className="grid gap-3 md:grid-cols-[140px_1fr_120px_220px_110px_120px] md:items-center md:gap-3">
                      <div className="grid gap-1">
                        <span className="text-xs text-stone-500 md:hidden">
                          카테고리
                        </span>
                        <select
                          className="rounded-lg border border-stone-200 px-3 py-2"
                          value={item.category || ""}
                          onChange={(e) =>
                            updateItem(item.id, "category", e.target.value)
                          }
                        >
                          <option value="">선택</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-stone-500 md:hidden">
                          메뉴명
                        </span>
                        <input
                          className="rounded-lg border border-stone-200 px-3 py-2 text-base md:text-sm"
                          defaultValue={item.name}
                          onBlur={(e) =>
                            updateItem(item.id, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-1 md:contents">
                        <span className="text-xs text-stone-500 md:hidden">
                          가격
                        </span>
                        <div className="flex items-center gap-3 md:contents">
                          <input
                            className="w-32 rounded-lg border border-stone-200 px-3 py-2 text-sm md:w-full"
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) =>
                              updateItem(item.id, "price", e.target.value)
                            }
                          />
                          <div className="flex flex-nowrap items-center justify-center gap-2 text-sm text-stone-600 md:justify-center md:gap-3 md:self-center">
                            <label className="flex items-center gap-2 text-red-600">
                              <input
                                type="checkbox"
                                defaultChecked={item.is_hot}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "is_hot",
                                    e.target.checked,
                                  )
                                }
                              />
                              HOT
                            </label>
                            <label className="flex items-center gap-2 text-blue-500">
                              <input
                                type="checkbox"
                                defaultChecked={item.is_ice}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "is_ice",
                                    e.target.checked,
                                  )
                                }
                              />
                              ICE
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="hidden items-center gap-2 text-sm text-stone-600 md:flex md:justify-center">
                        <input
                          id={`hide-list-${item.id}`}
                          type="checkbox"
                          defaultChecked={item.is_hidden}
                          onChange={(e) =>
                            updateItem(item.id, "is_hidden", e.target.checked)
                          }
                        />
                        <label
                          htmlFor={`hide-list-${item.id}`}
                          className="cursor-pointer"
                        >
                          숨김
                        </label>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-center">
                        <div className="flex items-center gap-2 text-sm text-stone-600 md:hidden">
                          <input
                            id={`hide-list-mobile-${item.id}`}
                            type="checkbox"
                            defaultChecked={item.is_hidden}
                            onChange={(e) =>
                              updateItem(item.id, "is_hidden", e.target.checked)
                            }
                          />
                          <label
                            htmlFor={`hide-list-mobile-${item.id}`}
                            className="cursor-pointer"
                          >
                            숨김
                          </label>
                        </div>
                        <div className="flex items-center gap-2 md:hidden">
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-[11px] text-stone-600"
                            onClick={() => setEditing(item)}
                            aria-label="편집"
                            title="편집"
                          >
                            ✎
                          </button>
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-300 text-[11px] text-red-600"
                            onClick={() => deleteItem(item.id, item.name)}
                            aria-label="삭제"
                            title="삭제"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="hidden items-center justify-center gap-2 md:flex">
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-base text-stone-600"
                            onClick={() => setEditing(item)}
                            aria-label="편집"
                            title="편집"
                          >
                            ✎
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-300 text-base text-red-600"
                            onClick={() => deleteItem(item.id, item.name)}
                            aria-label="삭제"
                            title="삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">메뉴 편집</h3>
                <button
                  className="text-sm text-stone-500"
                  onClick={() => setEditing(null)}
                >
                  닫기
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <label className="text-sm text-stone-500">카테고리</label>
                  <select
                    className="rounded-xl border border-stone-200 px-4 py-2"
                    value={editing.category || ""}
                    onChange={(e) =>
                      updateItem(editing.id, "category", e.target.value)
                    }
                  >
                    <option value="">선택</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-sm text-stone-500">메뉴명</label>
                  <input
                    className="rounded-xl border border-stone-200 px-4 py-2"
                    defaultValue={editing.name}
                    onBlur={(e) =>
                      updateItem(editing.id, "name", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="grid gap-1">
                    <label className="text-sm text-stone-500">가격</label>
                    <input
                      className="rounded-xl border border-stone-200 px-4 py-2"
                      type="number"
                      defaultValue={editing.price}
                      onBlur={(e) =>
                        updateItem(editing.id, "price", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-nowrap items-center gap-3 text-xs text-stone-600 md:mt-6 md:gap-4 md:text-sm">
                    <label className="flex items-center gap-2 text-red-600">
                      <input
                        type="checkbox"
                        defaultChecked={editing.is_hot}
                        onChange={(e) =>
                          updateItem(editing.id, "is_hot", e.target.checked)
                        }
                      />
                      HOT
                    </label>
                    <label className="flex items-center gap-2 text-blue-500">
                      <input
                        type="checkbox"
                        defaultChecked={editing.is_ice}
                        onChange={(e) =>
                          updateItem(editing.id, "is_ice", e.target.checked)
                        }
                      />
                      ICE
                    </label>
                  </div>
                </div>
                <div className="grid gap-1 md:col-span-2">
                  <label className="text-sm text-stone-500">설명</label>
                  <input
                    className="rounded-xl border border-stone-200 px-4 py-2"
                    defaultValue={editing.description || ""}
                    onBlur={(e) =>
                      updateItem(editing.id, "description", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <input
                      id={`hide-edit-${editing.id}`}
                      type="checkbox"
                      defaultChecked={editing.is_hidden}
                      onChange={(e) =>
                        updateItem(editing.id, "is_hidden", e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`hide-edit-${editing.id}`}
                      className="cursor-pointer"
                    >
                      주문 화면에서 숨기기
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm"
                  onClick={() => setEditing(null)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
