import AdminGate from "../components/AdminGate";
import Link from "next/link";
import OrdersRequested from "./requested-orders";
import DailySales from "./daily-sales";
import OrderStats from "./order-stats";
import MenuStats from "./menu-stats";

export default function AdminHome() {
  return (
    <AdminGate>
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <OrdersRequested />
          <DailySales />
        </div>
        <OrderStats />
        <MenuStats />
        {/* 대시보드 하단 메뉴 버튼 숨김 */}
      </div>
    </AdminGate>
  );
}
