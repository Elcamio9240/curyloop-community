"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Search,
  Bot,
  Upload,
  Settings,
  LogOut,
  BarChart3,
  Sparkles,
  Lock,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/collections", label: "Collections", icon: FolderOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

const lockedItems = [
  { label: "Analytics", icon: BarChart3, tooltip: "Available in Curyloop Cloud" },
  { label: "Smart Collections", icon: Sparkles, tooltip: "Available in Curyloop Cloud" },
];

export function DashboardNav({ user }: { user: { name?: string | null; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4">
        <Link href="/dashboard" className="text-lg font-bold text-[var(--brand)]">
          Curyloop
        </Link>
        <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          CE
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-brand-light)] text-[var(--color-brand)]"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-zinc-200" />

        {lockedItems.map((item) => (
          <div
            key={item.label}
            className="group relative flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-400"
            title={item.tooltip}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <Lock className="ml-auto h-3 w-3" />
            <div className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white group-hover:block">
              {item.tooltip}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <div className="mb-2 truncate text-sm text-zinc-600">
          {user.name || user.email}
        </div>
        <button
          onClick={() => signOut().then(() => window.location.href = "/login")}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
