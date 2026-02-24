"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  PlayCircle,
  CalendarDays,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";

declare global {
  interface Window {
    gsap: any;
  }
}

export default function ConfigPage() {
  useEffect(() => {
    // Subtle animation for panel entry
    if (typeof window !== "undefined" && window.gsap) {
      window.gsap.from("main section", {
        duration: 0.8,
        opacity: 0,
        y: 10,
        ease: "power3.out",
        delay: 0.1,
      });
      window.gsap.from("aside:last-child", {
        duration: 0.8,
        opacity: 0,
        x: 20,
        ease: "power3.out",
        delay: 0.2,
      });
      window.gsap.from("footer", {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: "power3.out",
        delay: 0.4,
      });
    }

    // Sync mode selection interaction
    const syncModeCards = document.querySelectorAll(".sync-mode-card");
    syncModeCards.forEach((card) => {
      card.addEventListener("click", () => {
        syncModeCards.forEach((c) => {
          c.classList.remove("border-black", "bg-neutral-50");
          c.classList.add("border-neutral-200");
        });
        card.classList.add("border-black", "bg-neutral-50");
        card.classList.remove("border-neutral-200");
      });
    });

    // Toggle buttons interaction
    const toggleButtons = document.querySelectorAll("button.w-10.h-5");
    toggleButtons.forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", () => {
        const span = toggleBtn.querySelector("span");
        if (span) {
          if (span.classList.contains("translate-x-4")) {
            span.classList.remove("translate-x-4");
            span.classList.add("translate-x-0");
            toggleBtn.classList.replace("bg-black", "bg-neutral-200");
          } else {
            span.classList.remove("translate-x-0");
            span.classList.add("translate-x-4");
            toggleBtn.classList.replace("bg-neutral-200", "bg-black");
          }
        }
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
        <Sidebar activePage="config" />

        {/* Center: Sync Configuration */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/10">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Sync Configuration
              </h2>
              <p className="text-[11px] text-neutral-400">
                Automate data movement and define execution parameters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                Active Path:
              </span>
              <span className="text-[10px] font-bold">
                Contacts → Target_Lake
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-10">
              {/* Schedule Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-neutral-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">
                    Schedule & Automation
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">
                      Frequency
                    </label>
                    <select className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs focus:ring-1 focus:ring-black outline-none">
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Hourly</option>
                      <option>Real-time (CDC)</option>
                      <option>Custom Cron</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">
                      Execution Time
                    </label>
                    <input
                      type="time"
                      defaultValue="04:00"
                      className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs focus:ring-1 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">
                      Timezone
                    </label>
                    <select className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs focus:ring-1 focus:ring-black outline-none">
                      <option>(GMT-05:00) Eastern Time</option>
                      <option>(GMT+00:00) UTC</option>
                      <option>(GMT+01:00) London</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sync Mode & Logic */}
              <div className="pt-10 border-t border-neutral-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Database className="w-4 h-4 text-neutral-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">
                    Sync Mode
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="sync-mode-card p-4 border border-black bg-neutral-50 rounded-sm cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold">
                        Incremental Refresh
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Only sync records updated since the last execution. Best
                      for large tables.
                    </p>
                  </div>
                  <div className="sync-mode-card p-4 border border-neutral-200 hover:border-neutral-400 transition-colors rounded-sm cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Full Overwrite</span>
                      <div className="w-4 h-4 border border-neutral-200 rounded-full"></div>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Wipe target table and replace with all source data every
                      time.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-w-sm">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase">
                    Cursor Field (Watermark)
                  </label>
                  <select className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs">
                    <option>updated_at</option>
                    <option>created_at</option>
                    <option>sync_token</option>
                  </select>
                  <p className="text-[10px] text-neutral-400">
                    Used to identify new or modified rows.
                  </p>
                </div>
              </div>

              {/* Error Handling & Retries */}
              <div className="pt-10 border-t border-neutral-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-neutral-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">
                    Reliability & Recovery
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">
                          Retry on Failure
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Automatic execution recovery
                        </span>
                      </div>
                      <button className="w-10 h-5 bg-black rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none">
                        <span className="translate-x-4 absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"></span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">
                        Max Retry Attempts
                      </label>
                      <input
                        type="number"
                        defaultValue="3"
                        className="w-24 bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">
                          Pause on schema change
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Safety lock for target structure
                        </span>
                      </div>
                      <button className="w-10 h-5 bg-neutral-200 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none">
                        <span className="translate-x-0 absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"></span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">
                        Failure Notification
                      </label>
                      <select className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs">
                        <option>Immediate Email Alert</option>
                        <option>Slack Webhook</option>
                        <option>Silent (Log Only)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar: Config Context */}
        <aside className="w-80 border-l border-neutral-100 bg-neutral-50/20 flex flex-col">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Validation
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-[11px] text-neutral-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Schedule conflicts with no other syncs</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-neutral-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Cursor field indexed in source</span>
                </div>
                <div className="flex items-start gap-2 text-[11px] text-neutral-600">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Estimated row count &gt; 100k per sync</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
                Sync Health Score
              </h3>
              <div className="relative h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-4/5 bg-black"></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-bold">82/100</span>
                <span className="text-[10px] text-neutral-400">OPTIMIZED</span>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <div className="p-4 bg-neutral-900 rounded-sm text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">
                    Estimated Cost
                  </span>
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-sm font-bold">
                  $12.40{" "}
                  <span className="text-[10px] font-normal text-neutral-400">
                    / month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

    </div>
  );
}
