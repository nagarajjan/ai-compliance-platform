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
} from "lucide-react";

const BACKEND_URL = "http://localhost:8000";

interface SourceMeta {
  source: string;
  chunk_id: number;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  ollama: ["llama3.2", "mistral", "phi3", "qwen2.5:7b", "deepseek-r1:8b", "gemma2"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"],
};

export default function Dashboard() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"documents" | "templates" | "query" | "report">("query");

  // System Status
  const [backendHealth, setBackendHealth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  // Provider & Model State
  const [provider, setProvider] = useState<"ollama" | "openai" | "anthropic" | "google">("ollama");
  const [availableModels, setAvailableModels] = useState<string[]>(PROVIDER_MODELS.ollama);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2");
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

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
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceFiles(currentWorkspace);
    }
  }, [currentWorkspace]);

  // Handle provider switch
  useEffect(() => {
    if (provider === "ollama") {
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
    setStatusMsg({ type: "info", text: `Querying ChromaDB & synthesizing answer with ${provider.toUpperCase()} (${selectedModel})...` });
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQueryResult(data);
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedReport(data.report);
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
              <option value="ollama" className="bg-slate-900 text-slate-200">Ollama (Local)</option>
              <option value="openai" className="bg-slate-900 text-slate-200">OpenAI</option>
              <option value="anthropic" className="bg-slate-900 text-slate-200">Anthropic Claude</option>
              <option value="google" className="bg-slate-900 text-slate-200">Google Gemini</option>
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
              onChange={(e) => setApiKey(e.target.value)}
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
                  Upload PDF, DOCX, MD, or TXT compliance/financial reports into workspace{" "}
                  <strong className="text-indigo-300">{currentWorkspace}</strong>.
                </p>

                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/30 hover:border-indigo-500/50 transition-all">
                  <FileText className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.md,.txt"
                    onChange={(e) => setSelectedDocFiles(e.target.files)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
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
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span className="font-mono text-slate-200">{file}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          Ready for indexing
                        </span>
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
                  Upload PDF, DOCX, or Markdown report template with placeholder fields (e.g., {"{{ content }}"}, {"{{ query }}"}).
                </p>

                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/30 hover:border-indigo-500/50 transition-all">
                  <FileCode className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
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

                  {/* Formatted Answer */}
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 whitespace-pre-wrap font-sans text-slate-200">
                    {queryResult.answer}
                  </div>

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

                <div className="flex justify-end">
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

                  <pre className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {generatedReport}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
