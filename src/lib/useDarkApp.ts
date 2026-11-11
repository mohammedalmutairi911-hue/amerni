import { useEffect } from 'react'

// يفعّل السكن الداكن (src/styles/dark-app.css) على body طول ما الصفحة مفتوحة.
// على body عشان يشمل النافبار والنوافذ اللي تنفتح خارج الصفحة (portals).
export function useDarkApp() {
  useEffect(() => {
    document.body.classList.add('amerni-dark')
    return () => document.body.classList.remove('amerni-dark')
  }, [])
}
