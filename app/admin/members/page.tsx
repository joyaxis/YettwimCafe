"use client";

import { useEffect, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";

const MINISTRIES = ["담임목사", "부목사", "남선교", "여전도", "청년부"];

type Member = {
  id: string;
  name: string;
  ministry: string | null;
  is_hidden: boolean | null;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [ministry, setMinistry] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterMinistry, setFilterMinistry] = useState("전체");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("yettwim_member")
      .select("id,name,ministry,is_hidden")
      .order("ministry", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      setLoadError("멤버 목록을 불러오지 못했습니다.");
      setMembers([]);
      return;
    }
    setLoadError(null);
    const orderMap: Record<string, number> = {
      담임목사: 1,
      부목사: 2,
      남선교: 3,
      여전도: 4,
      청년부: 5,
      기타: 6,
    };
    const sorted = ((data as Member[]) || []).slice().sort((a, b) => {
      const aKey = a.ministry || "기타";
      const bKey = b.ministry || "기타";
      const aRank = orderMap[aKey] ?? orderMap["기타"];
      const bRank = orderMap[bKey] ?? orderMap["기타"];
      if (aRank !== bRank) return aRank - bRank;
      return (a.name || "").localeCompare(b.name || "");
    });
    setMembers(sorted);
  };

  useEffect(() => {
    load();
  }, []);

  const addMember = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("이름을 입력해주세요.");
      return;
    }
    const { error } = await supabase
      .from("yettwim_member")
      .insert({ name: trimmed, ministry, is_hidden: false });
    if (error) {
      setStatus("멤버 추가에 실패했습니다.");
      return;
    }
    setName("");
    setStatus("추가되었습니다.");
    await load();
  };

  const updateHidden = async (id: string, isHidden: boolean) => {
    await supabase
      .from("yettwim_member")
      .update({ is_hidden: isHidden })
      .eq("id", id);
    await load();
  };

  const deleteMember = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("yettwim_member").delete().eq("id", id);
    setStatus("삭제되었습니다.");
    await load();
  };

  return (
    <AdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">멤버 관리</h1>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-xl border border-stone-200 px-3 py-2"
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
            >
              <option value="">부서 선택</option>
              {MINISTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <input
                className="w-full rounded-xl border border-stone-200 px-4 py-2 pr-10"
                placeholder="이름 입력"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {name && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400"
                  onClick={() => setName("")}
                  aria-label="입력 지우기"
                  title="입력 지우기"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              className="rounded-full bg-accent px-5 py-2 text-white"
              onClick={addMember}
            >
              추가
            </button>
          </div>
          {status && <p className="text-sm text-accent">{status}</p>}
        </div>

        <div className="pt-2">
          <h2 className="text-lg font-semibold">멤버 목록</h2>
          <div className="mt-2 h-px w-full bg-stone-200" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {["전체", ...MINISTRIES].map((item) => (
              <button
                key={item}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  filterMinistry === item
                    ? "bg-accent text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
                onClick={() => setFilterMinistry(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <input
              className="border-b border-stone-300 bg-transparent px-2 py-2 pr-8"
              placeholder="이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400"
                onClick={() => setQuery("")}
                aria-label="검색어 지우기"
                title="지우기"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-stone-200 border-y border-stone-200">
          <div className="grid grid-cols-[100px_1fr_60px_60px] md:grid-cols-[120px_1fr_80px_80px] items-center gap-3 bg-clay px-4 py-3 text-sm font-semibold text-stone-600 text-center">
            <span>부서</span>
            <span>이름</span>
            <span>숨김</span>
            <span>삭제</span>
          </div>
          {loadError ? (
            <div className="px-4 py-6 text-sm text-rose-600">{loadError}</div>
          ) : members
              .filter((member) => {
                if (!query.trim()) return true;
                const q = query.trim().toLowerCase();
                return (member.name || "").toLowerCase().includes(q);
              })
              .filter((member) => {
                if (filterMinistry === "전체") return true;
                return member.ministry === filterMinistry;
          }).length === 0 ? (
            <div className="px-4 py-6 text-sm text-stone-500">멤버가 없습니다.</div>
          ) : (
            members
              .filter((member) => {
                if (!query.trim()) return true;
                const q = query.trim().toLowerCase();
                return (member.name || "").toLowerCase().includes(q);
              })
              .filter((member) => {
                if (filterMinistry === "전체") return true;
                return member.ministry === filterMinistry;
              })
              .map((member) => (
                <div
                  key={member.id}
                  className="grid grid-cols-[100px_1fr_60px_60px] md:grid-cols-[120px_1fr_80px_80px] items-center gap-3 px-4 py-3 text-sm text-center"
                >
                  <span>{member.ministry || "-"}</span>
                  <span className="truncate">{member.name}</span>
                  <div className="flex justify-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(member.is_hidden)}
                        onChange={(e) =>
                          updateHidden(member.id, e.target.checked)
                        }
                      />
                    </label>
                  </div>
                  <div className="flex justify-center">
                    <button
                      className="text-sm text-rose-600"
                      onClick={() => deleteMember(member.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </AdminGate>
  );
}
