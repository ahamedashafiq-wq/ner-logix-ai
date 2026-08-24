export type AppLanguage = 'en' | 'hi' | 'as' | 'bn'

type MessageKey =
  | 'locationRequired'
  | 'enableLocation'
  | 'mapsMissingKey'
  | 'mapsLoadError'
  | 'gpsUnavailable'
  | 'offline'
  | 'online'
  | 'syncing'
  | 'synced'
  | 'pendingSync'
  | 'demoData'
  | 'demoGps'
  | 'prototypePrediction'
  | 'primaryBlocked'

export const messages: Record<AppLanguage, Record<MessageKey, string>> = {
  en: {
    locationRequired: 'Location permission is required for live GPS tracking.',
    enableLocation: 'Enable Location',
    mapsMissingKey: 'Google Maps could not be loaded. Check your API key and enabled Google Cloud APIs.',
    mapsLoadError: 'Google Maps could not be loaded. Check your API key and enabled Google Cloud APIs.',
    gpsUnavailable: 'GPS unavailable. Showing the North Eastern Region overview.',
    offline: 'Offline',
    online: 'Online',
    syncing: 'Syncing',
    synced: 'Synced',
    pendingSync: 'Pending Sync',
    demoData: 'Demo data',
    demoGps: 'Demo GPS',
    prototypePrediction: 'AI/ML-ready prototype prediction',
    primaryBlocked: 'Primary route blocked — alternative route recommended.',
  },
  hi: {
    locationRequired: 'लाइव GPS ट्रैकिंग के लिए स्थान अनुमति आवश्यक है।',
    enableLocation: 'स्थान सक्षम करें',
    mapsMissingKey: 'Google Maps लोड नहीं हो सका। API कुंजी और Google Cloud APIs जाँचें।',
    mapsLoadError: 'Google Maps लोड नहीं हो सका। API कुंजी और Google Cloud APIs जाँचें।',
    gpsUnavailable: 'GPS उपलब्ध नहीं है। पूर्वोत्तर क्षेत्र का अवलोकन दिखाया जा रहा है।',
    offline: 'ऑफलाइन',
    online: 'ऑनलाइन',
    syncing: 'सिंक हो रहा है',
    synced: 'सिंक हो गया',
    pendingSync: 'सिंक बाकी',
    demoData: 'डेमो डेटा',
    demoGps: 'डेमो GPS',
    prototypePrediction: 'AI/ML-तैयार प्रोटोटाइप पूर्वानुमान',
    primaryBlocked: 'मुख्य मार्ग अवरुद्ध — वैकल्पिक मार्ग अनुशंसित।',
  },
  as: {
    locationRequired: 'লাইভ GPS ট্ৰেকিংৰ বাবে অৱস্থানৰ অনুমতি প্ৰয়োজন।',
    enableLocation: 'অৱস্থান সক্ষম কৰক',
    mapsMissingKey: 'Google Maps লোড কৰিব পৰা নগ’ল। API কি’ আৰু Google Cloud APIs পৰীক্ষা কৰক।',
    mapsLoadError: 'Google Maps লোড কৰিব পৰা নগ’ল। API কি’ আৰু Google Cloud APIs পৰীক্ষা কৰক।',
    gpsUnavailable: 'GPS উপলব্ধ নহয়। উত্তৰ-পূব অঞ্চলৰ অৱলোকন দেখুওৱা হৈছে।',
    offline: 'অফলাইন',
    online: 'অনলাইন',
    syncing: 'ছিংক হৈ আছে',
    synced: 'ছিংক সম্পূৰ্ণ',
    pendingSync: 'ছিংক বাকী',
    demoData: 'ডেমো তথ্য',
    demoGps: 'ডেমো GPS',
    prototypePrediction: 'AI/ML-প্ৰস্তুত প্ৰ’ট’টাইপ পূৰ্বাভাস',
    primaryBlocked: 'মূল পথ অৱৰোধ — বিকল্প পথৰ পৰামৰ্শ।',
  },
  bn: {
    locationRequired: 'লাইভ GPS ট্র্যাকিংয়ের জন্য অবস্থানের অনুমতি প্রয়োজন।',
    enableLocation: 'অবস্থান চালু করুন',
    mapsMissingKey: 'Google Maps লোড করা যায়নি। API কী এবং Google Cloud APIs পরীক্ষা করুন।',
    mapsLoadError: 'Google Maps লোড করা যায়নি। API কী এবং Google Cloud APIs পরীক্ষা করুন।',
    gpsUnavailable: 'GPS নেই। উত্তর-পূর্বাঞ্চলের ওভারভিউ দেখানো হচ্ছে।',
    offline: 'অফলাইন',
    online: 'অনলাইন',
    syncing: 'সিঙ্ক হচ্ছে',
    synced: 'সিঙ্ক হয়েছে',
    pendingSync: 'সিঙ্ক বাকি',
    demoData: 'ডেমো ডেটা',
    demoGps: 'ডেমো GPS',
    prototypePrediction: 'AI/ML-প্রস্তুত প্রোটোটাইপ পূর্বাভাস',
    primaryBlocked: 'মূল রুট বন্ধ — বিকল্প রুট সুপারিশ করা হয়েছে।',
  },
}

export function t(language: AppLanguage, key: MessageKey): string {
  return messages[language][key]
}
