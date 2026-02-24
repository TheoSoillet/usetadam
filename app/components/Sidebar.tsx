"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Home as HomeIcon,
  Table,
  History,
  BarChart3,
  GitMerge,
  Settings2,
  Database,
  Plug,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface SidebarProps {
  activePage?: "home" | "tables" | "history" | "analytics" | "mapper" | "config" | "integrations";
}

interface Connection {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function Sidebar({ activePage = "home" }: SidebarProps) {
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);

  useEffect(() => {
    loadActiveConnection();
  }, []);

  const loadActiveConnection = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("id, name, type, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveConnection(data);
      }
    } catch (error) {
      // No active connection or error loading
    }
  };

  const getNavLinkClass = (page: string) => {
    const isActive = activePage === page;
    return isActive
      ? "bg-white border border-neutral-200 shadow-sm flex items-center gap-3 p-3 rounded-sm transition-all group"
      : "flex items-center gap-3 p-3 rounded-sm hover:bg-neutral-100 transition-all group";
  };

  const getNavIconClass = (page: string) => {
    const isActive = activePage === page;
    return isActive ? "w-4 h-4" : "w-4 h-4 text-neutral-400 group-hover:text-black";
  };

  const getNavTextClass = (page: string) => {
    const isActive = activePage === page;
    return isActive
      ? "text-xs font-bold"
      : "text-xs font-medium text-neutral-600 group-hover:text-black";
  };

  return (
    <aside
      className="w-72 border-r border-neutral-100 flex flex-col bg-neutral-50/30"
      style={{ viewTransitionName: "sidebar" }}
    >
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search workspace..."
            className="w-full bg-white border border-neutral-200 rounded-sm py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-black/10 transition-all"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
        <div className="px-2 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Main Menu
        </div>

        <a id="nav-home" href="/dashboard" className={getNavLinkClass("home")}>
          <HomeIcon className={getNavIconClass("home")} />
          <span className={getNavTextClass("home")}>Home</span>
        </a>

        <a id="nav-tables" href="/dashboard/tables" className={getNavLinkClass("tables")}>
          <Table className={getNavIconClass("tables")} />
          <span className={getNavTextClass("tables")}>Tables</span>
        </a>

            <a
              id="nav-history"
              href="/dashboard/history"
              className={getNavLinkClass("history")}
            >
              <History className={getNavIconClass("history")} />
              <span className={getNavTextClass("history")}>Sync History</span>
            </a>

        <a
          id="nav-analytics"
          href="#analytics"
          className={getNavLinkClass("analytics")}
        >
          <BarChart3 className={getNavIconClass("analytics")} />
          <span className={getNavTextClass("analytics")}>Analytics</span>
        </a>

        <a
          id="nav-integrations"
          href="/dashboard/integrations"
          className={getNavLinkClass("integrations")}
        >
          <Plug className={getNavIconClass("integrations")} />
          <span className={getNavTextClass("integrations")}>Integrations</span>
        </a>

        <div className="h-4"></div>
        <div className="px-2 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Configuration
        </div>

        <a
          id="nav-mapper"
          href="/dashboard/mapper"
          className={getNavLinkClass("mapper")}
        >
          <GitMerge className={getNavIconClass("mapper")} />
          <span className={getNavTextClass("mapper")}>Property Mapper</span>
        </a>

        <a id="nav-config" href="/dashboard/config" className={getNavLinkClass("config")}>
          <Settings2 className={getNavIconClass("config")} />
          <span className={getNavTextClass("config")}>Sync Config</span>
        </a>
      </nav>

      <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">
            Active Connection
          </span>
          {activeConnection ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
          )}
        </div>
        {activeConnection ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{activeConnection.name}</div>
              <div className="text-[10px] text-neutral-400 uppercase">{activeConnection.type}</div>
            </div>
          </div>
        ) : (
          <a
            href="/dashboard/integrations"
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-black transition-colors"
          >
            <Plug className="w-4 h-4" />
            <span>Connect Integration</span>
          </a>
        )}
      </div>
    </aside>
  );
}
