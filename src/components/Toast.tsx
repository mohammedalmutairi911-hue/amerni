import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const icons = { success: CheckCircle, error: AlertCircle, info: Info, warning: AlertCircle }
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  const iconColors = { success: 'text-green-500', error: 'text-red-500', info: 'text-blue-500', warning: 'text-amber-500' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg pointer-events-auto animate-in slide-in-from-top-2 ${colors[t.type]}`}>
              <Icon size={18} className={`flex-shrink-0 ${iconColors[t.type]}`} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} aria-label="إغلاق" className="opacity-50 hover:opacity-100 w-9 h-9 -m-2 flex items-center justify-center flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
