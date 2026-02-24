"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PlayCircle, TrendingDown, Sparkles, ArrowRightCircle } from "lucide-react";
import Sidebar from "../components/Sidebar";

declare global {
  interface Window {
    gsap?: {
      from: (target: string, vars: Record<string, unknown>) => void;
    };
  }
}

type SyncNode = {
  id: string;
  label: string;
  kind: "source" | "destination";
  x: number;
  y: number;
};

type SyncEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  baseThroughput: number;
};

const syncNodes: SyncNode[] = [
  { id: "pg_customers", label: "Postgres Customers", kind: "source", x: 80, y: 80 },
  { id: "stripe", label: "Stripe Subscriptions", kind: "source", x: 80, y: 230 },
  { id: "event_log", label: "Event Log Stream", kind: "source", x: 80, y: 380 },
  { id: "hubspot", label: "HubSpot Contacts", kind: "destination", x: 700, y: 80 },
  { id: "salesforce", label: "Salesforce Accounts", kind: "destination", x: 700, y: 230 },
  { id: "bigquery", label: "BigQuery Warehouse", kind: "destination", x: 700, y: 380 },
];

const syncEdges: SyncEdge[] = [
  {
    id: "pg_to_hubspot",
    source: "pg_customers",
    target: "hubspot",
    label: "contacts upsert",
    baseThroughput: 420,
  },
  {
    id: "pg_to_salesforce",
    source: "pg_customers",
    target: "salesforce",
    label: "account mirror",
    baseThroughput: 280,
  },
  {
    id: "stripe_to_hubspot",
    source: "stripe",
    target: "hubspot",
    label: "deal enrichment",
    baseThroughput: 180,
  },
  {
    id: "events_to_bigquery",
    source: "event_log",
    target: "bigquery",
    label: "analytics batch",
    baseThroughput: 610,
  },
  {
    id: "stripe_to_bigquery",
    source: "stripe",
    target: "bigquery",
    label: "revenue facts",
    baseThroughput: 340,
  },
];

export default function DashboardHome() {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ mouseX: number; mouseY: number; viewX: number; viewY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState({ x: 70, y: 20, scale: 1 });
  const [throughput, setThroughput] = useState<Record<string, number>>(
    Object.fromEntries(syncEdges.map((edge) => [edge.id, edge.baseThroughput]))
  );
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    // Subtle animation for panel entry
    if (typeof window !== "undefined" && window.gsap) {
      window.gsap.from("aside", {
        duration: 0.8,
        opacity: 0,
        x: -30,
        ease: "power3.out",
      });
      window.gsap.from("section > div", {
        duration: 0.8,
        opacity: 0,
        y: 20,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.2,
      });
    }

    // Chat input behavior
    const handleKeyPress = (e: KeyboardEvent) => {
      const input = chatInputRef.current;
      if (e.key === "Enter" && input && input.value.trim() !== "") {
        input.value = "Analyzing intent and mapping schemas...";
        input.disabled = true;

        setTimeout(() => {
          window.location.href = "/dashboard/tables";
        }, 1500);
      }
    };

    const input = chatInputRef.current;
    if (input) {
      input.addEventListener("keypress", handleKeyPress);
      return () => {
        input.removeEventListener("keypress", handleKeyPress);
      };
    }
  }, []);

  useEffect(() => {
    const throughputTimer = setInterval(() => {
      setThroughput((prev) => {
        const next = { ...prev };
        for (const edge of syncEdges) {
          const current = prev[edge.id] ?? edge.baseThroughput;
          const drift = (Math.random() - 0.5) * edge.baseThroughput * 0.18;
          const value = Math.max(40, Math.round(current + drift));
          next[edge.id] = value;
        }
        return next;
      });
      setPulsePhase((phase) => (phase + 1) % 12);
    }, 1200);

    return () => clearInterval(throughputTimer);
  }, []);

  const totalLiveThroughput = useMemo(
    () => Object.values(throughput).reduce((sum, value) => sum + value, 0),
    [throughput]
  );

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(true);
    panRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      viewX: viewport.x,
      viewY: viewport.y,
    };
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!panRef.current) return;

    const deltaX = event.clientX - panRef.current.mouseX;
    const deltaY = event.clientY - panRef.current.mouseY;

    setViewport((prev) => ({
      ...prev,
      x: panRef.current ? panRef.current.viewX + deltaX : prev.x,
      y: panRef.current ? panRef.current.viewY + deltaY : prev.y,
    }));
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    panRef.current = null;
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const cursorX = event.clientX - bounds.left;
    const cursorY = event.clientY - bounds.top;

    setViewport((prev) => {
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const nextScale = Math.max(0.65, Math.min(1.7, prev.scale + delta));

      if (nextScale === prev.scale) return prev;

      const worldX = (cursorX - prev.x) / prev.scale;
      const worldY = (cursorY - prev.y) / prev.scale;

      return {
        x: cursorX - worldX * nextScale,
        y: cursorY - worldY * nextScale,
        scale: nextScale,
      };
    });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <header
        className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 sticky top-0 bg-white z-50"
        style={{ viewTransitionName: "header" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center" style={{ viewTransitionName: "logo" }}>
            <Image src="/logo.svg" alt="Data Sync Planner Logo" width={32} height={32} className="w-8 h-8" />
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

      <main className="flex-1 flex overflow-hidden">
        <Sidebar activePage="home" />

        <section className="flex-1 flex flex-col bg-white overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-8 pb-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">System Overview</h2>
                <p className="text-sm text-neutral-500">Real-time status of your active data pipelines.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                <span className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-sm border border-neutral-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live sync telemetry online
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="p-5 border border-neutral-100 rounded-sm bg-neutral-50/30 group hover:border-black transition-colors">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                  Total Records
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">1,240,492</span>
                  <span className="text-[10px] font-bold text-emerald-600">+12%</span>
                </div>
              </div>
              <div className="p-5 border border-neutral-100 rounded-sm bg-neutral-50/30 group hover:border-black transition-colors">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">Avg Latency</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">24.8ms</span>
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="p-5 border border-neutral-100 rounded-sm bg-neutral-50/30 group hover:border-black transition-colors">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                  Sync Health
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">99.9%</span>
                  <span className="text-[10px] font-bold text-neutral-400">SLO: 99.5%</span>
                </div>
              </div>
              <div className="p-5 border border-neutral-100 rounded-sm bg-neutral-50/30 group hover:border-black transition-colors">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                  Live Throughput
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{totalLiveThroughput.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-neutral-400">rows/min</span>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Live Throughput Visualization</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Drag to pan and scroll to zoom. Streams update in real time.
                </p>
              </div>
              <button
                onClick={() => setViewport({ x: 70, y: 20, scale: 1 })}
                className="text-xs border border-neutral-200 rounded-sm px-3 py-1.5 hover:bg-neutral-50 transition-colors"
              >
                Reset View
              </button>
            </div>

            <div
              ref={canvasRef}
              className={`relative h-[500px] border border-neutral-200 rounded-sm overflow-hidden ${
                isPanning ? "cursor-grabbing" : "cursor-grab"
              }`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleWheel}
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(17,24,39,0.08) 1px, transparent 0), linear-gradient(to bottom, rgba(250,250,250,0.9), rgba(255,255,255,0.95))",
                backgroundSize: "22px 22px, 100% 100%",
              }}
            >
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <polygon points="0 0, 9 4.5, 0 9" fill="#10b981" />
                  </marker>
                </defs>

                <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
                  {syncEdges.map((edge) => {
                    const sourceNode = syncNodes.find((node) => node.id === edge.source);
                    const targetNode = syncNodes.find((node) => node.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const sx = sourceNode.x + 190;
                    const sy = sourceNode.y + 35;
                    const tx = targetNode.x;
                    const ty = targetNode.y + 35;
                    const cp1x = sx + 130;
                    const cp2x = tx - 130;
                    const midX = (sx + tx) / 2;
                    const midY = (sy + ty) / 2;
                    const edgeThroughput = throughput[edge.id] ?? edge.baseThroughput;
                    const strokeWidth = Math.max(2, Math.min(9, edgeThroughput / 90));
                    const packetProgress = ((pulsePhase + Object.keys(throughput).indexOf(edge.id) * 2) % 12) / 12;
                    const packetX = sx + (tx - sx) * packetProgress;
                    const packetY = sy + (ty - sy) * packetProgress;

                    return (
                      <g key={edge.id}>
                        <path
                          d={`M${sx},${sy} C${cp1x},${sy} ${cp2x},${ty} ${tx},${ty}`}
                          stroke="#10b981"
                          strokeOpacity="0.85"
                          strokeWidth={strokeWidth}
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />

                        <circle cx={packetX} cy={packetY} r={5} fill="#111827" opacity="0.8" />

                        <g transform={`translate(${midX - 55} ${midY - 16})`}>
                          <rect width="110" height="32" rx="4" fill="white" stroke="#e5e7eb" />
                          <text x="8" y="13" fontSize="9" fill="#6b7280" style={{ textTransform: "uppercase" }}>
                            {edge.label}
                          </text>
                          <text x="8" y="24" fontSize="11" fill="#111827" fontWeight="700">
                            {edgeThroughput.toLocaleString()} rows/min
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {syncNodes.map((node) => (
                    <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                      <rect
                        width="190"
                        height="70"
                        rx="6"
                        fill="white"
                        stroke={node.kind === "source" ? "#2563eb" : "#0f766e"}
                        strokeWidth="1.5"
                      />
                      <text x="12" y="22" fontSize="9" fill="#6b7280" style={{ textTransform: "uppercase" }}>
                        {node.kind}
                      </text>
                      <text x="12" y="44" fontSize="13" fontWeight="700" fill="#111827">
                        {node.label}
                      </text>
                      <circle cx="170" cy="17" r="4" fill={node.kind === "source" ? "#2563eb" : "#0f766e"} />
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>

          <div className="p-8 pt-5 border-t border-neutral-100 bg-white">
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-neutral-200 rounded-lg blur opacity-30 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"></div>
                <div className="relative flex items-center bg-white border border-neutral-200 rounded-lg shadow-sm">
                  <div className="pl-4 pr-2">
                    <Sparkles className="w-5 h-5 text-neutral-400 group-focus-within:text-black transition-colors" />
                  </div>
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="Describe a sync operation... (e.g., 'Map Stripe customers to Salesforce accounts every hour')"
                    className="flex-1 bg-transparent border-none py-5 px-4 text-sm focus:outline-none placeholder:text-neutral-400 font-medium"
                  />
                  <div className="pr-4">
                    <button className="bg-black text-white rounded px-4 py-1.5 text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2">
                      Generate Plan
                      <ArrowRightCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Recent Prompts:</p>
                <button className="text-[11px] text-neutral-500 hover:text-black transition-colors">
                  &quot;Sync contacts from Postgres to Hubspot&quot;
                </button>
                <button className="text-[11px] text-neutral-500 hover:text-black transition-colors">
                  &quot;Alert if sync failure exceeds 5%&quot;
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
