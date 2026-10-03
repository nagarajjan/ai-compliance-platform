"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  ChevronRight,
  FolderOpen,
  FileCode,
  ShieldCheck,
  Zap,
  BookOpen,
  Key,
  Globe,
  Settings,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
} from "lucide-react";

const BACKEND_URL = "http://localhost:8000";

interface SourceMeta {
  source: string;
  chunk_id: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

interface ChartConfig {
  title: string;
  type?: "bar" | "line" | "pie";
  xAxis?: string;
  yAxis?: string;
  threshold?: number;
  thresholdLabel?: string;
  data: ChartDataPoint[];
}

function parseChartFromMarkdown(text: string | null): { chart: ChartConfig | null; cleanText: string } {
  if (!text) return { chart: null, cleanText: "" };
  const chartRegex = /```chart\s*([\s\S]*?)\s*```/;
  const match = text.match(chartRegex);
  if (!match) return { chart: null, cleanText: text };

  try {
    const chart: ChartConfig = JSON.parse(match[1]);
    const cleanText = text.replace(chartRegex, "").trim();
    return { chart, cleanText };
  } catch (e) {
    console.error("Failed to parse chart JSON:", e);
    return { chart: null, cleanText: text };
  }
}

function ComplianceChart({ chart }: { chart: ChartConfig }) {
  const [hovered, setHovered] = useState<ChartDataPoint | null>(null);
  const data = chart.data || [];
  const maxValue = Math.max(...data.map((d) => d.value), chart.threshold || 0, 1);

  return (
    <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-6 my-4 shadow-xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-950/80 border border-indigo-700/60 rounded-xl">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>{chart.title}</span>
            </h4>
            {chart.yAxis && (
              <p className="text-[11px] text-slate-400">
                Metric: <span className="text-slate-300 font-mono">{chart.yAxis}</span>
              </p>
            )}
          </div>
        </div>

        {chart.threshold && (
          <div className="flex items-center space-x-2">
            <span className="text-[11px] bg-red-950/80 text-red-300 border border-red-800/60 px-3 py-1 rounded-full font-mono flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{chart.thresholdLabel || "SLA Limit"}: {chart.threshold}</span>
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Visualization */}
      <div className="relative pt-8">
        <div className="flex items-end space-x-3 sm:space-x-5 h-64 px-4 border-b border-l border-slate-800 pb-2">
          {data.map((item, idx) => {
            const barHeightPx = Math.max(16, Math.round((item.value / (maxValue * 1.15)) * 170));
            const isBreach = chart.threshold && item.value > chart.threshold;
            const isWarning = chart.threshold && item.value > chart.threshold * 0.85 && !isBreach;
            const barColor =
              item.fill || (isBreach ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e");

            return (
              <div
                key={idx}
                className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 border border-slate-700 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20 font-mono flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barColor }} />
                  <span>{item.name}:</span>
                  <strong>{item.value} {chart.yAxis || ""}</strong>
                </div>

                {/* Value on top of bar */}
                <span className="text-[11px] font-mono font-semibold text-slate-300 mb-1.5 group-hover:text-white transition-colors">
                  {item.value}
                </span>

                {/* Visible Colored Bar */}
                <div
                  className="w-full max-w-[48px] rounded-t-lg transition-all duration-500 ease-out hover:brightness-125 border-t border-x"
                  style={{
                    height: `${barHeightPx}px`,
                    backgroundColor: barColor,
                    borderColor: `${barColor}aa`,
                    boxShadow: `0 0 16px ${barColor}55`,
                  }}
                />

                {/* X Axis Label */}
                <span className="text-[11px] text-slate-400 mt-2 truncate w-full text-center group-hover:text-indigo-300 font-mono font-medium">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Threshold dashed line */}
        {chart.threshold && (
          <div
            className="absolute left-4 right-0 border-t-2 border-dashed border-red-500/80 pointer-events-none z-10"
            style={{
              bottom: `${Math.round((chart.threshold / (maxValue * 1.15)) * 170) + 32}px`,
            }}
          >
            <span className="absolute right-2 -top-4 text-[10px] font-mono text-red-300 bg-slate-950 px-2 py-0.5 border border-red-800/80 rounded shadow-md">
              {chart.thresholdLabel || "SLA Threshold"} ({chart.threshold})
            </span>
          </div>
        )}
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between mt-5 text-[11px] text-slate-400 pt-3 border-t border-slate-900 flex-wrap gap-2">
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Compliant / OK</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Warning (Near SLA)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>SLA Breach</span>
          </div>
        </div>

        <span className="text-[10px] text-indigo-400 font-mono">
          Interactive SVG Chart · Hover on bars for metric details
        </span>
      </div>
    </div>
  );
}

const PROVIDER_MODELS: Record<string, string[]> = {
  ollama: ["llama3.2", "mistral", "phi3", "qwen2.5:7b", "deepseek-r1:8b", "gemma2"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  // JEV Auto-router: backend selects model/tier based on query complexity
  auto: ["auto — JEV decides"],
};

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"documents" | "templates" | "query" | "report">("query");

  // System Status
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  // Provider & Model State
  const [provider, setProvider] = useState<"ollama" | "openai" | "anthropic" | "google" | "deepseek" | "auto">("ollama");
  const [availableModels, setAvailableModels] = useState<string[]>(PROVIDER_MODELS.ollama);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2");
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [routingInfo, setRoutingInfo] = useState<string | null>(null);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<string[]>(["demo"]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>("demo");
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>("");
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);

  // Templates
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Upload state
  const [selectedDocFiles, setSelectedDocFiles] = useState<FileList | null>(null);
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<File | null>(null);

  // Query State
  const [queryPrompt, setQueryPrompt] = useState<string>(
    "Please analyze all uploaded files for a complete compliance overview including encryption profiles, latency metrics and vulnerabilities."
  );
  const [topK, setTopK] = useState<number>(5);
  const [maxTokens, setMaxTokens] = useState<number>(800);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [queryResult, setQueryResult] = useState<{ answer: string; sources: SourceMeta[]; workspace?: string } | null>(null);

  // Report State
  const [reportQuery, setReportQuery] = useState<string>(
    "Complete compliance overview with encryption profiles, edge gateway latency metrics and active vulnerabilities with inline citations"
  );
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Initial loads
  useEffect(() => {
    checkHealth();
    fetchOllamaModels();
    fetchWorkspaces();
    fetchTemplates();
    try {
      const savedProvider = localStorage.getItem("preferred_provider");
      if (savedProvider && ["ollama", "openai", "anthropic", "google", "deepseek", "auto"].includes(savedProvider)) {
        setProvider(savedProvider as any);
        const savedKey = localStorage.getItem(`api_key_${savedProvider}`);
        if (savedKey) setApiKey(savedKey);
      }
      const savedReport = localStorage.getItem("last_generated_report");
      if (savedReport) setGeneratedReport(savedReport);
    } catch {}
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceFiles(currentWorkspace);
    }
  }, [currentWorkspace]);

  // Handle provider switch
  useEffect(() => {
    try {
      localStorage.setItem("preferred_provider", provider);
      const savedKey = localStorage.getItem(`api_key_${provider}`);
      setApiKey(savedKey || "");
    } catch {}

    if (provider === "auto") {
      setAvailableModels(["auto — JEV decides"]);
      setSelectedModel("auto — JEV decides");
    } else if (provider === "ollama") {
      fetchOllamaModels();
    } else {
      const models = PROVIDER_MODELS[provider] || [];
      setAvailableModels(models);
      setSelectedModel(models[0] || "");
    }
  }, [provider]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      setBackendHealth(res.ok);
    } catch {
      setBackendHealth(false);
    }
  };

  const fetchOllamaModels = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models`);
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          setSelectedModel(data.models[0]);
        }
      }
    } catch {
      setAvailableModels(PROVIDER_MODELS.ollama);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setWorkspaces(data);
          if (!data.includes(currentWorkspace)) {
            setCurrentWorkspace(data[0]);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching workspaces:", e);
    }
  };

  const fetchWorkspaceFiles = async (ws: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/${ws}/files`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceFiles(data);
      } else {
        setWorkspaceFiles([]);
      }
    } catch {
      setWorkspaceFiles([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      }
    } catch (e) {
      console.error("Error fetching templates:", e);
    }
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    const name = newWorkspaceName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!workspaces.includes(name)) {
      setWorkspaces([...workspaces, name]);
    }
    setCurrentWorkspace(name);
    setNewWorkspaceName("");
  };

  const handleUploadDocs = async () => {
    if (!selectedDocFiles || selectedDocFiles.length === 0) return;
    setLoading(true);
    setStatusMsg({ type: "info", text: "Uploading document files..." });

    const formData = new FormData();
    for (let i = 0; i < selectedDocFiles.length; i++) {
      formData.append("files", selectedDocFiles[i]);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload?workspace=${currentWorkspace}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: `Uploaded ${data.files.length} file(s) successfully.` });
        fetchWorkspaceFiles(currentWorkspace);
        setSelectedDocFiles(null);
      } else {
        setStatusMsg({ type: "error", text: data.detail || "Upload failed." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: `Upload error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTemplate = async () => {
    if (!selectedTemplateFile) return;
    setLoading(true);
    setStatusMsg({ type: "info", text: "Uploading report template..." });

    const formData = new FormData();
    formData.append("file", selectedTemplateFile);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload-template`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: `Template '${data.template}' uploaded successfully.` });
        fetchTemplates();
        setSelectedTemplate(data.template);
        setSelectedTemplateFile(null);
      } else {
        setStatusMsg({ type: "error", text: data.detail || "Template upload failed." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: `Template upload error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerIndex = async () => {
    setLoading(true);
    setStatusMsg({ type: "info", text: "Extracting text via pdfplumber & indexing into ChromaDB..." });

    try {
      const res = await fetch(`${BACKEND_URL}/api/index?workspace=${currentWorkspace}`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: `Workspace '${data.workspace}' indexed! Total Chunks: ${data.total_chunks}`,
        });
      } else {
        setStatusMsg({ type: "error", text: data.detail || "Indexing failed." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: `Indexing error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async () => {
    if (!queryPrompt.trim()) return;
    setLoading(true);
    setRoutingInfo(null);
    const statusLabel = provider === "auto"
      ? "JEV Auto-Router active — analyzing query complexity..."
      : `Querying ChromaDB & synthesizing answer with ${provider.toUpperCase()} (${selectedModel})...`;
    setStatusMsg({ type: "info", text: statusLabel });
    setQueryResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: currentWorkspace,
          query: queryPrompt,
          top_k: topK,
          model_name: selectedModel,
          provider: provider,
          api_key: apiKey || undefined,
          max_tokens: maxTokens,
          temperature: temperature,
          include_charts: includeCharts,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQueryResult(data);
        if (data.routing_info) setRoutingInfo(data.routing_info);
        setStatusMsg({ type: "success", text: "RAG query synthesized successfully!" });
      } else {
        setStatusMsg({ type: "error", text: data.detail || "Query failed." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: `Query execution error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      setStatusMsg({ type: "error", text: "Please upload or select a template first." });
      return;
    }
    setLoading(true);
    setStatusMsg({ type: "info", text: `Generating compliance report with ${provider.toUpperCase()} (${selectedModel})...` });
    setGeneratedReport(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: currentWorkspace,
          query: reportQuery,
          template_name: selectedTemplate,
          top_k: topK,
          model_name: selectedModel,
          provider: provider,
          api_key: apiKey || undefined,
          max_tokens: maxTokens,
          temperature: temperature,
          include_charts: includeCharts,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedReport(data.report);
        try {
          localStorage.setItem("last_generated_report", data.report);
        } catch {}
        setStatusMsg({ type: "success", text: "Report generated successfully!" });
      } else {
        setStatusMsg({ type: "error", text: data.detail || "Report generation failed." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: `Report generation error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance_report_${currentWorkspace}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              Enterprise AI RAG Platform
            </h1>
            <p className="text-xs text-slate-400">Multi-LLM Knowledge Synthesis & Compliance</p>
          </div>
        </div>

        {/* Center Controls: Workspace & Provider Selection */}
        <div className="flex items-center space-x-3">
          {/* Workspace */}
          <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Workspace:</span>
            <select
              value={currentWorkspace}
              onChange={(e) => setCurrentWorkspace(e.target.value)}
              className="bg-transparent font-medium text-indigo-300 focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws} value={ws} className="bg-slate-900 text-slate-200">
                  {ws}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selection */}
          <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="bg-transparent font-medium text-cyan-300 focus:outline-none cursor-pointer uppercase"
            >
              <option value="auto" className="bg-slate-900 text-amber-300">⚡ Auto (JEV Cost Optimizer)</option>
              <option value="ollama" className="bg-slate-900 text-slate-200">Ollama (Local CPU)</option>
              <option value="openai" className="bg-slate-900 text-slate-200">OpenAI (Fast Cloud)</option>
              <option value="google" className="bg-slate-900 text-slate-200">Google Gemini (Fast Cloud)</option>
              <option value="anthropic" className="bg-slate-900 text-slate-200">Anthropic Claude (Fast Cloud)</option>
              <option value="deepseek" className="bg-slate-900 text-slate-200">DeepSeek (Fast Cloud)</option>
            </select>
          </div>

          {/* Model Selection */}
          <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent font-medium text-emerald-300 focus:outline-none cursor-pointer"
            >
              {availableModels.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/60 transition-all"
            title="Provider API Key Settings"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
          </button>
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                backendHealth ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-red-500 animate-pulse"
              }`}
            />
            <span className={backendHealth ? "text-emerald-400 font-medium" : "text-red-400"}>
              {backendHealth ? "Backend Active" : "Backend Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Settings Modal for API Keys */}
      {showSettingsModal && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 px-6 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-4 flex-1 max-w-3xl">
            <Key className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200">API Key for {provider.toUpperCase()}:</span>
            <input
              type="password"
              placeholder={`Enter your ${provider.toUpperCase()} API Key (optional if set in env)...`}
              value={apiKey}
              onChange={(e) => {
                const val = e.target.value;
                setApiKey(val);
                try {
                  localStorage.setItem(`api_key_${provider}`, val);
                } catch {}
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowSettingsModal(false)}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 px-3 py-1 rounded-lg"
          >
            Close Settings
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 space-x-6">
        {/* Left Sidebar Tabs */}
        <aside className="w-64 space-y-2">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "documents"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Documents & Index</span>
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "templates"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. Report Templates</span>
            </button>

            <button
              onClick={() => setActiveTab("query")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "query"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>3. RAG Knowledge Query</span>
            </button>

            <button
              onClick={() => setActiveTab("report")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "report"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>4. Generate Compliance Report</span>
            </button>
          </nav>

          {/* Create Workspace Helper */}
          <div className="pt-6 border-t border-slate-800/80">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Create New Workspace</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. audit_2026"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCreateWorkspace}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 flex flex-col space-y-4">
          {/* Status Message Alert */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-center space-x-3 transition-all ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : statusMsg.type === "error"
                  ? "bg-red-950/40 border-red-500/40 text-red-300"
                  : "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
              }`}
            >
              {statusMsg.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />}
              {statusMsg.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
              {statusMsg.type === "info" && <RefreshCw className="w-5 h-5 flex-shrink-0 text-indigo-400 animate-spin" />}
              <span className="flex-1">{statusMsg.text}</span>
            </div>
          )}

          {/* TAB 1: Documents & Indexing */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-1 flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <span>Upload Source Documents</span>
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Upload Excel (.xlsx, .xls), CSV, PDF, Word (.docx), Markdown (.md), or Text (.txt) reports into workspace{" "}
                  <strong className="text-indigo-300">{currentWorkspace}</strong>.
                </p>

                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/30 hover:border-indigo-500/50 transition-all">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                    <FileText className="w-8 h-8 text-indigo-400" />
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt,.md"
                    onChange={(e) => setSelectedDocFiles(e.target.files)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Supported: <span className="text-emerald-400 font-semibold">Excel (.xlsx, .xls)</span>, <span className="text-emerald-400 font-semibold">CSV</span>, PDF (.pdf), Word (.docx), Markdown (.md), Text (.txt)
                  </p>
                  {selectedDocFiles && (
                    <p className="text-xs text-indigo-400 mt-2">
                      Selected {selectedDocFiles.length} file(s) for upload.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    disabled={!selectedDocFiles || loading}
                    onClick={handleUploadDocs}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Documents</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Files & Indexing Action */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Indexed Files in '{currentWorkspace}'
                    </h3>
                    <p className="text-xs text-slate-400">
                      {workspaceFiles.length} file(s) uploaded to raw vector store directory.
                    </p>
                  </div>

                  <button
                    disabled={workspaceFiles.length === 0 || loading}
                    onClick={handleTriggerIndex}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Zap className="w-4 h-4 text-emerald-200" />
                    <span>Trigger Vector Indexing (ChromaDB)</span>
                  </button>
                </div>

                {workspaceFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center border border-slate-800/60 rounded-xl">
                    No files uploaded in workspace '{currentWorkspace}' yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {workspaceFiles.map((file) => (
                      <li
                        key={file}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          {file.endsWith(".xlsx") || file.endsWith(".xls") || file.endsWith(".csv") ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-400" />
                          )}
                          <span className="font-mono text-slate-200">{file}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {(file.endsWith(".xlsx") || file.endsWith(".xls") || file.endsWith(".csv")) && (
                            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                              Excel / Data
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                            Ready for indexing
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Report Templates */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-slate-100 mb-1 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>Upload Report Template</span>
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Upload Markdown (.md), PDF (.pdf), Word (.docx), or Excel (.xlsx) report template with placeholder fields (e.g., {"{{ content }}"}, {"{{ query }}"}).
                </p>

                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/30 hover:border-indigo-500/50 transition-all">
                  <FileCode className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt,.xlsx,.xls"
                    onChange={(e) => setSelectedTemplateFile(e.target.files ? e.target.files[0] : null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  {selectedTemplateFile && (
                    <p className="text-xs text-indigo-400 mt-2">Selected: {selectedTemplateFile.name}</p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    disabled={!selectedTemplateFile || loading}
                    onClick={handleUploadTemplate}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Template</span>
                  </button>
                </div>
              </div>

              {/* Active Templates */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Available Templates</h3>
                {templates.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center border border-slate-800/60 rounded-xl">
                    No templates uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedTemplate === tmpl
                            ? "bg-indigo-950/50 border-indigo-500/60 text-indigo-200"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold font-mono text-slate-200">{tmpl}</span>
                          {selectedTemplate === tmpl && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500">Click to select for report generation.</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RAG Knowledge Query */}
          {activeTab === "query" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                    <Search className="w-5 h-5 text-indigo-400" />
                    <span>RAG Knowledge Retrieval & Synthesis</span>
                  </h2>

                  {/* Sliders: Top-K, Max Tokens, Temperature */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-400">Model:</span>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-transparent font-medium text-emerald-300 focus:outline-none cursor-pointer"
                      >
                        {availableModels.map((m) => (
                          <option key={m} value={m} className="bg-slate-900 text-slate-200">
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-400">Chunks (k):</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                        className="w-16 accent-indigo-500 cursor-pointer"
                      />
                      <span className="font-mono text-indigo-300 font-bold">{topK}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-400">Max Tokens:</span>
                      <input
                        type="range"
                        min="250"
                        max="2000"
                        step="50"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        className="w-20 accent-cyan-500 cursor-pointer"
                      />
                      <span className="font-mono text-cyan-300 font-bold">{maxTokens}</span>
                    </div>

                    <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-400">Temp:</span>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        className="w-16 accent-amber-500 cursor-pointer"
                      />
                      <span className="font-mono text-amber-300 font-bold">{temperature.toFixed(2)}</span>
                    </div>

                    <label className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer hover:border-slate-700 transition-all select-none">
                      <input
                        type="checkbox"
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[11px] text-slate-300 flex items-center space-x-1.5 font-medium">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Charts</span>
                      </span>
                    </label>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={queryPrompt}
                  onChange={(e) => setQueryPrompt(e.target.value)}
                  placeholder="Enter query to retrieve facts and synthesize response with citations..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-all font-sans"
                />

                <div className="mt-3 flex justify-between items-center">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setQueryPrompt(
                          "What are the encryption standards, edge gateway latency metrics, and active vulnerabilities?"
                        )
                      }
                      className="text-[11px] bg-slate-800/60 hover:bg-slate-800 text-slate-400 px-3 py-1 rounded-lg border border-slate-700/60 transition-all"
                    >
                      Preset: Compliance Audit
                    </button>
                    <button
                      onClick={() =>
                        setQueryPrompt("List all active security vulnerabilities and patch status.")
                      }
                      className="text-[11px] bg-slate-800/60 hover:bg-slate-800 text-slate-400 px-3 py-1 rounded-lg border border-slate-700/60 transition-all"
                    >
                      Preset: Vulnerability Scan
                    </button>
                    <button
                      onClick={() =>
                        setQueryPrompt(
                          "Perform a Journal Entry Verification (JEV) audit: Check all financial entries, account numbers, debit/credit balances, and flag any abnormal postings or missing documentation."
                        )
                      }
                      className="text-[11px] bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-700/60 transition-all font-semibold"
                    >
                      ★ Preset: JEV Audit
                    </button>
                    <button
                      onClick={() =>
                        setQueryPrompt(
                          "Provide a 3-bullet executive summary highlighting the top operational risks, system SLA performance, and key action items."
                        )
                      }
                      className="text-[11px] bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 px-3 py-1 rounded-lg border border-cyan-700/60 transition-all"
                    >
                      Preset: Executive Summary
                    </button>
                    <button
                      onClick={() =>
                        setQueryPrompt(
                          "Analyze SLA thresholds and edge gateway latency metrics across all geographical regions, highlighting any peak latency spikes."
                        )
                      }
                      className="text-[11px] bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-700/60 transition-all"
                    >
                      Preset: SLA & Latency Analysis
                    </button>
                  </div>

                  <button
                    disabled={loading || !queryPrompt.trim()}
                    onClick={handleRunQuery}
                    className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Synthesize ({provider.toUpperCase()})</span>
                  </button>
                </div>
              </div>

              {/* Query Response Output */}
              {queryResult && (
                <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-slate-100">Synthesized LLM Response ({provider.toUpperCase()} – {selectedModel})</h3>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                      Workspace: <strong className="text-indigo-300">{queryResult.workspace}</strong>
                    </span>
                  </div>

                  {/* JEV Routing Decision Badge */}
                  {routingInfo && (
                    <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-xs">
                      <span className="text-amber-400 font-bold text-base">⚡</span>
                      <span className="text-amber-300 font-semibold">JEV Router:</span>
                      <span className="text-amber-200 font-mono">{routingInfo}</span>
                    </div>
                  )}

                  {/* Formatted Answer + Visual Graphical Chart */}
                  {(() => {
                    const { chart, cleanText } = parseChartFromMarkdown(queryResult.answer);
                    return (
                      <>
                        {chart && <ComplianceChart chart={chart} />}
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 whitespace-pre-wrap font-sans text-slate-200">
                          {cleanText}
                        </div>
                      </>
                    );
                  })()}

                  {/* Sources Cited */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Retrieved Vector Sources ({queryResult.sources.length})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {queryResult.sources.map((src, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 flex items-center space-x-2"
                        >
                          <FileText className="w-3 h-3 text-indigo-400" />
                          <span>{src.source}</span>
                          <span className="bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                            chunk {src.chunk_id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Generate Compliance Report */}
          {activeTab === "report" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                    <FileCode className="w-5 h-5 text-indigo-400" />
                    <span>Generate Template-Mapped Compliance Report</span>
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 mb-1 block">Selected Workspace:</label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-indigo-300 font-mono">
                      {currentWorkspace}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Provider & Model:</label>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono uppercase">
                      {provider} ({selectedModel})
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Selected Report Template:</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    >
                      {templates.length === 0 && <option value="">No templates available</option>}
                      {templates.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Report Query Scope:</label>
                  <textarea
                    rows={3}
                    value={reportQuery}
                    onChange={(e) => setReportQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-between items-center flex-wrap gap-3">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl hover:border-slate-700 transition-all">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-4 h-4 cursor-pointer accent-indigo-600"
                    />
                    <span className="flex items-center space-x-2 font-medium">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span>Include Interactive Graphical Charts in Report</span>
                    </span>
                  </label>

                  <button
                    disabled={loading || !selectedTemplate}
                    onClick={handleGenerateReport}
                    className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Final Report ({provider.toUpperCase()})</span>
                  </button>
                </div>
              </div>

              {/* Rendered Generated Report */}
              {generatedReport && (
                <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Generated Markdown Compliance Report</span>
                    </h3>

                    <button
                      onClick={downloadReport}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Download Report (.md)</span>
                    </button>
                  </div>

                  {/* Render Visual Graphical Chart if present in report */}
                  {(() => {
                    const { chart, cleanText } = parseChartFromMarkdown(generatedReport);
                    return (
                      <>
                        {chart && <ComplianceChart chart={chart} />}
                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {cleanText}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
