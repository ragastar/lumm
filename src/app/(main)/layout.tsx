import { Sidebar } from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
