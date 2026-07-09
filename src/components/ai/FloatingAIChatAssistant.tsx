'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase/client';
import { AiDateRangeKey } from '../../lib/ai/dateRange';

interface OwnerChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedActions?: string[];
  source?: 'llm' | 'fallback';
  generatedAt?: string;
  dateRangeLabel?: string;
}

interface FloatingAIChatAssistantProps {
  businessId?: string;
  dateRange: AiDateRangeKey;
  dateRangeLabel: string;
  aiReady: boolean;
}

const suggestedQuestions = [
  'Produk apa yang paling laku?',
  'Promo apa yang cocok hari ini?',
  'Stok apa yang perlu restock?',
  'Kenapa omzet turun?',
  'Bagaimana performa delivery?',
  'Apa action plan hari ini?',
];

function formatDateTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function FloatingAIChatAssistant({ businessId, dateRange, dateRangeLabel, aiReady }: FloatingAIChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<OwnerChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldownActive, setCooldownActive] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const previousRangeRef = useRef(dateRange);

  useEffect(() => {
    if (!businessId) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(`umkm_ai_chat_${businessId}`);
        if (saved) setMessages(JSON.parse(saved) as OwnerChatMessage[]);
      } catch (err) {
        console.error('Failed to restore AI chat session:', err);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    try {
      window.sessionStorage.setItem(`umkm_ai_chat_${businessId}`, JSON.stringify(messages.slice(-20)));
    } catch (err) {
      console.error('Failed to persist AI chat session:', err);
    }
  }, [businessId, messages]);

  useEffect(() => {
    if (previousRangeRef.current !== dateRange) {
      previousRangeRef.current = dateRange;
      const showTimer = window.setTimeout(() => setCopiedNotice(true), 0);
      const hideTimer = window.setTimeout(() => setCopiedNotice(false), 3600);
      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(hideTimer);
      };
    }
  }, [dateRange]);

  const getAccessToken = async () => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token || '';
  };

  const sendMessage = async (forcedMessage?: string) => {
    if (!businessId || loading) return;
    const message = (forcedMessage || input).trim().slice(0, 500);
    if (!message) return;

    if (cooldownActive) {
      setError('Tunggu sebentar sebelum mengirim pertanyaan berikutnya.');
      return;
    }

    setCooldownActive(true);
    window.setTimeout(() => setCooldownActive(false), 3500);
    setLoading(true);
    setError('');
    setInput('');

    const userMessage: OwnerChatMessage = { role: 'user', content: message };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          message,
          dateRange,
          conversationHistory: nextMessages.slice(-6).map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Gagal memproses chat AI.');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || 'Saya belum bisa menjawab pertanyaan itu.',
          suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : [],
          source: data.source || 'fallback',
          generatedAt: data.generatedAt,
          dateRangeLabel: data.dateRangeLabel,
        },
      ]);
    } catch (err) {
      console.error('AI chat failed:', err);
      setError(err instanceof Error ? err.message : 'Gagal memproses chat AI.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'AI belum bisa menjawab saat ini. Coba gunakan pertanyaan yang lebih spesifik atau rentang data lebih kecil.',
          suggestedActions: ['Gunakan rentang Hari Ini.', 'Tanyakan satu topik seperti stok, promo, atau delivery.'],
          source: 'fallback',
          generatedAt: new Date().toISOString(),
          dateRangeLabel,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    if (businessId) window.sessionStorage.removeItem(`umkm_ai_chat_${businessId}`);
  };

  const statusLabel = loading ? 'Loading' : aiReady ? 'AI Aktif' : 'Fallback';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm md:bg-transparent md:backdrop-blur-0">
          <div className="fixed inset-x-3 bottom-3 top-3 flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 md:inset-auto md:bottom-24 md:right-6 md:top-auto md:h-[76vh] md:max-h-[720px] md:w-[460px]">
            <div className="border-b border-slate-850 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black text-white">
                    <Bot className="h-4 w-4 text-emerald-400" />
                    <span>Tanya AI Pilot</span>
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Tanyakan penjualan, produk, stok, promo, delivery, ETA, dan laporan.
                  </p>
                  <p className="mt-2 text-[11px] font-bold text-emerald-400">Konteks: {dateRangeLabel}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-slate-950 p-2 text-slate-400 transition-all hover:text-white"
                  aria-label="Tutup Tanya AI Pilot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {copiedNotice && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-300">
                  Konteks analisis berubah. Pertanyaan berikutnya menggunakan rentang waktu baru.
                </div>
              )}
            </div>

            <div className="border-b border-slate-850 p-3">
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={loading}
                    className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition-all hover:border-emerald-500/25 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Sparkles className="mb-3 h-9 w-9 text-slate-700" />
                  <h3 className="text-sm font-black text-white">Mulai percakapan bisnis</h3>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    AI hanya berjalan saat Anda mengirim pesan. Gunakan konteks waktu yang dipilih di halaman insight.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message, index) => (
                    <ChatBubble key={`${message.role}-${index}-${message.generatedAt || ''}`} message={message} />
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-2 font-bold text-emerald-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          AI sedang menganalisis data...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-850 p-3">
              {error && <p className="mb-2 text-[11px] font-semibold text-amber-300">{error}</p>}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <div className="min-w-0 flex-1">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value.slice(0, 500))}
                    maxLength={500}
                    disabled={loading}
                    placeholder="Tulis pertanyaan bisnis..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500 disabled:opacity-60"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                    <button type="button" onClick={clearChat} className="font-semibold hover:text-slate-300">
                      Hapus Riwayat Chat
                    </button>
                    <span>{input.length}/500</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Kirim pertanyaan"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 px-4 py-3 text-left shadow-2xl shadow-emerald-500/15 transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-slate-850"
        aria-label="Buka Tanya AI Pilot"
      >
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-300" />
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-black text-white">Tanya AI Pilot</span>
          <span className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold ${loading ? 'text-amber-300' : aiReady ? 'text-emerald-400' : 'text-amber-300'}`}>
            {statusLabel === 'Loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {statusLabel}
          </span>
        </span>
      </button>
    </>
  );
}

function ChatBubble({ message }: { message: OwnerChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[86%] rounded-2xl p-3 text-xs leading-relaxed ${
          isUser
            ? 'rounded-tr-md bg-emerald-500 text-slate-950'
            : 'rounded-tl-md border border-slate-800 bg-slate-950 text-slate-300'
        }`}
      >
        {!isUser && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${message.source === 'llm' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'}`}>
              {message.source === 'llm' ? 'AI' : 'Fallback'}
            </span>
            {message.dateRangeLabel && <span className="text-[10px] font-semibold text-slate-500">{message.dateRangeLabel}</span>}
            {message.generatedAt && <span className="text-[10px] text-slate-600">{formatDateTime(message.generatedAt)}</span>}
          </div>
        )}
        <p className="whitespace-pre-line">{message.content}</p>
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">Aksi Disarankan</span>
            <ul className="space-y-1.5">
              {message.suggestedActions.slice(0, 3).map((action, index) => (
                <li key={`${action}-${index}`} className="flex gap-2 text-slate-300">
                  <span className="text-emerald-400">{index + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
