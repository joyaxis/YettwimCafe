import Link from "next/link";
import AdminNav from "../components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <header className="bg-accent text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5">
          <div className="flex w-full">
            <AdminNav showMenu={false} showHome={true} />
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Admin</p>
              <h1 className="text-3xl font-semibold">관리자 페이지</h1>
            </div>
            <div className="w-full md:w-auto">
              <AdminNav showTop={false} />
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        {children}
      </div>
    </div>
  );
}
