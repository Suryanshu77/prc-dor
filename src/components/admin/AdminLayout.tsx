import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background flex">

      <AdminSidebar />

      <div className="flex-1 flex flex-col">

        <AdminHeader />

        <main className="p-8">
          {children}
        </main>

      </div>

    </div>
  );
}