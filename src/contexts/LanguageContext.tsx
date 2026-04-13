import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type Language = 'en' | 'hi' | 'auto';

interface LanguageContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  /** BCP 47 lang tag for speech recognition */
  speechLang: string;
  /** BCP 47 lang tag for speech synthesis */
  ttsLang: string;
  /** Label map for common UI strings */
  t: (key: string) => string;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    'home': 'Home',
    'add': 'Add',
    'monthly': 'Monthly',
    'lending': 'Lending',
    'profile': 'Profile',
    'today': 'Today',
    'this_month': 'This Month',
    'recent_transactions': 'Recent Transactions',
    'category_breakdown': 'Category Breakdown',
    'daily_spending': 'Daily Spending',
    'no_expenses': 'No expenses this month',
    'total_expenses': 'Total Expenses',
    'total_spent': 'Total Spent',
    'active_lending': 'Active Lending',
    'top_category': 'Top Category',
    'backup_cloud': 'Backup to Cloud',
    'save_data': 'Save your data securely',
    'sign_out': 'Sign Out',
    'log_out': 'Log out of your account',
    'language': 'Language',
    'tap_to_start': 'Tap to start',
    'listening': 'Listening...',
    'thinking': 'Thinking...',
    'speaking': 'Speaking...',
    'select_month': 'Select Month',
    'select_year': 'Select Year',
    'full_year': 'Full Year',
    'this_month_filter': 'This Month',
    'custom': 'Custom',
    'transactions': 'transactions',
    'transaction': 'transaction',
    'joined': 'Joined',
    'smart_kharcha': 'Smart Kharcha',
    'your_ai_finance': 'Your AI Finance Assistant',
  },
  hi: {
    'home': 'होम',
    'add': 'जोड़ें',
    'monthly': 'मासिक',
    'lending': 'उधार',
    'profile': 'प्रोफ़ाइल',
    'today': 'आज',
    'this_month': 'इस महीने',
    'recent_transactions': 'हाल के लेनदेन',
    'category_breakdown': 'श्रेणी विवरण',
    'daily_spending': 'दैनिक खर्च',
    'no_expenses': 'इस महीने कोई खर्च नहीं',
    'total_expenses': 'कुल खर्चे',
    'total_spent': 'कुल खर्च',
    'active_lending': 'सक्रिय उधार',
    'top_category': 'शीर्ष श्रेणी',
    'backup_cloud': 'क्लाउड बैकअप',
    'save_data': 'अपना डेटा सुरक्षित रखें',
    'sign_out': 'साइन आउट',
    'log_out': 'अपने खाते से लॉग आउट करें',
    'language': 'भाषा',
    'tap_to_start': 'शुरू करने के लिए टैप करें',
    'listening': 'सुन रहा है...',
    'thinking': 'सोच रहा है...',
    'speaking': 'बोल रहा है...',
    'select_month': 'महीना चुनें',
    'select_year': 'साल चुनें',
    'full_year': 'पूरा साल',
    'this_month_filter': 'यह महीना',
    'custom': 'कस्टम',
    'transactions': 'लेनदेन',
    'transaction': 'लेनदेन',
    'joined': 'जुड़े',
    'smart_kharcha': 'स्मार्ट खर्चा',
    'your_ai_finance': 'आपका AI वित्त सहायक',
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useLocalStorage<Language>('sk_language', 'auto');

  const resolvedLang = language === 'auto' ? 'en' : language;

  const speechLang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'hi-IN';
  const ttsLang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'hi-IN';

  const t = useCallback((key: string) => {
    return translations[resolvedLang]?.[key] || translations['en']?.[key] || key;
  }, [resolvedLang]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, speechLang, ttsLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
