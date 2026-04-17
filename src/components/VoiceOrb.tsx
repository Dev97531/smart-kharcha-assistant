import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Category } from '@/types/finance';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-kharcha-chat`;

export function VoiceOrb({ open, onClose }: Props) {
  const { expenses, lending, todayTotal, monthTotal, toReceive, toPay, addExpense, addLending } = useFinance();
  const { language, speechLang, ttsLang, t } = useLanguage();
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiText, setAiText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const shouldContinueRef = useRef(true);
  const isClosingRef = useRef(false);

  const financeContext = {
    todayTotal, monthTotal, toReceive, toPay,
    recentExpenses: expenses.slice(0, 20),
    activeLending: lending.filter(l => !l.settled),
  };

  const stopEverything = useCallback(() => {
    shouldContinueRef.current = false;
    isClosingRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    setOrbState('idle');
    setTranscript('');
    setAiText('');
  }, []);

  const handleToolCall = useCallback((name: string, args: any) => {
    if (name === 'add_expense') {
      addExpense({
        amount: args.amount,
        category: (args.category || 'Other') as Category,
        merchant: args.merchant,
        note: args.note,
        date: args.date || new Date().toISOString(),
        sourceType: 'voice',
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
  }, [addExpense, addLending]);

  const speakAndListen = useCallback((text: string) => {
    if (isClosingRef.current) return;
    setOrbState('speaking');
    setAiText(text);

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = ttsLang;
    utter.rate = 1.05;
    utter.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = ttsLang.split('-')[0];
    const matchVoice = voices.find(v => v.lang.startsWith(langPrefix)) || voices.find(v => v.lang.startsWith('en'));
    if (matchVoice) utter.voice = matchVoice;

    synthRef.current = utter;

    utter.onend = () => {
      if (!isClosingRef.current && shouldContinueRef.current) {
        startListening();
      }
    };
    utter.onerror = () => {
      if (!isClosingRef.current && shouldContinueRef.current) {
        startListening();
      }
    };

    window.speechSynthesis.speak(utter);
  }, [ttsLang]);

  const processWithAI = useCallback(async (userText: string) => {
    if (isClosingRef.current) return;
    setOrbState('thinking');
    setTranscript(userText);

    const newHistory = [...conversationHistory, { role: 'user', content: userText }];

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in to use voice assistant');
        setOrbState('idle');
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: newHistory, financeContext, language }),
      });

      if (!resp.ok || !resp.body) throw new Error('AI failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let toolCalls: Record<string, { name: string; arguments: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              assistantContent += delta.content;
              setAiText(assistantContent);
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
          try { handleToolCall(tc.name, JSON.parse(tc.arguments)); } catch {}
        }
      }

      if (!assistantContent && Object.keys(toolCalls).length > 0) {
        assistantContent = 'Done! Record saved.';
      }

      const updatedHistory = [...newHistory, { role: 'assistant', content: assistantContent }];
      setConversationHistory(updatedHistory);

      if (assistantContent && !isClosingRef.current) {
        speakAndListen(assistantContent);
      }
    } catch (e) {
      console.error(e);
      if (!isClosingRef.current) {
        speakAndListen(language === 'hi' ? 'माफ़ करें, कुछ गड़बड़ हो गई। दोबारा कोशिश करें।' : 'Sorry, something went wrong. Please try again.');
      }
    }
  }, [conversationHistory, financeContext, handleToolCall, speakAndListen, language]);

  const startListening = useCallback(() => {
    if (isClosingRef.current || !shouldContinueRef.current) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported');
      return;
    }

    window.speechSynthesis.cancel();

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = speechLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      const results = e.results;
      let interim = '';
      let final = '';
      for (let i = 0; i < results.length; i++) {
        if (results[i].isFinal) {
          final += results[i][0].transcript;
        } else {
          interim += results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        recognitionRef.current = null;
        processWithAI(final);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' && !isClosingRef.current && shouldContinueRef.current) {
        setTimeout(() => startListening(), 500);
        return;
      }
      recognitionRef.current = null;
      if (!isClosingRef.current) setOrbState('idle');
    };

    recognition.onend = () => {};

    recognitionRef.current = recognition;
    setOrbState('listening');
    setTranscript('');
    setAiText('');
    recognition.start();
  }, [processWithAI, speechLang]);

  useEffect(() => {
    if (open) {
      isClosingRef.current = false;
      shouldContinueRef.current = true;
      setConversationHistory([]);
      const t = setTimeout(() => startListening(), 400);
      return () => clearTimeout(t);
    } else {
      stopEverything();
    }
  }, [open]);

  useEffect(() => () => stopEverything(), [stopEverything]);

  if (!open) return null;

  const handleInterrupt = () => {
    if (orbState === 'speaking') {
      window.speechSynthesis.cancel();
      startListening();
    }
  };

  const handlePauseResume = () => {
    if (orbState === 'listening') {
      shouldContinueRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setOrbState('idle');
    } else if (orbState === 'idle') {
      shouldContinueRef.current = true;
      startListening();
    }
  };

  const orbClasses: Record<OrbState, string> = {
    idle: 'orb-idle',
    listening: 'orb-listening',
    thinking: 'orb-thinking',
    speaking: 'orb-speaking',
  };

  const stateLabel: Record<OrbState, string> = {
    idle: t('tap_to_start'),
    listening: t('listening'),
    thinking: t('thinking'),
    speaking: t('speaking'),
  };

  return (
    <div className="fixed inset-0 z-[100] voice-orb-backdrop flex flex-col items-center justify-center">
      <button
        onClick={() => { stopEverything(); onClose(); }}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
      >
        <X size={20} />
      </button>

      <button
        onClick={() => {
          if (orbState === 'speaking') handleInterrupt();
          else if (orbState === 'idle') handlePauseResume();
        }}
        className={`voice-orb ${orbClasses[orbState]} mb-8`}
      >
        <div className="orb-inner" />
        <div className="orb-ring orb-ring-1" />
        <div className="orb-ring orb-ring-2" />
        <div className="orb-ring orb-ring-3" />
      </button>

      <p className="text-white/60 text-sm font-medium mb-4">{stateLabel[orbState]}</p>

      {transcript && (
        <div className="max-w-xs text-center px-4">
          <p className="text-white/90 text-base font-medium leading-relaxed">{transcript}</p>
        </div>
      )}

      {aiText && orbState === 'speaking' && (
        <div className="max-w-sm text-center px-4 mt-3">
          <p className="text-white/60 text-sm leading-relaxed line-clamp-3">{aiText}</p>
        </div>
      )}

      <div className="absolute bottom-12 flex items-center gap-6">
        <button
          onClick={handlePauseResume}
          className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/20 transition-all"
        >
          {orbState === 'listening' ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
      </div>
    </div>
  );
}
