"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  PlayCircle,
  Table2,
  TrendingUp,
  Clock,
  Database,
  AlertCircle,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

declare global {
  interface Window {
    gsap: any;
  }
}

export default function HistoryPage() {
  useEffect(() => {
    // Subtle animation for panel entry
    if (typeof window !== "undefined" && window.gsap) {
      window.gsap.from("main section", {
        duration: 0.6,
        opacity: 0,
        y: 10,
        ease: "power2.out",
      });
      window.gsap.from("tr", {
        duration: 0.5,
        opacity: 0,
        x: -10,
        stagger: 0.05,
        ease: "power2.out",
        delay: 0.2,
      });
      window.gsap.from("aside:last-child", {
        duration: 0.6,
        opacity: 0,
        x: 20,
        ease: "power2.out",
        delay: 0.3,
      });
    }

    // Row selection effect
    const rows = document.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        rows.forEach((r) =>
          r.classList.remove(
            "bg-neutral-100/50",
            "ring-1",
            "ring-inset",
            "ring-neutral-200"
          )
        );
        row.classList.add(
          "bg-neutral-100/50",
          "ring-1",
          "ring-inset",
          "ring-neutral-200"
        );
      });
    });
  }, []);

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
            id="cta-run-btn"
            className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-all rounded-sm shadow-sm"
          >
            Run Sync Now
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar activePage="history" />

        {/* Center: Sync History Detailed View */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Execution Logs
                </h2>
                <p className="text-xs text-neutral-400">
                  Monitoring data integrity and sync performance across all
                  instances
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 mr-4">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[10px] font-bold">
                    AH
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-900 flex items-center justify-center text-[10px] font-bold text-white">
                    JD
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                    +4
                  </div>
                </div>
                <button
                  id="filter-btn"
                  className="p-2 border border-neutral-200 rounded-sm hover:bg-neutral-50"
                >
                  <Filter className="w-5 h-5" />
                </button>
                <button
                  id="export-btn"
                  className="px-3 py-2 text-xs font-medium border border-neutral-200 rounded-sm hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Stats Banner */}
            <div className="grid grid-cols-4 border-b border-neutral-100 divide-x divide-neutral-100">
              <div className="p-6">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Total Syncs
                </span>
                <div className="text-2xl font-semibold mt-1">1,248</div>
                <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% vs last month
                </div>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Avg. Duration
                </span>
                <div className="text-2xl font-semibold mt-1">41.8s</div>
                <div className="text-[10px] text-neutral-400 font-medium flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Within SLA bounds
                </div>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Rows Synced
                </span>
                <div className="text-2xl font-semibold mt-1">4.8M</div>
                <div className="text-[10px] text-neutral-400 font-medium flex items-center gap-1 mt-1">
                  <Database className="w-3 h-3" />
                  Last 30 days
                </div>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Error Rate
                </span>
                <div className="text-2xl font-semibold mt-1">0.42%</div>
                <div className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  2 active issues
                </div>
              </div>
            </div>

            {/* History Table */}
            <table className="w-full text-left">
              <thead className="bg-neutral-50/50 border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Execution Time
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Source Table
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Rows
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {/* Entry 1 */}
                <tr className="hover:bg-neutral-50/80 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold">Today, 04:00 AM</div>
                    <div className="text-[10px] text-neutral-400">
                      ID: SYNC-2023-1024-001
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium">Contacts</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                      SUCCESS
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">12,402 / 12,402</td>
                  <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                    42.1s
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors">
                      VIEW LOGS
                    </button>
                  </td>
                </tr>

                {/* Entry 2 - Failed */}
                <tr className="hover:bg-neutral-50/80 transition-colors group cursor-pointer bg-red-50/10">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold">Oct 23, 09:12 PM</div>
                    <div className="text-[10px] text-neutral-400">
                      ID: SYNC-2023-1023-088
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium">Users</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-red-500"></span>
                      FAILED
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-red-600">0 / 156</td>
                  <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                    1.2s
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-bold text-red-600 underline underline-offset-2">
                      DEBUG ERRORS
                    </button>
                  </td>
                </tr>

                {/* Entry 3 */}
                <tr className="hover:bg-neutral-50/80 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold">Oct 23, 04:01 AM</div>
                    <div className="text-[10px] text-neutral-400">
                      ID: SYNC-2023-1023-001
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium">Companies</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                      SUCCESS
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">8,210 / 8,210</td>
                  <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                    39.8s
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors">
                      VIEW LOGS
                    </button>
                  </td>
                </tr>

                {/* Entry 4 - Partial/Skipped */}
                <tr className="hover:bg-neutral-50/80 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold">Oct 22, 04:00 AM</div>
                    <div className="text-[10px] text-neutral-400">
                      ID: SYNC-2023-1022-001
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium">Deals</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
                      SKIPPED
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">0 (No Changes)</td>
                  <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                    0.4s
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors">
                      VIEW LOGS
                    </button>
                  </td>
                </tr>

                {/* More rows for visual density */}
                <tr className="hover:bg-neutral-50/80 transition-colors group cursor-pointer opacity-60">
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium">Oct 21, 04:02 AM</div>
                    <div className="text-[10px] text-neutral-400">
                      ID: SYNC-2023-1021-001
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">Contacts</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                      SUCCESS
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">12,398 / 12,398</td>
                  <td className="px-6 py-4 text-xs font-mono text-neutral-500">
                    44.2s
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[10px] font-bold text-neutral-400">
                      VIEW LOGS
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-6 flex items-center justify-between border-t border-neutral-100">
              <span className="text-xs text-neutral-400">
                Showing 1-10 of 1,248 executions
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="p-1 text-neutral-400 hover:text-black transition-colors disabled:opacity-30"
                  disabled
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center bg-black text-white text-xs rounded-sm">
                    1
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-xs rounded-sm">
                    2
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-xs rounded-sm">
                    3
                  </button>
                  <span className="text-xs text-neutral-400 px-1">...</span>
                  <button className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 text-xs rounded-sm">
                    125
                  </button>
                </div>
                <button className="p-1 text-neutral-400 hover:text-black transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar: Log Detail Configuration */}
        <aside className="w-80 border-l border-neutral-100 bg-neutral-50/20 flex flex-col">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Execution Detail
                </h3>
                <ExternalLink className="w-4 h-4 text-neutral-300 cursor-pointer hover:text-black" />
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">
                    Selected Run
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">
                    FAILED
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold">SYNC-2023-1023-088</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Initiated by: CRON_SCHEDULER
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">Attempt</span>
                    <span className="text-[10px] font-mono">
                      3 of 3 (Retries Exhausted)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">
                      Error Code
                    </span>
                    <span className="text-[10px] font-mono font-bold">
                      CONN_TIMEOUT_408
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  System Output
                </h3>
                <button className="text-[10px] text-black font-bold flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  COPY
                </button>
              </div>

              <div className="space-y-2 font-mono">
                <div className="p-3 bg-neutral-900 rounded-sm text-[10px] text-red-400 overflow-x-auto custom-scrollbar leading-relaxed">
                  [09:12:01] Initializing connection...
                  <br />
                  [09:12:05] Handshake failed: Timeout
                  <br />
                  [09:12:06] Retry attempt 1/3...
                  <br />
                  [09:12:15] Error: Gateway Timeout (504)
                  <br />
                  [09:12:16] Critical: Stream aborted by peer.
                  <br />
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <div className="flex items-center gap-3">
                <button className="flex-1 py-2.5 text-[10px] font-bold bg-black text-white rounded-sm hover:bg-neutral-800 transition-colors">
                  RE-RUN MANUALLY
                </button>
                <button className="p-2 border border-neutral-200 rounded-sm hover:bg-neutral-50">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-3 text-center italic">
                Run report sent to #data-ops-alerts
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
