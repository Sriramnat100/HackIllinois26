import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  MessageSquare, 
  Send, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  BarChart3,
  Bot,
  Zap,
  FileUp,
  FileText,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const suggestedPrompts = [
  { text: "Summarize my last inspection", icon: Sparkles },
  { text: "Show top recurring failures", icon: BarChart3 },
  { text: "Show failures as a bar chart", icon: BarChart3 },
  { text: "Generate failure trends", icon: Zap },
];
const documentPrompts = [
  { text: "Analyze my document and give key insights", icon: Sparkles },
  { text: "Summarize this document for documentation", icon: FileText },
  { text: "Show breakdown as a chart", icon: BarChart3 },
  { text: "What are the main risks and action items?", icon: Zap },
];

export const ChatDock = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi Sriram! I'm your Cat Inspect AI assistant. I can help you analyze inspections, identify failure patterns, and generate insights. What would you like to know?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null); // { filename }
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const SESSION_ID = "inspector-session";

  // Auto-scroll to latest message when messages or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSend = async (text = inputValue) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: text,
        session_id: SESSION_ID,
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.response,
        chart_data: response.data.chart_data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt) => {
    handleSend(prompt);
  };

  const handleFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a PDF file.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", SESSION_ID);
      const { data } = await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedDoc({ filename: data.filename });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've loaded "${data.filename}". You can ask me to analyze it, summarize key insights, or extract risks and action items for better decision-making and documentation.`,
        },
      ]);
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleClearDocument = async () => {
    try {
      await axios.delete(`${API_URL}/documents`, { params: { session_id: SESSION_ID } });
      setUploadedDoc(null);
      setUploadError(null);
    } catch {
      setUploadedDoc(null);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full lg:w-[800px] xl:w-[960px] z-40 p-4 pointer-events-none">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div 
          className="chat-dock-enterprise pointer-events-auto"
          data-testid="chat-dock"
        >
          {/* Header */}
          <CollapsibleTrigger asChild>
            <div className="chat-header-enterprise cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F7B500] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                    AI Assistant
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Ready to help</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
                  Powered by GPT
                </span>
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="chat-upload-pdf"
            />
            {/* Messages */}
            <ScrollArea className="min-h-[400px] max-h-[70vh] h-[420px] px-4 py-3" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%]",
                        message.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-assistant"
                      )}
                      data-testid={`chat-message-${index}`}
                    >
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</div>
                      {message.chart_data && (
                        <div className="mt-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
                            {message.chart_data.title}
                          </p>
                          <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={message.chart_data.data}>
                                <XAxis 
                                  dataKey="category" 
                                  tick={{ fontSize: 10, fill: '#64748B' }} 
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip 
                                  contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                  }}
                                />
                                <Bar 
                                  dataKey="count" 
                                  fill="#F7B500" 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-2 flex-shrink-0">
                      <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="chat-bubble-assistant">
                      <div className="flex gap-1.5 py-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} className="h-0 w-full shrink-0" aria-hidden="true" />
              </div>
            </ScrollArea>

            {/* Document loaded banner */}
            {uploadedDoc && (
              <div className="px-4 py-2 flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/30 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate">
                    Document: {uploadedDoc.filename}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleClearDocument}
                  title="Clear document"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {uploadError && (
              <div className="px-4 py-1.5 text-[12px] text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-800">
                {uploadError}
              </div>
            )}
            {/* PDF upload – always visible */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploading}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-[#F7B500] hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-[13px] text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-50"
                data-testid="chat-upload-btn"
              >
                <FileUp className="w-4 h-4" />
                {uploading ? "Uploading…" : uploadedDoc ? "Replace document (PDF)" : "Upload PDF to analyze"}
              </button>
            </div>
            {/* Suggested Prompts */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {uploadedDoc ? (
                  documentPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="chat-chip flex-shrink-0"
                      onClick={() => handlePromptClick(prompt.text)}
                      disabled={isLoading}
                      data-testid={`document-prompt-${index}`}
                    >
                      <prompt.icon className="w-3.5 h-3.5" />
                      {prompt.text}
                    </button>
                  ))
                ) : (
                  suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="chat-chip flex-shrink-0"
                      onClick={() => handlePromptClick(prompt.text)}
                      disabled={isLoading}
                      data-testid={`prompt-chip-${index}`}
                    >
                      <prompt.icon className="w-3.5 h-3.5" />
                      {prompt.text}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={uploadedDoc ? "Ask about your document or inspections..." : "Ask about your inspections..."}
                  className="flex-1 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-[13px]"
                  disabled={isLoading}
                  data-testid="chat-input"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 bg-[#F7B500] hover:bg-[#E5A800] text-slate-900"
                  disabled={isLoading || !inputValue.trim()}
                  data-testid="chat-send-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ChatDock;
