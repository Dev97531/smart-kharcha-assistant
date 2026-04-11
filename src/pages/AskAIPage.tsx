import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, MicOff, Loader2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { expenses, lending, todayTotal, monthTotal, toReceive, toPay } = useFinance();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey! 👋 Main hoon tumhara Smart Kharcha AI assistant. Poocho kuch bhi apne finances ke baare mein — spending, budgets, ya koi bhi sawal! 💰',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const financeContext = {
    todayTotal,
    monthTotal,
    toReceive,
    toPay,
    recentExpenses: expenses.slice(0, 20),
    activeLending: lending.filter(l => !l.settled),
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

    try {
      const allMessages = [...messages.filter(m => m.id !== '1'), userMsg].map(m => ({
        role: m.role,
        content: m.content,
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id === assistantId) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { id: assistantId, role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
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

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="page-container flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
          <Sparkles size={16} className="text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Smart Kharcha AI</h1>
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {quickQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="shrink-0 bg-muted/50 text-xs text-muted-foreground px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
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

      {/* Input */}
      <div className="glass-card p-2 flex items-center gap-2">
        <button
          onClick={toggleVoice}
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
          placeholder="Poocho kuch bhi..."
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
    </div>
  );
}
