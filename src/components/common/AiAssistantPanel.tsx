import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, RefreshCw, Info } from 'lucide-react';
import { sendAssistantMessage, generateSessionId, GeminiAssistantMessage } from '../../services/geminiAssistantService';
import { DEFAULT_GEMINI_MODEL } from '../../config/ai';

const SUGGESTED_QUESTIONS = [
  'Which incidents are most critical right now?',
  'What environmental risks are active?',
  'Which resources are currently available?',
  'Summarize the current emergency situation.',
  'What changed in the last 10 minutes?',
  'Why was the last reallocation recommended?',
];

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMinimized?: boolean;
}

function MessageBubble({ msg }: { msg: GeminiAssistantMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mr-2 mt-1 ${msg.isGemini ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-slate-700 border border-slate-600'}`}>
          {msg.isError ? (
            <X className="w-3 h-3 text-red-400" />
          ) : (
            <Bot className={`w-3.5 h-3.5 ${msg.isGemini ? 'text-purple-400' : 'text-slate-400'}`} />
          )}
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? '' : 'flex-1'}`}>
        <div
          className={`px-3 py-2.5 rounded-xl text-[12px] font-inter leading-relaxed ${
            isUser
              ? 'bg-[#FF4D00] text-black font-medium rounded-br-sm'
              : msg.isError
              ? 'bg-red-900/30 border border-red-500/20 text-red-300 rounded-bl-sm'
              : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
          }`}
        >
          {msg.isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="text-slate-400 italic">Gemini is analyzing...</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </span>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          )}
        </div>

        {/* Metadata */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="font-mono text-[9px] text-slate-600">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && msg.model && (
            <span className={`font-space text-[9px] px-1.5 py-0.5 rounded ${msg.isGemini ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-700 text-slate-500'}`}>
              {msg.isGemini ? '● GEMINI' : 'FALLBACK'}
            </span>
          )}
          {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
            <span className="font-space text-[9px] text-blue-500" title={msg.toolsUsed.join(', ')}>
              {msg.toolsUsed.length} tool(s) used
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-[#FF4D00] flex-shrink-0 flex items-center justify-center ml-2 mt-1">
          <span className="text-[8px] font-bold text-black">OP</span>
        </div>
      )}
    </div>
  );
}

export function AiAssistantPanel({ isOpen, onClose, defaultMinimized = false }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<GeminiAssistantMessage[]>([
    {
      role: 'assistant',
      content: 'ResQAI AI Assistant online. I can answer questions about the current live operational state — active incidents, resources, environmental events, and more.\n\nI use real-time data from your control room. Ask me anything.',
      timestamp: new Date().toISOString(),
      model: DEFAULT_GEMINI_MODEL,
      isGemini: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: GeminiAssistantMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const streamingMsg: GeminiAssistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, streamingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for context
      const history = messages
        .filter(m => !m.isStreaming)
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await sendAssistantMessage(text.trim(), sessionId, history);

      const assistantMsg: GeminiAssistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        model: response.model,
        isGemini: response.isGemini,
        toolsUsed: response.toolsUsed,
        isError: !response.success,
      };

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = assistantMsg; // replace streaming placeholder
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'An error occurred. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, sessionId]);

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat history cleared. How can I help you?',
      timestamp: new Date().toISOString(),
      model: DEFAULT_GEMINI_MODEL,
      isGemini: false,
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col" style={{ width: 380, maxHeight: '90vh' }}>
      {/* Panel */}
      <div className="glass-panel border-2 border-black shadow-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: isMinimized ? 'auto' : '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-archivo text-sm text-white uppercase font-bold tracking-tight">GEMINI ASSISTANT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <p className="font-space text-[9px] text-slate-500 uppercase">AI DECISION SUPPORT — READ ONLY</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              title="Clear chat"
              className="p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* AI Decision Support Disclaimer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/10 border-b border-purple-500/10">
              <Info className="w-3 h-3 text-purple-500 flex-shrink-0" />
              <p className="font-space text-[9px] text-purple-400 uppercase">AI DECISION SUPPORT — NOT AUTONOMOUS CONTROL</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar" style={{ minHeight: 200, maxHeight: 400 }}>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions (visible when few messages) */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2">
                <p className="font-space text-[9px] text-slate-600 uppercase mb-1.5">SUGGESTED</p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={isLoading}
                      className="font-space text-[9px] px-2 py-1 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition disabled:opacity-50 text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/10 bg-black/20">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about live operational state..."
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-[12px] font-inter text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:opacity-50 flex items-center justify-center transition flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
