# ركز وجاوب - مسابقة الاجتماع 3 ثانوي

## المميزات
- ✅ مسابقة تفاعلية من 5 أسئلة
- ✅ قائمة مراكز للمجيبين بشكل صحيح
- ✅ حفظ بيانات المستخدمين في Firebase
- ✅ صفحة إدارة محمية بكلمة مرور
- ✅ تصميم Dark Mode احترافي
- ✅ متجاوب مع جميع الأجهزة

## إعداد Firebase

1. افتح ملف `firebase-config.js`
2. ضع إعدادات Firebase الخاصة بك في المتغير `firebaseConfig`:

```javascript
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

3. في Firebase Console، تأكد من تفعيل Realtime Database

## كلمة مرور الإدارة

افتح ملف `admin.js` وعدّل كلمة المرور في السطر:
```javascript
const ADMIN_PASSWORD = 'admin123'; // قم بتغيير هذه الكلمة
```

## البنية في Firebase

سيتم إنشاء البنية التالية تلقائياً:
- `questions/` - الأسئلة والإجابات
- `users/` - جميع نتائج المستخدمين
- `leaderboard/` - قائمة المراكز (فقط المجيبين بشكل صحيح)

## الاستخدام

1. افتح `index.html` في المتصفح
2. للوصول لصفحة الإدارة: افتح `admin.html` وأدخل كلمة المرور

