"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PlayCircle,
  Activity,
  Sparkles,
  CalendarClock,
  Table2,
  LayoutGrid,
  List,
  Database,
  RefreshCw,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

declare global {
  interface Window {
    gsap: any;
  }
}

interface Connection {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface SourceTable {
  id: string;
  connection_id: string;
  schema_name: string;
  table_name: string;
  display_name: string;
  row_count: number | null;
  last_updated_at: string | null;
  status: string;
  metadata: any;
}

export default function TablesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [tables, setTables] = useState<SourceTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConnections();
    loadTables();

    // Animations
    if (typeof window !== "undefined" && window.gsap) {
      window.gsap.from("main section", {
        duration: 0.6,
        opacity: 0,
        y: 10,
        ease: "power2.out",
      });
    }
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadTables();
    }
  }, [selectedConnectionId]);

  const loadConnections = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("id, name, type, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
      
      // Auto-select first connection if available
      if (data && data.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!selectedConnectionId) {
      setTables([]);
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("source_tables")
        .select("*")
        .eq("connection_id", selectedConnectionId)
        .order("table_name", { ascending: true });

      if (error) {
        console.error("Error loading tables:", error);
        throw error;
      }
      
      console.log(`Loaded ${data?.length || 0} tables from database for connection ${selectedConnectionId}:`, data);
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
      setTables([]);
    }
  };

  const discoverTables = async () => {
    if (!selectedConnectionId) {
      setError("Please select a connection first");
      return;
    }

    setDiscovering(true);
    setError("");

    try {
      const response = await fetch("/api/tables/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId: selectedConnectionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to discover tables");
      }

      console.log(`Discovery successful: ${data.tables?.length || 0} tables found`, data.tables);
      
      // Reload tables after discovery - add delay to ensure DB write completes
      setTimeout(async () => {
        console.log('Reloading tables after discovery...');
        await loadTables();
      }, 1000);
    } catch (error: any) {
      setError(error.message || "Failed to discover tables");
    } finally {
      setDiscovering(false);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
  };

  const goToMapper = () => {
    if (!selectedTableId) {
      setError("Please select a table first");
      return;
    }
    window.location.href = `/dashboard/mapper?tableId=${selectedTableId}`;
  };

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      {/* Global Header */}
      <header
        className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 sticky top-0 bg-white z-50"
        style={{ viewTransitionName: "header" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ viewTransitionName: "logo" }}
          >
            <Image
              src="/logo.svg"
              alt="Data Sync Planner Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight">Tadam</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="cta-test-btn"
            className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Test Mapping
          </button>
          <button
            id="cta-save-btn"
            className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm"
          >
            Save Draft
          </button>
          <button
            onClick={goToMapper}
            disabled={!selectedTableId}
            className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-all rounded-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Map Fields
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar activePage="tables" />

        {/* Center: Table Explorer */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Select Source Tables
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  {selectedConnection
                    ? `Browse tables from ${selectedConnection.name}`
                    : "Select a connection to browse tables"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {connections.length > 0 && (
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-neutral-200 rounded-sm text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Connection</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.type})
                      </option>
                    ))}
                  </select>
                )}
                {selectedConnectionId && (
                  <button
                    onClick={discoverTables}
                    disabled={discovering}
                    className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {discovering ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Database className="w-3 h-3" />
                        Discover Tables
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-neutral-300 animate-spin" />
              </div>
            ) : !selectedConnectionId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Database className="w-16 h-16 text-neutral-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Connection Selected</h3>
                <p className="text-sm text-neutral-500 mb-4">
                  Select a connection from the dropdown above to browse tables
                </p>
                <a
                  href="/dashboard/integrations"
                  className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm"
                >
                  Go to Integrations
                </a>
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Table2 className="w-16 h-16 text-neutral-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tables Found</h3>
                <p className="text-sm text-neutral-500 mb-4">
                  Click "Discover Tables" to scan your database for available tables
                </p>
                <button
                  onClick={discoverTables}
                  disabled={discovering}
                  className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Database className="w-3 h-3" />
                      Discover Tables
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_100px] gap-4 px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  <div>Table Name</div>
                  <div>Row Count</div>
                  <div>Last Updated</div>
                  <div>Status</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows */}
                {tables.map((table) => (
                  <div
                    key={table.id}
                    onClick={() => handleTableSelect(table.id)}
                    className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_100px] gap-4 items-center p-4 bg-white border rounded-sm transition-colors cursor-pointer ${
                      selectedTableId === table.id
                        ? "border-black shadow-sm"
                        : "border-neutral-100 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                          selectedTableId === table.id
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        <Table2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-xs ${
                            selectedTableId === table.id ? "font-bold" : "font-medium"
                          }`}
                        >
                          {table.display_name || table.table_name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {table.schema_name || "public"}.{table.table_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-medium">
                      {table.row_count !== null
                        ? `${table.row_count.toLocaleString()} rows`
                        : "—"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {table.last_updated_at
                        ? new Date(table.last_updated_at).toLocaleDateString()
                        : "—"}
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          table.status === "healthy"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : table.status === "latency_risk"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-neutral-200 text-neutral-500"
                        }`}
                      >
                        {table.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {selectedTableId === table.id && (
                        <ArrowRight className="w-4 h-4 text-black" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sidebar: Connection Info */}
        <aside className="w-80 border-l border-neutral-100 bg-neutral-50/20 flex flex-col">
          <div className="flex-1 p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Connection Info
                </h3>
                <Activity className="w-4 h-4 text-neutral-300" />
              </div>

              {selectedConnection ? (
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                      Connection
                    </div>
                    <div className="text-sm font-bold">{selectedConnection.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {selectedConnection.type}
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                      Tables Found
                    </div>
                    <div className="text-sm font-bold">{tables.length}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white border border-neutral-100 rounded-sm text-center">
                  <p className="text-xs text-neutral-500">
                    Select a connection to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
