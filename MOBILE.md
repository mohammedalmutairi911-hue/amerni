# تطبيق أمرني (أندرويد + آيفون) — Capacitor

التطبيق يلف موقع أمرني (React/Vite) داخل تطبيق أصلي. appId: `com.amerniksa.app`.

## بعد أي تعديل في الموقع
    npm run mobile:sync        # يبني الموقع وينسخه لمجلدي android و ios

## أندرويد
- GitHub → Actions → "Mobile build" → Run workflow، ثم تنزّل `amerni-android-debug-apk` (ملف APK للتجربة على الجوال).
- للنشر على Google Play: حساب مطوّر (رسوم لمرة وحدة) + بناء AAB موقّع (`./gradlew bundleRelease`) + مفتاح توقيع.
- محليًا: Android Studio ثم `npx cap open android`.

## آيفون
- يحتاج جهاز Mac + Xcode + حساب Apple Developer (اشتراك سنوي) للتوقيع والنشر.
- `npx cap open ios` ثم Signing & Capabilities، وغيّر Team، ثم Archive.
- الـ workflow على GitHub يتأكد فقط إن المشروع يُبنى (بدون توقيع).

## ملاحظات
- الـ service worker لا يعمل داخل التطبيق (متوقع)، والإشعارات الحالية (Web Push) لا تعمل فيه. الإشعارات داخل التطبيق تحتاج Firebase (FCM) و APNs.
- الأيقونة والسبلاش مولّدة من icon-512؛ ضع أيقونة 1024×1024 بجودة عالية في `resources/icon-only.png` ثم `npx capacitor-assets generate`.
- Apple قد ترفض تطبيق هو مجرد موقع؛ المطلوب ميزات أصلية (إشعارات، مشاركة، إلخ) قبل التقديم.
