"use client";

import { useEffect, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id,name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setCategories((data as Category[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = async () => {
    setStatus(null);
    if (!name.trim()) {
      setStatus("카테고리명을 입력하세요.");
      return;
    }
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      sort_order: Number(sortOrder),
    });
    if (error) {
      setStatus("추가 실패: " + error.message);
      return;
    }
    setName("");
    setSortOrder(0);
    await load();
  };

  const updateCategory = async (
    id: string,
    field: "name" | "sort_order",
    value: string,
  ) => {
    await supabase
      .from("categories")
      .update({ [field]: value })
      .eq("id", id);
    await load();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    await load();
  };

  return (
    <AdminGate>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[1.1fr_1.9fr]">
          <div className="bg-white">
            <h2 className="text-lg font-semibold">카테고리 추가</h2>
            <p className="mt-2 text-sm text-stone-500">
              정렬 순서는 숫자가 낮을수록 먼저 표시됩니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 md:grid md:gap-3">
              <div className="relative w-44 md:w-full">
                <input
                  className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-9"
                  placeholder="카테고리명"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {name && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                    onClick={() => setName("")}
                    aria-label="카테고리명 지우기"
                    title="지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="relative w-20 md:w-full">
                <input
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 pr-3 text-center md:px-4 md:text-left"
                  type="number"
                  placeholder="정렬 순서"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
                {sortOrder !== 0 && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                    onClick={() => setSortOrder(0)}
                    aria-label="정렬 순서 지우기"
                    title="지우기"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                className="rounded-full bg-accent px-4 py-2 text-white md:px-5"
                onClick={addCategory}
              >
                추가
              </button>
            </div>
            {status && <p className="mt-3 text-sm text-accent">{status}</p>}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">카테고리 목록</h2>
                <p className="mt-1 text-sm text-stone-500">
                  총 {categories.length}개
                </p>
              </div>
            </div>
            <div className="border-t border-stone-200">
              <div className="hidden grid-cols-[1fr_120px_100px] items-center gap-4 bg-clay px-6 py-3 text-sm font-semibold text-center md:grid">
                <span>카테고리명</span>
                <span>정렬</span>
                <span>관리</span>
              </div>
              <div className="divide-y divide-stone-200 px-4 py-2 md:px-0 md:py-0">
                {categories.length === 0 ? (
                  <p className="px-2 py-4 text-stone-500 md:px-6">
                    등록된 카테고리가 없습니다.
                  </p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="grid gap-3 py-3 md:grid-cols-[1fr_120px_100px] md:items-center md:px-6"
                    >
                      <div className="flex flex-wrap items-center gap-2 md:contents">
                        <div className="grid gap-1">
                          <span className="text-xs text-stone-500 md:hidden">
                            카테고리명
                          </span>
                          <input
                            className="w-44 rounded-xl border border-stone-200 px-3 py-2 md:w-full"
                            defaultValue={category.name}
                            onBlur={(e) =>
                              updateCategory(
                                category.id,
                                "name",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <span className="text-xs text-stone-500 md:hidden">
                            정렬
                          </span>
                          <input
                            className="w-20 rounded-xl border border-stone-200 px-2 py-2 text-center md:w-24"
                            type="number"
                            defaultValue={category.sort_order}
                            onBlur={(e) =>
                              updateCategory(
                                category.id,
                                "sort_order",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="grid gap-1 md:hidden">
                          <span className="text-xs text-stone-500 opacity-0">
                            관리
                          </span>
                          <button
                            className="rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-600"
                            onClick={() => deleteCategory(category.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div className="hidden items-center md:flex md:justify-center">
                        <button
                          className="rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-600"
                          onClick={() => deleteCategory(category.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
