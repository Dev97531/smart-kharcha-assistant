import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { CATEGORIES, CATEGORY_ICONS, type Category, type SourceType } from '@/types/finance';
import { Mic, Send, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function AddExpensePage() {
  const { addExpense } = useFinance();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleNaturalInput = () => {
    if (!textInput.trim()) return;
    // Simple parsing
    const amountMatch = textInput.match(/(\d+)/);
    const parsed = amountMatch ? parseInt(amountMatch[1]) : 0;
    
    const categoryMap: Record<string, Category> = {
      food: 'Food', eat: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food', restaurant: 'Food',
      travel: 'Travel', cab: 'Travel', uber: 'Travel', metro: 'Travel', bus: 'Travel', train: 'Travel', flight: 'Travel',
      shop: 'Shopping', shopping: 'Shopping', clothes: 'Shopping', amazon: 'Shopping',
      grocery: 'Groceries', groceries: 'Groceries', vegetables: 'Groceries', market: 'Groceries',
      movie: 'Entertainment', netflix: 'Entertainment', entertainment: 'Entertainment',
      bill: 'Bills', electricity: 'Bills', recharge: 'Bills', wifi: 'Bills',
      medicine: 'Health', doctor: 'Health', hospital: 'Health',
      rent: 'Rent',
    };

    const lower = textInput.toLowerCase();
    let detectedCat: Category = 'Other';
    for (const [keyword, cat] of Object.entries(categoryMap)) {
      if (lower.includes(keyword)) { detectedCat = cat; break; }
    }

    if (parsed > 0) {
      setAmount(String(parsed));
      setCategory(detectedCat);
      setNote(textInput);
      toast.success(`Detected ₹${parsed} in ${detectedCat}`);
    } else {
      toast.error('Could not detect amount');
    }
    setTextInput('');
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setTextInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    addExpense({
      amount: amt,
      category,
      merchant: merchant || undefined,
      date: new Date(date).toISOString(),
      note: note || undefined,
      sourceType: 'text' as SourceType,
      confidence: 1,
    });
    toast.success(`₹${amt} added to ${category}`);
    navigate('/');
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Add Expense</h1>
        <button onClick={() => navigate('/')} className="text-muted-foreground p-1">
          <X size={24} />
        </button>
      </div>

      {/* Natural input */}
      <div className="glass-card p-3 mb-4 flex items-center gap-2">
        <button
          onClick={toggleVoice}
          className={`mic-button w-10 h-10 shrink-0 ${isListening ? 'listening' : ''}`}
        >
          <Mic size={18} className="text-primary-foreground" />
        </button>
        <input
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNaturalInput()}
          placeholder="Type or speak: I spent 200 on lunch..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button onClick={handleNaturalInput} className="text-primary p-1">
          <Send size={18} />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">Category</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all ${
                    category === cat
                      ? 'bg-primary/20 ring-1 ring-primary text-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                  <span className="truncate w-full text-center">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Merchant</label>
              <input
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                placeholder="e.g. Swiggy"
                className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Note</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full gradient-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition-transform active:scale-[0.98]"
        >
          Save Expense
        </button>
      </div>
    </div>
  );
}
