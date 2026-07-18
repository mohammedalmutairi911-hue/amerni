// ═══════════════════════════════════════════
// أمرني — الثوابت المركزية
// أي تعديل هنا ينعكس على كل الموقع تلقائياً
// ═══════════════════════════════════════════

export const COMPANY = {
  // بيانات المؤسسة
  name: 'مؤسسة حلول الغد للخدمات الإلكترونية',
  brand: 'أمرني',
  brandEnterprise: 'أمرني للمنشآت',
  tagline: 'منصة الخدمات السعودية',

  // التواصل
  email: 'support@amerniksa.com',
  website: 'https://amerniksa.com',

  // البنك
  bank: 'بنك البلاد',
  iban: 'SA54150009001465965400007',

  // العمولة
  commission: {
    individuals: '2%',
    enterprises: '1%',
    deadlineHours: 72,
  },

  // SLA
  sla: {
    responseHours: 24,
    matchingHours: 72,
    providerReviewHours: 48,
  },
} as const

export const ADMIN_EMAIL = 'moodi199@gmail.com'
