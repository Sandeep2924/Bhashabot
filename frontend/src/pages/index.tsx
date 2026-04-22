import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Send, Trash2, BookOpen, Zap, Brain,
  FileText, Image as ImageIcon, CheckCircle2, AlertCircle,
  MessageSquare, Sparkles, ChevronDown, RefreshCw, Info
} from 'lucide-react'
import { useUpload, useChat } from '@/hooks/useBhashaBot'
import { getHealth } from '@/lib/api'

const SUGGESTIONS = [
  'Linked list ke types kya hain?',
  'Explain recursion from my notes',
  'Sorting algorithms summarize karo',
  'What is time complexity?',
  'Arrays aur linked lists mein kya fark hai?',
  'Binary search kaise kaam karta hai?',
]

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? '#6b6b8a' : ok ? '#6af7c8' : '#f76a6a'
  const label = ok === null ? 'checking...' : ok ? 'backend online' : 'backend offline'
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', fontFamily: 'DM Mono' }}>
      <span className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: ok ? `0 0 6px ${color}` : 'none', transition: 'background 0.4s' }} />
      <span style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex justify-start">
      <div className="msg-ai px-5 py-4 flex items-center gap-3">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <Brain size={11} color="white" />
        </div>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <span key={i} className={`w-2 h-2 rounded-full dot-${i + 1}`}
              style={{ background: 'var(--accent)', display: 'inline-block' }} />
          ))}
          <span className="text-xs ml-2" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
            Searching notes...
          </span>
        </div>
      </div>
    </motion.div>
  )
}

type Msg = {
  id: string; role: 'user' | 'ai'; text: string;
  sources?: string[]; chunks?: number; timestamp: Date
}

function MessageBubble({ msg }: { msg: Msg }) {
  const [showSrc, setShowSrc] = useState(false)
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[76%] ${isUser ? 'msg-user' : 'msg-ai'} px-5 py-4`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Brain size={11} color="white" />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)', fontFamily: 'DM Mono' }}>BhashaBot</span>
          </div>
        )}
        <div className={isUser ? 'text-sm' : 'prose-ai'} style={{ color: 'var(--text)', fontFamily: isUser ? 'Syne' : undefined }}>
          {isUser ? <p>{msg.text}</p> : <ReactMarkdown>{msg.text}</ReactMarkdown>}
        </div>
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setShowSrc(v => !v)}
              className="flex items-center gap-1.5 text-xs hover:opacity-80"
              style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
              <MessageSquare size={11} />
              {msg.chunks} section{msg.chunks !== 1 ? 's' : ''} referenced
              <ChevronDown size={11} style={{ transform: showSrc ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <AnimatePresence>
              {showSrc && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 space-y-1.5">
                    {msg.sources.map((s, i) => (
                      <div key={i} className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: 'rgba(124,106,247,0.07)', border: '1px solid rgba(124,106,247,0.18)', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                        <span style={{ color: 'var(--accent)' }}>§{i + 1} </span>{s}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="mt-1 text-right">
          <span className="text-xs" style={{ color: 'var(--border)', fontFamily: 'DM Mono' }}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [input, setInput] = useState('')
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [chunksTotal, setChunksTotal] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { uploading, files, upload, clear: clearFiles } = useUpload()
  const { messages, loading, send, addSystemMessage, clearMessages } = useChat()

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth()
      setBackendOk(h.status === 'healthy')
      setChunksTotal(h.chunks_stored)
    } catch { setBackendOk(false) }
  }, [])

  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, 20000)
    return () => clearInterval(id)
  }, [checkHealth])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    const result = await upload(accepted[0])
    if (result) {
      setChunksTotal(n => n + result.chunks_created)
      if (messages.length === 0) {
        addSystemMessage(
          `**Notes loaded!** 🎓\n\nMaine **"${result.filename}"** ke **${result.chunks_created} sections** index kar liye hain.\n\nAb neeche koi bhi sawaal poochho — Hindi ya English mein. Main sirf aapke notes se jawab dunga, kuch aur nahi.`
        )
      }
    }
  }, [upload, messages.length, addSystemMessage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: 1,
    disabled: uploading,
  })

  const handleSend = () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    send(q)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleClearAll = async () => {
    clearMessages()
    await clearFiles()
    setChunksTotal(0)
  }

  const notesReady = chunksTotal > 0

  return (
    <div className="noise grid-bg h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(24px)', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-accent"
            style={{ background: 'linear-gradient(135deg, #7c6af7, #5b4de0)' }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none" style={{ fontFamily: 'Syne' }}>
              Bhasha<span style={{ color: 'var(--accent)' }}>Bot</span>
            </h1>
            <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
              Groq · Llama 3 70B · Hindi + English
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot ok={backendOk} />
          {chunksTotal > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'rgba(106,247,200,0.08)', border: '1px solid rgba(106,247,200,0.25)', fontFamily: 'DM Mono', color: 'var(--accent3)' }}>
              <Zap size={11} />{chunksTotal} chunks
            </motion.div>
          )}
          <button onClick={checkHealth} title="Refresh"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <RefreshCw size={12} style={{ color: 'var(--muted)' }} />
          </button>
          {(files.length > 0 || messages.length > 0) && (
            <button onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs hover:opacity-80"
              style={{ background: 'rgba(247,106,106,0.1)', border: '1px solid rgba(247,106,106,0.25)', color: 'var(--danger)', fontFamily: 'DM Mono' }}>
              <Trash2 size={11} /> Clear All
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 flex flex-col"
          style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' }}>
          <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>📚 Upload Notes</p>
            <div {...getRootProps()} className={`cursor-pointer rounded-2xl p-5 text-center transition-all duration-300
              ${isDragActive ? 'glow-accent' : 'upload-pulse'} ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`, background: isDragActive ? 'rgba(124,106,247,0.1)' : 'var(--surface2)' }}>
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full animate-spin"
                    style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} />
                  <p className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>Processing...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(124,106,247,0.12)' }}>
                    <Upload size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {isDragActive ? 'Drop it!' : 'Drop PDF or Image'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>PDF · JPG · PNG · WebP</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-3 mt-6 opacity-40">
                <BookOpen size={28} style={{ color: 'var(--muted)' }} />
                <p className="text-xs text-center" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                  No files yet.<br />Upload a PDF or image.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3"
                  style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>Loaded Files</p>
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-xl flex items-start gap-3"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(106,247,200,0.1)' }}>
                        {f.name.toLowerCase().endsWith('.pdf')
                          ? <FileText size={14} style={{ color: 'var(--accent3)' }} />
                          : <ImageIcon size={14} style={{ color: 'var(--accent3)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }} title={f.name}>{f.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                          {f.chunks} chunks · {(f.chars / 1000).toFixed(1)}k chars
                        </p>
                      </div>
                      <CheckCircle2 size={13} style={{ color: 'var(--accent3)', flexShrink: 0, marginTop: 2 }} />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { e: '🚫', t: 'No hallucinations' },
              { e: '⚡', t: 'Groq ~500 tokens/sec' },
              { e: '🇮🇳', t: 'Hindi + English' },
              { e: '💾', t: 'Local ChromaDB' },
            ].map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm">{x.e}</span>
                <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>{x.t}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full gap-8 text-center">
                <div>
                  <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5 glow-accent"
                    style={{ background: 'linear-gradient(135deg, var(--accent), #5b4de0)' }}>
                    <Sparkles size={38} color="white" />
                  </div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Apne notes upload karo</h2>
                  <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: 'var(--muted)' }}>
                    PDF ya image upload karo, phir koi bhi sawaal poochho.
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-3 tracking-widest uppercase" style={{ color: 'var(--muted)', fontFamily: 'DM Mono' }}>Try asking</p>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + i * 0.06 }}
                        onClick={() => { setInput(s); inputRef.current?.focus() }}
                        className="px-3 py-2.5 rounded-xl text-xs text-left hover:opacity-80 active:scale-95 transition-all"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg as Msg} />)}
            </AnimatePresence>

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 px-6 pb-5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {backendOk === false && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(247,106,106,0.08)', border: '1px solid rgba(247,106,106,0.2)', color: 'var(--danger)', fontFamily: 'DM Mono' }}>
                <AlertCircle size={13} />
                Backend offline — run <code className="mx-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(247,106,106,0.15)' }}>uvicorn main:app --reload</code>
              </motion.div>
            )}
            {backendOk && !notesReady && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(247,162,106,0.08)', border: '1px solid rgba(247,162,106,0.2)', color: 'var(--accent2)', fontFamily: 'DM Mono' }}>
                <Info size={13} /> Upload your notes first — then ask anything!
              </motion.div>
            )}
            <div className="gradient-border">
              <div className="flex items-end gap-3 px-4 py-3 rounded-[15px]" style={{ background: 'var(--surface)' }}>
                <textarea ref={inputRef} rows={1} value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={notesReady ? 'Koi bhi sawaal poochho... (Hindi ya English)' : 'Pehle notes upload karo...'}
                  disabled={!notesReady || loading}
                  className="flex-1 resize-none bg-transparent text-sm outline-none"
                  style={{
                    color: 'var(--text)', fontFamily: 'Syne, Noto Sans Devanagari, sans-serif',
                    maxHeight: '120px', lineHeight: '1.6', caretColor: 'var(--accent)',
                    opacity: (!notesReady || loading) ? 0.45 : 1,
                  }}
                />
                <button onClick={handleSend} disabled={!input.trim() || loading || !notesReady}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: (input.trim() && notesReady) ? 'var(--accent)' : 'var(--surface2)',
                    opacity: (!input.trim() || loading || !notesReady) ? 0.35 : 1,
                    boxShadow: (input.trim() && notesReady) ? '0 0 18px rgba(124,106,247,0.45)' : 'none',
                  }}>
                  <Send size={15} color="white" />
                </button>
              </div>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--border)', fontFamily: 'DM Mono' }}>
              Enter to send · Shift+Enter newline · Answers ONLY from your notes
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
