"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PlayCircle,
  Database,
  CheckCircle2,
  XCircle,
  Plus,
  ExternalLink,
  RefreshCw,
  Trash2,
  Lock,
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
  created_at: string;
  last_tested_at?: string;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // HubSpot form state
  const [hubspotToken, setHubspotToken] = useState("");
  const [showHubspotForm, setShowHubspotForm] = useState(false);
  
  // PostgreSQL form state
  const [postgresUrl, setPostgresUrl] = useState("");
  const [postgresPassword, setPostgresPassword] = useState("");
  const [showPostgresForm, setShowPostgresForm] = useState(false);

  useEffect(() => {
    loadConnections();

    // Check for success/error messages in URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const successParam = params.get("success");
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
    
    if (successParam) {
      setSuccess("Hubspot connected successfully!");
      loadConnections();
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
      setTimeout(() => setSuccess(""), 5000);
    }

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

  const loadConnections = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectHubspot = async () => {
    if (!hubspotToken.trim()) {
      setError("Please enter a HubSpot personal access token");
      return;
    }

    setConnecting(true);
    setError("");
    try {
      // Call server-side API to validate token and save connection
      const response = await fetch("/api/integrations/hubspot/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: hubspotToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect HubSpot");
      }

      setSuccess("HubSpot connected successfully!");
      setHubspotToken("");
      setShowHubspotForm(false);
      await loadConnections();
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (error: any) {
      setError(error.message || "Failed to connect Hubspot");
    } finally {
      setConnecting(false);
    }
  };

  const connectPostgres = async () => {
    if (!postgresUrl.trim()) {
      setError("Please enter a PostgreSQL connection URL");
      return;
    }

    setConnecting(true);
    setError("");
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Parse connection URL and handle password
      let connectionString = postgresUrl.trim();
      
      // If password is provided separately, insert/replace it in the URL
      if (postgresPassword.trim()) {
        // Handle format: postgresql://user:password@host:port/database
        // Replace password if it exists, or insert it
        if (connectionString.includes("@")) {
          // URL has @ symbol, check if password is already there
          const urlPattern = /postgresql:\/\/([^:]+):([^@]+)@(.+)/;
          const match = connectionString.match(urlPattern);
          
          if (match) {
            // Password already in URL, replace it
            const username = match[1];
            const hostPart = match[3];
            connectionString = `postgresql://${username}:${encodeURIComponent(postgresPassword)}@${hostPart}`;
          } else {
            // No password in URL, insert it before @
            connectionString = connectionString.replace(
              /postgresql:\/\/([^@]+)@/,
              `postgresql://$1:${encodeURIComponent(postgresPassword)}@`
            );
          }
        } else {
          // No @ symbol, add user:password@ before the first /
          const urlPattern = /postgresql:\/\/([^\/]+)/;
          const match = connectionString.match(urlPattern);
          if (match) {
            const hostPart = match[1];
            connectionString = connectionString.replace(
              urlPattern,
              `postgresql://postgres:${encodeURIComponent(postgresPassword)}@${hostPart}`
            );
          }
        }
      }

      // Validate URL format
      try {
        new URL(connectionString);
      } catch {
        throw new Error("Invalid PostgreSQL connection URL format");
      }

      // Store connection in database
      const { data, error: dbError } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          name: "PostgreSQL Database",
          type: "postgresql",
          status: "active",
          host: extractHostFromUrl(connectionString),
          metadata: {
            connection_string: connectionString, // TODO: Encrypt this!
            connected_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setSuccess("PostgreSQL connected successfully!");
      setPostgresUrl("");
      setPostgresPassword("");
      setShowPostgresForm(false);
      await loadConnections();
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (error: any) {
      setError(error.message || "Failed to connect PostgreSQL");
    } finally {
      setConnecting(false);
    }
  };

  const extractHostFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // If URL parsing fails, try to extract hostname manually
      // Format: postgresql://user:password@host:port/database
      const match = url.match(/@([^:/]+)/);
      return match ? match[1] : "unknown";
    }
  };

  const disconnectConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
      await loadConnections();
    } catch (error: any) {
      alert(error.message || "Failed to disconnect");
    }
  };

  const testConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      if (error) throw error;
      await loadConnections();
    } catch (error: any) {
      alert(error.message || "Failed to test connection");
    }
  };

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
        <Sidebar activePage="integrations" />

        {/* Center: Integrations */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Integrations
                </h2>
                <p className="text-xs text-neutral-400">
                  Connect your data sources and destinations
                </p>
              </div>
              <button
                onClick={loadConnections}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-600">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-sm text-emerald-600">
                {success}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Available Integrations */}
            <div className="mb-12">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">
                Available Integrations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Hubspot Card */}
                <div className="p-6 border border-neutral-200 rounded-sm hover:border-black transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-sm flex items-center justify-center">
                      <Database className="w-6 h-6 text-orange-600" />
                    </div>
                    {connections.some((c) => c.type === "hubspot") && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold mb-1">Hubspot</h4>
                  <p className="text-xs text-neutral-500 mb-4">
                    Sync contacts, deals, and companies from your Hubspot CRM using a personal access token.
                  </p>
                  {connections.some((c) => c.type === "hubspot") ? (
                    <button
                      onClick={() =>
                        disconnectConnection(
                          connections.find((c) => c.type === "hubspot")!.id
                        )
                      }
                      className="w-full py-2 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Disconnect
                    </button>
                  ) : showHubspotForm ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                          Personal Access Token
                        </label>
                        <input
                          type="password"
                          value={hubspotToken}
                          onChange={(e) => setHubspotToken(e.target.value)}
                          placeholder="pat-na1-..."
                          className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1">
                          Get your token from HubSpot Settings → Integrations → Private Apps
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={connectHubspot}
                          disabled={connecting || !hubspotToken.trim()}
                          className="flex-1 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm disabled:opacity-50"
                        >
                          {connecting ? "Connecting..." : "Connect"}
                        </button>
                        <button
                          onClick={() => {
                            setShowHubspotForm(false);
                            setHubspotToken("");
                          }}
                          className="px-3 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHubspotForm(true)}
                      className="w-full py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Connect Hubspot
                    </button>
                  )}
                </div>

                {/* Postgres Card */}
                <div className="p-6 border border-neutral-200 rounded-sm hover:border-black transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-sm flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    {connections.some((c) => c.type === "postgresql") && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold mb-1">PostgreSQL</h4>
                  <p className="text-xs text-neutral-500 mb-4">
                    Connect to your PostgreSQL database using a connection URL.
                  </p>
                  {connections.some((c) => c.type === "postgresql") ? (
                    <button
                      onClick={() =>
                        disconnectConnection(
                          connections.find((c) => c.type === "postgresql")!.id
                        )
                      }
                      className="w-full py-2 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Disconnect
                    </button>
                  ) : showPostgresForm ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                          Connection URL
                        </label>
                        <input
                          type="text"
                          value={postgresUrl}
                          onChange={(e) => setPostgresUrl(e.target.value)}
                          placeholder="postgresql://postgres:password@host:5432/database"
                          className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black font-mono"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1">
                          Format: postgresql://user:password@host:port/database
                          <br />
                          Example: postgresql://postgres:password@db.example.com:5432/postgres
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                          Password (optional)
                        </label>
                        <input
                          type="password"
                          value={postgresPassword}
                          onChange={(e) => setPostgresPassword(e.target.value)}
                          placeholder="Enter password if not in URL above"
                          className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1">
                          If password is already in the URL (like Supabase format), leave this empty
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={connectPostgres}
                          disabled={connecting || !postgresUrl.trim()}
                          className="flex-1 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm disabled:opacity-50"
                        >
                          {connecting ? "Connecting..." : "Connect"}
                        </button>
                        <button
                          onClick={() => {
                            setShowPostgresForm(false);
                            setPostgresUrl("");
                            setPostgresPassword("");
                          }}
                          className="px-3 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPostgresForm(true)}
                      className="w-full py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Connect PostgreSQL
                    </button>
                  )}
                </div>

                {/* MySQL Card */}
                <div className="p-6 border border-neutral-200 rounded-sm hover:border-black transition-colors group cursor-pointer opacity-60">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-sm flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold mb-1">MySQL</h4>
                  <p className="text-xs text-neutral-500 mb-4">
                    Connect to your MySQL database
                  </p>
                  <button
                    disabled
                    className="w-full py-2 text-xs font-medium border border-neutral-200 text-neutral-400 rounded-sm"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>

            {/* Active Connections */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">
                Active Connections ({connections.length})
              </h3>

              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-neutral-300 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Loading connections...</p>
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 rounded-sm">
                  <Database className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-neutral-600 mb-1">
                    No connections yet
                  </p>
                  <p className="text-xs text-neutral-400">
                    Connect an integration to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="p-4 border border-neutral-100 rounded-sm hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-100 rounded-sm flex items-center justify-center">
                            <Database className="w-5 h-5 text-neutral-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">
                                {connection.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  connection.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}
                              >
                                {connection.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-neutral-400 uppercase">
                                {connection.type}
                              </span>
                              {connection.last_tested_at && (
                                <span className="text-[10px] text-neutral-400">
                                  Tested{" "}
                                  {new Date(
                                    connection.last_tested_at
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => testConnection(connection.id)}
                            className="p-2 text-neutral-400 hover:text-black transition-colors"
                            title="Test Connection"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => disconnectConnection(connection.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Disconnect"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
