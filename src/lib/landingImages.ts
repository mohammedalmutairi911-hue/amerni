// صور الصفحة الرئيسية — ضع الملفات في public/img بنفس الأسماء.
// أي صورة غير موجودة تُستبدل تلقائياً ببطاقة تدرّج + أيقونة (لا تظهر أيقونة صورة مكسورة).
export const LANDING_IMG = {
  shopping: '/img/shopping.jpg',
  gov: '/img/gov.jpg',
  photo: '/img/photo.jpg',
  verify: '/img/verify.jpg',
  delivery: '/img/delivery.jpg',
  queue: '/img/queue.jpg',
  gift: '/img/gift.jpg',
  other: '/img/other.jpg',
  provider: '/img/provider.jpg',
  enterprises: '/img/enterprises.jpg',
  individuals: '/img/individuals.jpg',
} as const
export type LandingImgKey = keyof typeof LANDING_IMG
