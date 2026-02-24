"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  PlayCircle,
  ArrowRight,
  Hash,
  Type,
  Mail,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Info,
  Scissors,
  CaseSensitive,
  X,
  RefreshCw,
  PlusCircle,
  CalendarClock,
  Box,
  Database,
  Loader2,
  Search,
  User,
  Briefcase,
  Building2,
} from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

declare global {
  interface Window {
    gsap: any;
  }
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  max_length: number | null;
  precision: number | null;
  scale: number | null;
}

interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description: string;
  required: boolean;
  readOnly: boolean;
  options: any[];
}

interface Mapping {
  sourceField: string;
  destinationField: string;
  isRequired: boolean;
}

export default function MapperPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");

  const [columns, setColumns] = useState<Column[]>([]);
  const [hubspotProperties, setHubspotProperties] = useState<HubSpotProperty[]>([]);
  const [mappings, setMappings] = useState<Map<string, Mapping>>(new Map());
  const [selectedSourceField, setSelectedSourceField] = useState<string>("");
  const [selectedDestinationField, setSelectedDestinationField] = useState<string>("");
  const [tableInfo, setTableInfo] = useState<{ schema: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Property selector modal state
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [modalObjectType, setModalObjectType] = useState<"contacts" | "deals" | "companies" | "custom">("contacts");
  const [propertySearch, setPropertySearch] = useState("");
  const [customPropertyName, setCustomPropertyName] = useState("");
  const [customPropertyType, setCustomPropertyType] = useState("string");
  const [currentHubspotObjectType, setCurrentHubspotObjectType] = useState<"contacts" | "deals" | "companies">("contacts");

  useEffect(() => {
    if (!tableId) {
      setError("No table selected. Please go back and select a table.");
      setLoading(false);
      return;
    }

    loadData();
  }, [tableId]);

  useEffect(() => {
    // Reload properties when modal object type changes (only if modal is open)
    if (showPropertyModal && modalObjectType !== "custom" && !loading) {
      loadHubSpotProperties(modalObjectType);
    }
  }, [modalObjectType, showPropertyModal]);

  const loadHubSpotProperties = async (objectType: "contacts" | "deals" | "companies") => {
    try {
      const propertiesResponse = await fetch(`/api/hubspot/properties?objectType=${objectType}`);
      const propertiesData = await propertiesResponse.json();

      if (!propertiesResponse.ok) {
        throw new Error(propertiesData.error || "Failed to load HubSpot properties");
      }

      setHubspotProperties(propertiesData.properties);
    } catch (error: any) {
      console.error("Error loading HubSpot properties:", error);
      setHubspotProperties([]);
    }
  };

  const loadExistingMappings = async () => {
    if (!tableId) return;

    try {
      const response = await fetch(`/api/mappings/load?tableId=${tableId}`);
      const data = await response.json();

      if (response.ok && data.mappings) {
        const mappingsMap = new Map<string, Mapping>();
        data.mappings.forEach((m: any) => {
          mappingsMap.set(m.source_field_name, {
            sourceField: m.source_field_name,
            destinationField: m.destination_field_name,
            isRequired: m.is_required || false,
          });
          // Update current object type if we have mappings
          if (m.hubspot_object_type && !currentHubspotObjectType) {
            setCurrentHubspotObjectType(m.hubspot_object_type);
          }
        });
        setMappings(mappingsMap);
      }
    } catch (error: any) {
      console.error("Error loading existing mappings:", error);
      // Don't show error to user, just start with empty mappings
    }
  };

  const loadData = async () => {
    if (!tableId) return;

    setLoading(true);
    setError("");

    try {
      // Load columns from selected table
      const columnsResponse = await fetch("/api/tables/columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceTableId: tableId }),
      });

      const columnsData = await columnsResponse.json();

      if (!columnsResponse.ok) {
        throw new Error(columnsData.error || "Failed to load columns");
      }

      setColumns(columnsData.columns);
      setTableInfo(columnsData.table);

      // Load HubSpot properties for contacts (default)
      await loadHubSpotProperties("contacts");

      // Load existing mappings
      await loadExistingMappings();
    } catch (error: any) {
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const createMapping = async (sourceField: string, destinationField: string) => {
    if (!tableId) {
      setError("No table selected");
      return;
    }

    // Find source column info
    const sourceColumn = columns.find((c) => c.name === sourceField);
    if (!sourceColumn) {
      setError("Source column not found");
      return;
    }

    // Find destination property info (if it's a standard property)
    const destProperty = hubspotProperties.find((p) => p.name === destinationField);
    const isRequired = destProperty?.required || false;
    const destinationFieldType = destProperty?.type || customPropertyType || "string";

    try {
      // Save to database
      const response = await fetch("/api/mappings/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId,
          sourceFieldName: sourceField,
          sourceFieldType: sourceColumn.type,
          destinationFieldName: destinationField,
          destinationFieldType,
          isRequired,
          hubspotObjectType: currentHubspotObjectType, // Pass the selected object type
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save mapping");
      }

      // Update local state only after successful save
      const newMappings = new Map(mappings);
      newMappings.set(sourceField, {
        sourceField,
        destinationField,
        isRequired,
      });
      setMappings(newMappings);
      setSelectedSourceField("");
      setSelectedDestinationField("");
      setShowPropertyModal(false);
      setPropertySearch("");
      setCustomPropertyName("");
      setCustomPropertyType("string");
      setError(""); // Clear any previous errors
    } catch (error: any) {
      console.error("Error saving mapping:", error);
      setError(error.message || "Failed to save mapping");
    }
  };

  const removeMapping = async (sourceField: string) => {
    if (!tableId) {
      setError("No table selected");
      return;
    }

    try {
      // Delete from database
      const response = await fetch("/api/mappings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableId,
          sourceFieldName: sourceField,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete mapping");
      }

      // Update local state only after successful delete
      const newMappings = new Map(mappings);
      newMappings.delete(sourceField);
      setMappings(newMappings);
      setError(""); // Clear any previous errors
    } catch (error: any) {
      console.error("Error deleting mapping:", error);
      setError(error.message || "Failed to delete mapping");
    }
  };

  const getMappedDestination = (sourceField: string): string | null => {
    return mappings.get(sourceField)?.destinationField || null;
  };

  const isPropertyMapped = (propertyName: string): boolean => {
    return Array.from(mappings.values()).some((m) => m.destinationField === propertyName);
  };

  const getColumnIcon = (type: string) => {
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal")) {
      return Hash;
    }
    if (type.includes("date") || type.includes("time")) {
      return Calendar;
    }
    if (type.includes("text") || type.includes("varchar") || type.includes("char")) {
      return Type;
    }
    return Database;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (error || !tableId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "No table selected"}</p>
          <a
            href="/dashboard/tables"
            className="px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm"
          >
            Go Back to Tables
          </a>
        </div>
      </div>
    );
  }

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
          <a
            href="/dashboard/config"
            id="cta-save-btn"
            className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm"
          >
            Save Draft
          </a>
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
        <Sidebar activePage="mapper" />

        {/* Center: Property Mapper */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard/tables"
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180 text-neutral-400" />
                </a>
                <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Property Mapper
                </h2>
                  <p className="text-xs text-neutral-400">
                    {tableInfo
                      ? `Mapping ${tableInfo.schema}.${tableInfo.name} to HubSpot`
                      : "Map source columns to HubSpot properties"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {mappings.size}/{columns.length} Fields Mapped
                </div>
                <button
                  onClick={loadData}
                  className="text-[11px] font-bold text-neutral-900 underline underline-offset-4 decoration-neutral-300"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-[1fr_40px_1fr] gap-0 max-w-4xl mx-auto">
              {/* Column Headers */}
              <div className="pb-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Source: {tableInfo?.name || "Table"}
              </div>
              <div></div>
              <div className="pb-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-4">
                Destination: HubSpot
              </div>

              {/* Mapping Rows */}
              {columns.map((column, index) => {
                const ColumnIcon = getColumnIcon(column.type);
                const mappedTo = getMappedDestination(column.name);
                const isSelected = selectedSourceField === column.name;

                return (
                  <div key={column.name} className="col-span-3 grid grid-cols-[1fr_40px_1fr] gap-0 mb-4">
                    {/* Source Column */}
                    <div
                      className={`group cursor-pointer ${
                        isSelected ? "z-20" : ""
                      }`}
                      onClick={() => {
                        if (mappedTo) return;
                        setSelectedSourceField(
                          selectedSourceField === column.name ? "" : column.name
                        );
                      }}
                    >
                      <div
                        className={`p-4 border rounded-l-sm transition-colors flex items-center justify-between ${
                          mappedTo
                            ? "border-black bg-white"
                            : isSelected
                            ? "border-black bg-neutral-50"
                            : "border-neutral-200 bg-white group-hover:border-neutral-400"
                        }`}
                      >
                  <div className="flex items-center gap-3">
                          <ColumnIcon className="w-5 h-5 text-neutral-300" />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{column.name}</span>
                  <span className="text-[10px] text-neutral-400 font-mono uppercase">
                              {column.type}
                  </span>
                </div>
              </div>
                        {mappedTo && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                </div>
              </div>

                    {/* Arrow */}
              <div className="flex items-center justify-center">
                      {mappedTo ? (
                        <ArrowRight className="text-black w-5 h-5" />
                      ) : isSelected ? (
                        <ArrowRight className="text-neutral-400 w-5 h-5 animate-pulse" />
                      ) : (
                        <ArrowRight className="text-neutral-300 w-5 h-5" />
                      )}
              </div>

                    {/* Destination Property */}
              <div className="group cursor-pointer">
                      {mappedTo ? (
                        <div className="p-4 border border-black bg-white rounded-r-sm transition-colors flex items-center justify-between ring-1 ring-black shadow-sm">
                          <span className="text-xs font-bold">{mappedTo}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMapping(column.name);
                            }}
                            className="text-neutral-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                  </div>
                      ) : isSelected ? (
                        <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-r-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPropertyModal(true);
                              setModalObjectType("contacts");
                              setCurrentHubspotObjectType("contacts");
                              setPropertySearch("");
                            }}
                            className="w-full bg-white border border-neutral-200 rounded-sm py-2 px-3 text-xs text-left hover:border-black transition-colors flex items-center justify-between"
                          >
                            <span className="text-neutral-400">Select HubSpot property...</span>
                            <Plus className="w-4 h-4 text-neutral-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-r-sm group-hover:border-neutral-400 transition-colors flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 italic font-normal">
                    Add Mapping...
                  </span>
                          <Plus className="text-neutral-400 w-4 h-4" />
                </div>
                      )}
              </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sidebar: Field Settings */}
        <aside className="w-80 border-l border-neutral-100 bg-neutral-50/20 flex flex-col">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Mapping Summary
                </h3>
                <Info className="text-neutral-300 w-4 h-4" />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                    Total Columns
                  </div>
                  <div className="text-sm font-bold">{columns.length}</div>
                </div>
                <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                    Mapped
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {mappings.size}
                  </div>
                </div>
                <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase mb-1">
                    Remaining
                  </div>
                  <div className="text-sm font-bold">
                    {columns.length - mappings.size}
                  </div>
                </div>
              </div>
            </div>

            {selectedSourceField && (
            <div className="pt-6 border-t border-neutral-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
                  Selected Field
                </h3>
                <div className="p-3 bg-white border border-neutral-100 rounded-sm">
                  <div className="text-xs font-bold mb-1">{selectedSourceField}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {columns.find((c) => c.name === selectedSourceField)?.type}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Property Selector Modal */}
      {showPropertyModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowPropertyModal(false);
            setPropertySearch("");
            setCustomPropertyName("");
            setCustomPropertyType("string");
          }}
        >
          <div
            className="bg-white rounded-sm shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select HubSpot Property</h3>
                <button
                  onClick={() => {
                    setShowPropertyModal(false);
                    setPropertySearch("");
                    setCustomPropertyName("");
                    setCustomPropertyType("string");
                  }}
                  className="p-1 hover:bg-neutral-100 rounded-sm transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-neutral-200">
                <button
                  onClick={() => {
                    setModalObjectType("contacts");
                    setPropertySearch("");
                  }}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    modalObjectType === "contacts"
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-black"
                  }`}
                >
                  Contacts
                </button>
                <button
                  onClick={() => {
                    setModalObjectType("companies");
                    setCurrentHubspotObjectType("companies");
                    setPropertySearch("");
                  }}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    modalObjectType === "companies"
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-black"
                  }`}
                >
                  Companies
                </button>
                <button
                  onClick={() => {
                    setModalObjectType("deals");
                    setCurrentHubspotObjectType("deals");
                    setPropertySearch("");
                  }}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    modalObjectType === "deals"
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-black"
                  }`}
                >
                  Deals
                </button>
                <button
                  onClick={() => {
                    setModalObjectType("custom");
                    setPropertySearch("");
                  }}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    modalObjectType === "custom"
                      ? "border-black text-black"
                      : "border-transparent text-neutral-400 hover:text-black"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {modalObjectType === "custom" ? (
                /* Custom Property Form */
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      Property Internal Name
                    </label>
                    <input
                      type="text"
                      value={customPropertyName}
                      onChange={(e) => setCustomPropertyName(e.target.value)}
                      placeholder="e.g., custom_field_1"
                      className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black font-mono"
                      autoFocus
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      The internal name used in HubSpot API (e.g., hs_custom_field_123)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      Property Type
                    </label>
                    <select
                      value={customPropertyType}
                      onChange={(e) => setCustomPropertyType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="bool">Boolean</option>
                      <option value="enumeration">Enumeration</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        if (customPropertyName.trim() && selectedSourceField) {
                          createMapping(selectedSourceField, customPropertyName.trim());
                        }
                      }}
                      disabled={!customPropertyName.trim() || !selectedSourceField}
                      className="flex-1 px-4 py-2 text-xs font-semibold bg-black text-white hover:bg-neutral-800 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Mapping
                    </button>
                    <button
                      onClick={() => {
                        setShowPropertyModal(false);
                        setCustomPropertyName("");
                        setCustomPropertyType("string");
                      }}
                      className="px-4 py-2 text-xs font-medium border border-neutral-200 hover:bg-neutral-50 transition-colors rounded-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Properties List */
                <>
                  {/* Search Bar */}
                  <div className="p-4 border-b border-neutral-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        placeholder="Search properties..."
                        className="w-full pl-10 pr-3 py-2 text-xs border border-neutral-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>

                  {/* Properties List */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {hubspotProperties.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-neutral-400">Loading properties...</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {hubspotProperties
                          .filter((p) => {
                            if (propertySearch.trim()) {
                              const search = propertySearch.toLowerCase();
                              return (
                                p.name.toLowerCase().includes(search) ||
                                p.label.toLowerCase().includes(search)
                              );
                            }
                            return !isPropertyMapped(p.name);
                          })
                          .map((prop) => (
                            <button
                              key={prop.name}
                              onClick={() => {
                                if (selectedSourceField) {
                                  createMapping(selectedSourceField, prop.name);
                                }
                              }}
                              disabled={isPropertyMapped(prop.name) || !selectedSourceField}
                              className="w-full text-left p-3 border border-neutral-200 rounded-sm hover:border-black hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-semibold">{prop.label}</div>
                                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                    {prop.name}
                                  </div>
                                  {prop.description && (
                                    <div className="text-[10px] text-neutral-500 mt-1">
                                      {prop.description}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {prop.required && (
                                    <span className="text-[10px] font-bold text-red-600">*</span>
                                  )}
                                  <span className="text-[10px] text-neutral-400 uppercase">
                                    {prop.type}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        {hubspotProperties.filter((p) => {
                          if (propertySearch.trim()) {
                            const search = propertySearch.toLowerCase();
                            return (
                              p.name.toLowerCase().includes(search) ||
                              p.label.toLowerCase().includes(search)
                            );
                          }
                          return !isPropertyMapped(p.name);
                        }).length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-xs text-neutral-400">
                              {propertySearch.trim()
                                ? "No properties found matching your search"
                                : "All properties are already mapped"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
