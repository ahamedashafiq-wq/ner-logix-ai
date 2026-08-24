export type AppLanguage = 'en' | 'hi' | 'as' | 'bn'

export type MessageKey =
  | 'locationRequired'
  | 'enableLocation'
  | 'captureLocation'
  | 'takePhoto'
  | 'submitReport'
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
  | 'demoMode'
  | 'liveMode'
  | 'prototypePrediction'
  | 'primaryBlocked'
  | 'findAlternativeRoute'
  | 'runSimulation'
  | 'dashboard'
  | 'liveMap'
  | 'vehicles'
  | 'deliveries'
  | 'routes'
  | 'incidents'
  | 'predictions'
  | 'supplies'
  | 'warehouses'
  | 'analytics'
  | 'disasterSimulation'
  | 'fieldReports'
  | 'settings'
  | 'emergencyMode'
  | 'emergencyActive'
  | 'safe'
  | 'moderate'
  | 'highRisk'
  | 'blocked'
  | 'critical'
  | 'medicineScenario'

export const messages: Record<AppLanguage, Record<MessageKey, string>> = {
  en: {
    locationRequired: 'Location permission is required for live GPS tracking.',
    enableLocation: 'Enable Location',
    captureLocation: 'Capture Location',
    takePhoto: 'Take / Upload Photo',
    submitReport: 'Submit Field Report',
    mapsMissingKey: 'Google Maps API key missing. Operating in fallback interactive GIS map mode.',
    mapsLoadError: 'Google Maps could not be loaded. Showing fallback operations map.',
    gpsUnavailable: 'GPS unavailable. Showing North Eastern Region operational center.',
    offline: 'Offline',
    online: 'Online',
    syncing: 'Syncing...',
    synced: 'All Reports Synced',
    pendingSync: 'Reports Waiting for Sync',
    demoData: 'Demo Data',
    demoGps: 'Simulated GPS',
    demoMode: 'DEMO MODE',
    liveMode: 'LIVE MODE',
    prototypePrediction: 'AI Risk Prediction Engine',
    primaryBlocked: 'Primary route blocked — alternative route recommended.',
    findAlternativeRoute: 'Find Alternative Route',
    runSimulation: 'Run Disaster Simulation',
    dashboard: 'Dashboard',
    liveMap: 'Live Map',
    vehicles: 'Vehicles',
    deliveries: 'Deliveries',
    routes: 'Routes & Corridors',
    incidents: 'Incidents',
    predictions: 'AI Risk Predictions',
    supplies: 'Supplies',
    warehouses: 'Warehouses',
    analytics: 'District Analytics',
    disasterSimulation: 'Disaster Simulator',
    fieldReports: 'Field Reports',
    settings: 'Settings',
    emergencyMode: 'Emergency Mode',
    emergencyActive: 'Emergency Active',
    safe: 'Safe',
    moderate: 'Moderate',
    highRisk: 'High Risk',
    blocked: 'Blocked',
    critical: 'Critical',
    medicineScenario: 'Medicine Delivery Emergency',
  },
  hi: {
    locationRequired: 'लाइव GPS ट्रैकिंग के लिए स्थान अनुमति आवश्यक है।',
    enableLocation: 'स्थान सक्षम करें',
    captureLocation: 'स्थान कैप्चर करें',
    takePhoto: 'फोटो लें / अपलोड करें',
    submitReport: 'फील्ड रिपोर्ट सबमिट करें',
    mapsMissingKey: 'Google Maps API कुंजी अनुपलब्ध है। फॉलबैक इंटरैक्टिव GIS मैप मोड सक्रिय है।',
    mapsLoadError: 'Google Maps लोड नहीं हो सका। फॉलबैक ऑपरेशंस मैप दिखाया जा रहा है।',
    gpsUnavailable: 'GPS उपलब्ध नहीं है। पूर्वोत्तर क्षेत्र संचालन केंद्र दिखाया जा रहा है।',
    offline: 'ऑफलाइन',
    online: 'ऑनलाइन',
    syncing: 'सिंक हो रहा है...',
    synced: 'सभी रिपोर्ट सिंक हो गईं',
    pendingSync: 'रिपोर्ट सिंक की प्रतीक्षा में',
    demoData: 'डेमो डेटा',
    demoGps: 'सिम्युलेटेड GPS',
    demoMode: 'डेमो मोड',
    liveMode: 'लाइव मोड',
    prototypePrediction: 'AI जोखिम पूर्वानुमान इंजन',
    primaryBlocked: 'मुख्य मार्ग अवरुद्ध — वैकल्पिक मार्ग अनुशंसित।',
    findAlternativeRoute: 'वैकल्पिक मार्ग खोजें',
    runSimulation: 'आपदा सिमुलेशन चलाएं',
    dashboard: 'डैशबोर्ड',
    liveMap: 'लाइव मैप',
    vehicles: 'वाहन बेड़ा',
    deliveries: 'आपूर्ति डिलीवरी',
    routes: 'मार्ग और गलियारे',
    incidents: 'घटनाएँ',
    predictions: 'AI जोखिम पूर्वानुमान',
    supplies: 'आपूर्ति भंडार',
    warehouses: 'गोदाम / हब',
    analytics: 'जिला विश्लेषण',
    disasterSimulation: 'आपदा सिम्युलेटर',
    fieldReports: 'फील्ड रिपोर्ट',
    settings: 'सेटिंग्स',
    emergencyMode: 'आपातकालीन मोड',
    emergencyActive: 'आपातकाल सक्रिय',
    safe: 'सुरक्षित',
    moderate: 'मध्यम',
    highRisk: 'उच्च जोखिम',
    blocked: 'अवरुद्ध',
    critical: 'गंभीर',
    medicineScenario: 'आपातकालीन दवा वितरण परिदृश्य',
  },
  as: {
    locationRequired: 'লাইভ GPS ট্ৰেকিংৰ বাবে অৱস্থানৰ অনুমতি প্ৰয়োজন।',
    enableLocation: 'অৱস্থান সক্ষম কৰক',
    captureLocation: 'অৱস্থান গ্ৰহণ কৰক',
    takePhoto: 'ফটো তোলক / আপলোড কৰক',
    submitReport: 'ফিল্ড প্ৰতিবেদন জমা দিয়ক',
    mapsMissingKey: 'Google Maps API কী নাই। ফলবেক মানচিত্ৰ প্ৰদৰ্শন কৰা হৈছে।',
    mapsLoadError: 'Google Maps লোড নহ’ল। ফলবেক মানচিত্ৰ প্ৰদৰ্শিত হৈছে।',
    gpsUnavailable: 'GPS উপলব্ধ নহয়। উত্তৰ-পূব অঞ্চলৰ কেন্দ্ৰ প্ৰদৰ্শন কৰা হৈছে।',
    offline: 'অফলাইন',
    online: 'অনলাইন',
    syncing: 'ছিংক হৈ আছে...',
    synced: 'সকলো প্ৰতিবেদন সংলগ্ন হ’ল',
    pendingSync: 'ছিংক বাকী থকা প্ৰতিবেদন',
    demoData: 'ডেমো তথ্য',
    demoGps: 'চিমিউলেটেড GPS',
    demoMode: 'ডেমো মোড',
    liveMode: 'লাইভ মোড',
    prototypePrediction: 'AI বিপদ পূৰ্বাভাস ইঞ্জিন',
    primaryBlocked: 'মূল পথ অৱৰোধ — বিকল্প পথ নিৰ্বাচন কৰক।',
    findAlternativeRoute: 'বিকল্প পথ সন্ধান কৰক',
    runSimulation: 'দুৰ্যোগ অনুকৰণ চলাওক',
    dashboard: 'ডেশ্বব’ৰ্ড',
    liveMap: 'লাইভ মেপ',
    vehicles: 'যান-বাহন',
    deliveries: 'বিতৰণ',
    routes: 'পথ আৰু কৰিডৰ',
    incidents: 'দুৰ্ঘটনা/বিপদ',
    predictions: 'AI বিপদ পূৰ্বাভাস',
    supplies: 'সামগ্ৰী ভাণ্ডাৰ',
    warehouses: 'গুদামসমূহ',
    analytics: 'জিলা বিশ্লেষণ',
    disasterSimulation: 'দুৰ্যোগ চিমুলেটৰ',
    fieldReports: 'ফিল্ড ৰিপ’ৰ্ট',
    settings: 'ছেটিংছ',
    emergencyMode: 'জৰুৰীকালীন মোড',
    emergencyActive: 'জৰুৰীকালীন অৱস্থা',
    safe: 'সুৰক্ষিত',
    moderate: 'মধ্যম',
    highRisk: 'উচ্চ বিপদ',
    blocked: 'অৱৰোধ',
    critical: 'সংকটজনক',
    medicineScenario: 'জৰুৰী ঔষধ বিতৰণ সংকট',
  },
  bn: {
    locationRequired: 'লাইভ GPS ট্র্যাকিংয়ের জন্য অবস্থানের অনুমতি প্রয়োজন।',
    enableLocation: 'অবস্থান চালু করুন',
    captureLocation: 'অবস্থান ক্যাপচার করুন',
    takePhoto: 'ছবি তুলুন / আপলোড করুন',
    submitReport: 'ফিল্ড রিপোর্ট জমা দিন',
    mapsMissingKey: 'Google Maps API কী নেই। বিকল্প GIS মানচিত্র চালু আছে।',
    mapsLoadError: 'Google Maps লোড করা যায়নি। বিকল্প মানচিত্র দেখানো হচ্ছে।',
    gpsUnavailable: 'GPS নেই। উত্তর-পূর্বাঞ্চলের নিয়ন্ত্রণ কেন্দ্র দেখানো হচ্ছে।',
    offline: 'অফলাইন',
    online: 'অনলাইন',
    syncing: 'সিঙ্ক হচ্ছে...',
    synced: 'সব রিপোর্ট সিঙ্ক সম্পন্ন',
    pendingSync: 'সিঙ্ক অপেক্ষমান রিপোর্ট',
    demoData: 'ডেমো ডেটা',
    demoGps: 'সিমুলেটেড GPS',
    demoMode: 'ডেমো মোড',
    liveMode: 'লাইভ মোড',
    prototypePrediction: 'AI ঝুঁকি পূর্বাভাস ইঞ্জিন',
    primaryBlocked: 'মূল পথ বন্ধ — বিকল্প পথ সুপারিশ করা হয়েছে।',
    findAlternativeRoute: 'বিকল্প রুট খুঁজুন',
    runSimulation: 'দুর্যোগ সিমুলেশন চালান',
    dashboard: 'ড্যাশবোর্ড',
    liveMap: 'লাইভ ম্যাপ',
    vehicles: 'যানবাহন বহর',
    deliveries: 'সরবরাহ ডেলিভারি',
    routes: 'রুট ও করিডোর',
    incidents: 'ঘটনা ও বিপর্যয়',
    predictions: 'AI ঝুঁকি পূর্বাভাস',
    supplies: 'জরুরী সামগ্রী',
    warehouses: 'গুদাম ও হাব',
    analytics: 'জেলা অ্যানালিটিক্স',
    disasterSimulation: 'দুর্যোগ সিমুলেটর',
    fieldReports: 'ফিল্ড রিপোর্ট',
    settings: 'সেটিংস',
    emergencyMode: 'জরুরী মোড',
    emergencyActive: 'জরুরী অবস্থা সক্রিয়',
    safe: 'নিরাপদ',
    moderate: 'মাঝারি',
    highRisk: 'উচ্চ ঝুঁকি',
    blocked: 'অবরুদ্ধ',
    critical: 'সংকটজনক',
    medicineScenario: 'জরুরী ওষুধ ডেলিভারি পরিস্থিতি',
  },
}

export function t(language: AppLanguage, key: MessageKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key
}
