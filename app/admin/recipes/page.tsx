"use client";

import { useEffect, useState } from "react";
import AdminGate from "../../components/AdminGate";
import { supabase } from "../../../lib/supabaseClient";
import type { MenuItem } from "../../../lib/types";

export default function AdminRecipesPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("id,name,recipe")
      .order("created_at", { ascending: true });
    setMenu((data as MenuItem[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateRecipe = async (id: string, recipe: string) => {
    await supabase.from("menu_items").update({ recipe }).eq("id", id);
    await load();
  };

  return (
    <AdminGate>
      <div className="grid gap-4 md:grid-cols-2">
        {menu.map((item) => (
          <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <textarea
              className="mt-3 min-h-[120px] w-full rounded-xl border border-stone-200 px-4 py-2"
              defaultValue={item.recipe || ""}
              onBlur={(e) => updateRecipe(item.id, e.target.value)}
              placeholder="레시피를 입력하세요"
            />
          </div>
        ))}
      </div>
    </AdminGate>
  );
}
