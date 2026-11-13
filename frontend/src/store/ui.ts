import { create } from 'zustand'
import type { Period } from '../types/api'

type Overlay = 'import' | 'profile' | null

interface UiState {
  period: Period
  selectedDate: string
  activeSection: string
  overlay: Overlay
  setPeriod: (period: Period) => void
  setSelectedDate: (date: string) => void
  setActiveSection: (section: string) => void
  openOverlay: (overlay: Exclude<Overlay, null>) => void
  closeOverlay: () => void
}

function localIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export const useUiStore = create<UiState>((set) => ({
  period: 90,
  selectedDate: localIsoDate(),
  activeSection: 'today',
  overlay: null,
  setPeriod: (period) => set({ period }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setActiveSection: (activeSection) => set({ activeSection }),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
}))
