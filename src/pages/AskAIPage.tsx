import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, MicOff, Loader2, X } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';
import type { Category } from '@/types/finance';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-kharcha-chat`;

const quickQuestions = [
  'Aaj kitna kharch hua?',
  'This month summary',
  'Kisne paise return nahi kiye?',
  'Grocery pe kitna gaya?',
];

export default function AskAIPage() {
  const { expenses, lending, todayTotal, monthTotal, toReceive, toPay, addExpense, addLending } = useFinance();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const financeContext = {
    todayTotal, monthTotal, toReceive, toPay,
    recentExpenses: expenses.slice(0, 20),
    activeLending: lending.filter(l => !l.settled),
  };

  const handleToolCall = (name: string, args: any) => {
    if (name === 'add_expense') {
      addExpense({
        amount: args.amount,
        category: (args.category || 'Other') as Category,
        merchant: args.merchant,
        note: args.note,
        date: args.date || new Date().toISOString(),
        sourceType: 'text',
        confidence: 0.9,
      });
      toast.success(`₹${args.amount} added to ${args.category} ✅`);
    } else if (name === 'add_lending') {
      addLending({
        type: args.type,
        person: args.person,
        amount: args.amount,
        remainingAmount: args.amount,
        date: new Date().toISOString(),
        note: args.note,
        settled: false,
      });
      toast.success(`${args.type === 'lent' ? 'Gave' : 'Borrowed'} ₹${args.amount} ${args.type === 'lent' ? 'to' : 'from'} ${args.person} ✅`);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const assistantId = crypto.randomUUID();
    let toolCalls: Record<string, { name: string; arguments: string }> = {};

    try {
      const allMessages = [...messages, userMsg].map(m => ({
        role: m.role, content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, financeContext }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'AI response failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              assistantContent += delta.content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: 'assistant', content: assistantContent }];
              });
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) toolCalls[idx] = { name: '', arguments: '' };
                if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      for (const tc of Object.values(toolCalls)) {
        if (tc.name && tc.arguments) {
          try {
            const args = JSON.parse(tc.arguments);
            handleToolCall(tc.name, args);
          } catch (e) {
            console.error('Failed to parse tool call:', e);
          }
        }
      }

      if (!assistantContent && Object.keys(toolCalls).length > 0) {
        assistantContent = 'Done! ✅ Record saved.';
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'AI se baat nahi ho payi');
      if (!assistantContent) {
        setMessages(prev => [
          ...prev,
          { id: assistantId, role: 'assistant', content: 'Oops! Kuch gadbad ho gayi 😅 Dobara try karo?' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      recognitionRef.current = null;
      handleSend(transcript);
    };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div className="page-container flex flex-col h-[calc(100vh-80px)]">
      {!hasMessages ? (
        /* Landing state — Perplexity-style centered */
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-xl font-semibold text-foreground mb-1">
            Hi there! How can I help you <span className="font-bold">today?</span>
          </h1>
          <p className="text-xs text-muted-foreground mb-8">
            Say or type your expense, or ask me anything about your spending
          </p>

          {/* Input bar */}
          <div className="w-full max-w-md glass-card p-2 flex items-center gap-2 mb-6">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="spent 200 on food..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send size={16} className="text-primary-foreground" />
            </button>
          </div>

          {/* Voice button */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className={`relative ${isListening ? 'animate-pulse' : ''}`}>
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                className={`mic-button w-16 h-16 ${isListening ? 'listening' : ''}`}
              >
                {isListening ? <MicOff size={24} className="text-primary-foreground" /> : <Mic size={24} className="text-primary-foreground" />}
              </button>
            </div>
            <span className={`text-sm font-medium ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}>
              {isListening ? 'Listening...' : 'Say something...'}
            </span>
            {isListening && (
              <button onClick={stopListening} className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {quickQuestions.map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="bg-muted/50 text-xs text-muted-foreground px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Chat state */
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles size={16} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Smart Kharcha AI</h1>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto min-h-0 mb-3">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'gradient-primary text-primary-foreground rounded-br-md'
                      : 'glass-card text-foreground rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="glass-card px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="glass-card p-2 flex items-center gap-2">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isListening ? 'bg-destructive/20 text-destructive' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type: spent 200 on food..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-1"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send size={16} className="text-primary-foreground" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
