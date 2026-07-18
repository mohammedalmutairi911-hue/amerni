import { Component, ReactNode } from 'react'
import { COMPANY } from '../lib/constants'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" dir="rtl">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-slate-500 mb-6 leading-relaxed">
              نعتذر عن هذا الخلل. جرّب تحديث الصفحة، وإذا استمرت المشكلة تواصل معنا على{' '}
              <a href={`mailto:${COMPANY.email}`} className="text-primary-500 font-medium hover:underline">{COMPANY.email}</a>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-600 transition-colors">
                العودة للرئيسية
              </button>
              <button
                onClick={() => window.location.reload()}
                className="border border-slate-300 text-slate-600 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors">
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
