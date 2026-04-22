import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// ── Types ─────────────────────────────────────────────────────────────────

export interface UploadResponse {
  success: boolean
  filename: string
  doc_id: string
  chunks_created: number
  total_characters: number
  preview: string
}

export interface ChatRequest {
  question: string
}

export interface ChatResponse {
  answer: string
  sources: string[]
  chunks_used: number
}

export interface HealthResponse {
  status: string
  chunks_stored: number
  groq_configured: boolean
  model: string
}

export interface StatsResponse {
  chunks_stored: number
  ready: boolean
}

// ── API Calls ─────────────────────────────────────────────────────────────

export const uploadNotes = async (file: File): Promise<UploadResponse> => {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const sendChat = async (question: string): Promise<ChatResponse> => {
  const res = await api.post<ChatResponse>('/chat', { question })
  return res.data
}

export const getHealth = async (): Promise<HealthResponse> => {
  const res = await api.get<HealthResponse>('/health')
  return res.data
}

export const getStats = async (): Promise<StatsResponse> => {
  const res = await api.get<StatsResponse>('/stats')
  return res.data
}

export const clearNotes = async (): Promise<void> => {
  await api.delete('/clear')
}

export default api
