import { useState } from 'react'

interface Props {
  amount: number
  taskId: string
  description: string
  className?: string
  label?: string
}

export function PaymobButton({ amount, taskId, description, className, label = 'ادفع الآن' }: Props) {
  const [loading, setLoading] = useState(false)
  const publicKey = import.meta.env.VITE_PAYMOB_PUBLIC_KEY || ''
  const secretKey = import.meta.env.VITE_PAYMOB_SECRET_KEY || ''

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await fetch('https://ksa.paymob.com/v1/intention/', {
        method: 'POST',
        headers: { 'Authorization': `Token ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'SAR',
          payment_methods: ['card'],
          items: [{ name: description, amount: Math.round(amount * 100), description, quantity: 1 }],
          billing_data: {
            first_name: 'Customer', last_name: 'SA',
            email: 'customer@amerniksa.com', phone_number: '+966500000000',
            country: 'SA', city: 'Riyadh', street: 'NA', building: 'NA', floor: 'NA', apartment: 'NA',
          },
          special_reference: `amerni_${taskId}_${Date.now()}`,
          redirection_url: `${window.location.origin}?payment=success&task=${taskId}`,
        }),
      })
      const data = await res.json()
      if (data.client_secret) {
        window.location.href = `https://ksa.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${data.client_secret}`
      } else {
        alert('خطأ في الدفع — حاول مرة أخرى')
      }
    } catch {
      alert('خطأ — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handlePay} disabled={loading}
      className={className || 'w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all active:scale-95'}>
      {loading ? '⏳ جاري التحضير...' : `${label} — ${amount} ريال 💳`}
    </button>
  )
}
