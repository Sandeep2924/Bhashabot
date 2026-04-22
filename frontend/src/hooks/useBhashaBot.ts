import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { uploadNotes, sendChat, clearNotes, getStats } from '@/lib/api'
import type { UploadResponse, ChatResponse } from '@/lib/api'

// ── useUpload ─────────────────────────────────────────────────────────────

export interface UploadedFile {
  name: string
  docId: string
  chunks: number
  chars: number
}

export function useUpload() {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const upload = useCallback(async (file: File): Promise<UploadResponse | null> => {
    setUploading(true)
    const toastId = toast.loading(`📖 Reading "${file.name}"...`)
    try {
      const data = await uploadNotes(file)
      setFiles(prev => [...prev, {
        name: data.filename,
        docId: data.doc_id,
        chunks: data.chunks_created,
        chars: data.total_characters,
      }])
      toast.success(`✅ ${data.chunks_created} sections indexed from "${file.name}"`, { id: toastId })
      return data
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed. Is the backend running on port 8000?'
      toast.error(`❌ ${msg}`, { id: toastId })
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      await clearNotes()
      setFiles([])
      toast.success('All notes cleared.')
    } catch {
      toast.error('Failed to clear notes.')
    }
  }, [])

  return { uploading, files, upload, clear, setFiles }
}

// ── useChat ───────────────────────────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  sources?: string[]
  chunks?: number
  timestamp: Date
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const send = useCallback(async (question: string) => {
    if (!question.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const data = await sendChat(question)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.answer,
        sources: data.sources,
        chunks: data.chunks_used,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Something went wrong. Check the backend.'
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `⚠️ **Error:** ${detail}`,
        timestamp: new Date(),
      }])
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }, [loading])

  const addSystemMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      text,
      timestamp: new Date(),
    }])
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, loading, send, addSystemMessage, clearMessages }
}
