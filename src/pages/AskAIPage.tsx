import { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const quickQuestions = [
  'How much did I spend today?',
  'What did I spend on groceries?',
  'Who owes me money?',
  'Monthly spending summary',
];

export default function AskAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hi! I\'m your Smart Kharcha assistant 🤖\n\nAsk me anything about your finances — spending, budgets, who owes you, or any insights!' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg };
    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'This feature will be powered by AI once Lovable Cloud is connected. For now, check your dashboard for spending summaries! 📊',
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="page-container flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
          <Sparkles size={16} className="text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Ask AI</h1>
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {quickQuestions.map(q => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="shrink-0 bg-muted/50 text-xs text-muted-foreground px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 mb-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'gradient-primary text-primary-foreground rounded-br-md'
                : 'glass-card text-foreground rounded-bl-md'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="glass-card p-2 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your finances..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none px-2"
        />
        <button
          onClick={() => handleSend()}
          className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0"
        >
          <Send size={16} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
