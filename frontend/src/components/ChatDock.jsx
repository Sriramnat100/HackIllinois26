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
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const suggestedPrompts = [
  { text: "Summarize my last inspection", icon: Sparkles },
  { text: "Show top recurring failures", icon: BarChart3 },
  { text: "Generate failure trends", icon: Zap },
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
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text = inputValue) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: text,
        session_id: "inspector-session",
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

  return (
    <div className="fixed bottom-0 left-0 w-full lg:w-[600px] z-40 p-4 pointer-events-none">
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
            {/* Messages */}
            <ScrollArea className="h-72 px-4 py-3" ref={scrollRef}>
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
                      <p className="text-[13px] leading-relaxed">{message.content}</p>
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
              </div>
            </ScrollArea>

            {/* Suggested Prompts */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestedPrompts.map((prompt, index) => (
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
                ))}
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
                  placeholder="Ask about your inspections..."
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
