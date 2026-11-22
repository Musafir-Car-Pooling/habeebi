import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو", rtl: true },
  { code: "ru", label: "Roman Urdu" },
  { code: "hi", label: "हिन्दी" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية", rtl: true },
  { code: "bn", label: "বাংলা" },
  { code: "tl", label: "Tagalog" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];
const ORDER: Lang[] = LANGS.map((l) => l.code);

// [en, ur, roman urdu, hi, zh, ar, bn, tl]
const D = {
  slogan: ["an ultimate service provider", "ایک بہترین سروس فراہم کنندہ", "aik behtareen service provider", "एक बेहतरीन सर्विस प्रोवाइडर", "终极服务提供平台", "مزود الخدمات الأمثل", "সেরা সার্ভিস প্রোভাইডার", "ang pinakamahusay na service provider"],
  skip: ["Skip", "چھوڑیں", "Skip", "छोड़ें", "跳过", "تخطي", "এড়িয়ে যান", "Laktawan"],
  next: ["Next", "آگے", "Agay", "आगे", "下一步", "التالي", "পরবর্তী", "Susunod"],
  getStarted: ["Get started", "شروع کریں", "Shuru karein", "शुरू करें", "开始使用", "ابدأ الآن", "শুরু করুন", "Magsimula"],
  haveAccount: ["I already have an account", "میرا اکاؤنٹ پہلے سے ہے", "Mera account pehle se hai", "मेरा अकाउंट पहले से है", "我已有账户", "لدي حساب بالفعل", "আমার অ্যাকাউন্ট আছে", "May account na ako"],
  ob1t: ["Every service, one app", "ہر سروس، ایک ایپ", "Har service, aik app", "हर सर्विस, एक ऐप", "所有服务，一个应用", "كل الخدمات في تطبيق واحد", "সব সার্ভিস, এক অ্যাপে", "Lahat ng serbisyo, isang app"],
  ob1d: ["Electricians, plumbers, cleaners, maids, cooks and more across the UAE.", "یو اے ای بھر میں الیکٹریشن، پلمبر، صفائی والے، ماسی، باورچی اور مزید۔", "UAE bhar mein electrician, plumber, cleaner, maid, cook aur bohot kuch.", "यूएई भर में इलेक्ट्रीशियन, प्लंबर, क्लीनर, मेड, कुक और भी बहुत कुछ।", "阿联酋各地的电工、水管工、清洁工、女佣、厨师等。", "كهربائيون وسباكون وعمال نظافة وخادمات وطهاة في جميع أنحاء الإمارات.", "সংযুক্ত আরব আমিরাত জুড়ে ইলেকট্রিশিয়ান, প্লাম্বার, ক্লিনার, রাঁধুনি ও আরও।", "Electrician, tubero, tagalinis, kasambahay, kusinero at iba pa sa buong UAE."],
  ob2t: ["Name your price", "اپنی قیمت خود لگائیں", "Apni price khud lagayein", "अपनी कीमत खुद तय करें", "自己定价", "حدد سعرك بنفسك", "নিজের দাম ঠিক করুন", "Ikaw ang magtakda ng presyo"],
  ob2d: ["Offer what you want to pay in AED. Providers can accept or counter.", "درہم میں اپنی آفر دیں۔ پرووائیڈر قبول یا جوابی آفر کر سکتے ہیں۔", "AED mein apni offer dein. Providers accept ya counter offer kar sakte hain.", "AED में अपनी ऑफर दें। प्रोवाइडर स्वीकार या काउंटर कर सकते हैं।", "用迪拉姆出价，服务者可接受或还价。", "قدّم عرضك بالدرهم، ويمكن للمزودين القبول أو تقديم عرض مضاد.", "AED-তে আপনার অফার দিন। প্রোভাইডাররা গ্রহণ বা পাল্টা অফার দিতে পারে।", "Mag-alok sa AED. Puwedeng tanggapin o tumawad ang provider."],
  ob3t: ["Location & voice note", "لوکیشن اور وائس نوٹ", "Location aur voice note", "लोकेशन और वॉइस नोट", "位置和语音留言", "الموقع والرسالة الصوتية", "লোকেশন ও ভয়েস নোট", "Lokasyon at voice note"],
  ob3d: ["Share your GPS location and explain the job with a voice note.", "اپنی جی پی ایس لوکیشن بھیجیں اور وائس نوٹ میں کام سمجھائیں۔", "GPS location share karein aur voice note mein kaam samjhayein.", "अपनी GPS लोकेशन भेजें और वॉइस नोट में काम समझाएं।", "分享GPS位置，用语音说明工作内容。", "شارك موقعك واشرح العمل برسالة صوتية.", "GPS লোকেশন শেয়ার করুন, ভয়েস নোটে কাজ বুঝিয়ে দিন।", "Ibahagi ang GPS at ipaliwanag gamit ang voice note."],
  ob4t: ["Live bids, real ratings", "لائیو بولیاں، اصل ریٹنگز", "Live bids, asli ratings", "लाइव बोलियां, असली रेटिंग", "实时报价，真实评分", "عروض مباشرة وتقييمات حقيقية", "লাইভ বিড, আসল রেটিং", "Live na bid, totoong rating"],
  ob4d: ["Offers arrive in seconds. Compare price, ratings and reviews.", "آفرز چند سیکنڈ میں آتی ہیں۔ قیمت، ریٹنگ اور ریویوز کا موازنہ کریں۔", "Offers seconds mein aati hain. Price, rating aur reviews compare karein.", "ऑफर सेकंडों में आते हैं। कीमत, रेटिंग और रिव्यू की तुलना करें।", "几秒内收到报价，比较价格、评分和评价。", "تصلك العروض خلال ثوانٍ. قارن الأسعار والتقييمات.", "কয়েক সেকেন্ডে অফার আসে। দাম, রেটিং ও রিভিউ তুলনা করুন।", "Darating ang alok sa ilang segundo. Ihambing ang presyo at rating."],
  ob5t: ["Connect & chat", "رابطہ اور چیٹ", "Rabta aur chat", "संपर्क और चैट", "联系与聊天", "تواصل ودردش", "যোগাযোগ ও চ্যাট", "Kumonekta at mag-chat"],
  ob5d: ["Accept an offer to get each other's number and chat in the app.", "آفر قبول کریں، ایک دوسرے کا نمبر ملے اور ایپ میں چیٹ کریں۔", "Offer accept karein, aik dosray ka number milay aur app mein chat karein.", "ऑफर स्वीकार करें, एक-दूसरे का नंबर पाएं और ऐप में चैट करें।", "接受报价后互换电话并在应用内聊天。", "اقبل العرض لتحصل على رقم الطرف الآخر وتدردش داخل التطبيق.", "অফার গ্রহণ করলে একে অপরের নম্বর পাবেন ও অ্যাপে চ্যাট করবেন।", "Tanggapin ang alok para makuha ang numero at mag-chat."],
  login: ["Log in", "لاگ ان", "Log in", "लॉग इन", "登录", "تسجيل الدخول", "লগ ইন", "Mag-log in"],
  signup: ["Sign up", "سائن اپ", "Sign up", "साइन अप", "注册", "إنشاء حساب", "সাইন আপ", "Mag-sign up"],
  fullName: ["Full name", "پورا نام", "Poora naam", "पूरा नाम", "姓名", "الاسم الكامل", "পুরো নাম", "Buong pangalan"],
  phone: ["Phone (+971…)", "فون (+971…)", "Phone (+971…)", "फ़ोन (+971…)", "电话 (+971…)", "الهاتف (+971…)", "ফোন (+971…)", "Telepono (+971…)"],
  email: ["Email", "ای میل", "Email", "ईमेल", "邮箱", "البريد الإلكتروني", "ইমেইল", "Email"],
  password: ["Password", "پاس ورڈ", "Password", "पासवर्ड", "密码", "كلمة المرور", "পাসওয়ার্ড", "Password"],
  iAm: ["I am a…", "میں ہوں…", "Main hoon…", "मैं हूं…", "我是…", "أنا…", "আমি…", "Ako ay…"],
  citizen: ["Citizen", "شہری", "Citizen", "नागरिक", "客户", "عميل", "নাগরিক", "Customer"],
  provider: ["Service provider", "سروس پرووائیڈر", "Service provider", "सर्विस प्रोवाइडर", "服务提供者", "مقدم خدمة", "সার্ভিস প্রোভাইডার", "Service provider"],
  pickServices: ["Pick all services you offer", "وہ تمام سروسز چنیں جو آپ دیتے ہیں", "Woh saari services chunein jo aap dete hain", "वे सभी सर्विस चुनें जो आप देते हैं", "选择您提供的所有服务", "اختر كل الخدمات التي تقدمها", "আপনি যে সব সার্ভিস দেন তা বাছুন", "Piliin lahat ng serbisyong inaalok mo"],
  createAccount: ["Create account", "اکاؤنٹ بنائیں", "Account banayein", "अकाउंट बनाएं", "创建账户", "إنشاء حساب", "অ্যাকাউন্ট তৈরি করুন", "Gumawa ng account"],
  wait: ["Please wait…", "انتظار کریں…", "Intezar karein…", "कृपया रुकें…", "请稍候…", "يرجى الانتظار…", "অপেক্ষা করুন…", "Sandali lang…"],
  needNamePhone: ["Name and phone are required", "نام اور فون ضروری ہے", "Naam aur phone zaroori hai", "नाम और फ़ोन ज़रूरी है", "姓名和电话必填", "الاسم والهاتف مطلوبان", "নাম ও ফোন আবশ্যক", "Kailangan ang pangalan at telepono"],
  needService: ["Pick at least one service", "کم از کم ایک سروس چنیں", "Kam az kam aik service chunein", "कम से कम एक सर्विस चुनें", "至少选择一项服务", "اختر خدمة واحدة على الأقل", "অন্তত একটি সার্ভিস বাছুন", "Pumili ng kahit isang serbisyo"],
  weakPwd: ["This password is too common — choose a stronger one", "یہ پاس ورڈ بہت عام ہے، مضبوط پاس ورڈ رکھیں", "Ye password bohot aam hai — mazboot password rakhein", "यह पासवर्ड बहुत आम है, मज़बूत पासवर्ड चुनें", "密码过于常见，请换一个更强的", "كلمة المرور شائعة جدًا، اختر أقوى", "পাসওয়ার্ডটি খুব সাধারণ, শক্তিশালী দিন", "Masyadong karaniwan ang password"],
  error: ["Something went wrong", "کچھ غلط ہو گیا", "Kuch ghalat ho gaya", "कुछ गलत हो गया", "出错了", "حدث خطأ ما", "কিছু ভুল হয়েছে", "May nagkaproblema"],
  home: ["Home", "ہوم", "Home", "होम", "首页", "الرئيسية", "হোম", "Home"],
  myJobs: ["My jobs", "میرے کام", "Mere jobs", "मेरे काम", "我的工作", "أعمالي", "আমার কাজ", "Aking trabaho"],
  myRequests: ["My requests", "میری درخواستیں", "Meri requests", "मेरी रिक्वेस्ट", "我的请求", "طلباتي", "আমার অনুরোধ", "Aking request"],
  admin: ["Admin", "ایڈمن", "Admin", "एडमिन", "管理", "المشرف", "অ্যাডমিন", "Admin"],
  profile: ["Profile", "پروفائل", "Profile", "प्रोफ़ाइल", "个人资料", "الملف الشخصي", "প্রোফাইল", "Profile"],
  hello: ["Hello", "السلام علیکم", "Salam", "नमस्ते", "你好", "مرحبًا", "হ্যালো", "Kumusta"],
  whatService: ["What service do you need?", "آپ کو کون سی سروس چاہیے؟", "Aap ko kis service ki zaroorat hai?", "आपको कौन सी सर्विस चाहिए?", "您需要什么服务？", "ما الخدمة التي تحتاجها؟", "আপনার কোন সার্ভিস দরকার?", "Anong serbisyo ang kailangan mo?"],
  viewRequests: ["View my requests →", "میری درخواستیں دیکھیں ←", "Meri requests dekhein →", "मेरी रिक्वेस्ट देखें →", "查看我的请求 →", "عرض طلباتي ←", "আমার অনুরোধ দেখুন →", "Tingnan ang aking request →"],
  liveRequests: ["Live requests", "لائیو درخواستیں", "Live requests", "लाइव रिक्वेस्ट", "实时请求", "طلبات مباشرة", "লাইভ অনুরোধ", "Live na request"],
  jobsNear: ["Jobs near you", "آپ کے قریب کام", "Aap ke qareeb jobs", "आपके पास काम", "您附近的工作", "أعمال بالقرب منك", "আপনার কাছের কাজ", "Trabaho malapit sa iyo"],
  noRequests: ["No new requests yet. New ones appear here instantly.", "ابھی کوئی نئی درخواست نہیں۔ نئی درخواست فوراً یہاں آئے گی۔", "Abhi koi nayi request nahi. Nayi request foran yahan dikhegi.", "अभी कोई नई रिक्वेस्ट नहीं। नई रिक्वेस्ट तुरंत यहां दिखेगी।", "暂无新请求，新请求会立即显示。", "لا طلبات جديدة بعد. ستظهر هنا فورًا.", "এখনো নতুন অনুরোধ নেই। নতুন এলে এখানে দেখাবে।", "Wala pang bagong request."],
  noServices: ["You have no services set. Add them in your profile.", "آپ کی کوئی سروس سیٹ نہیں۔ پروفائل میں شامل کریں۔", "Aap ki koi service set nahi. Profile mein add karein.", "आपकी कोई सर्विस सेट नहीं। प्रोफ़ाइल में जोड़ें।", "您尚未设置服务，请在个人资料中添加。", "لم تحدد أي خدمة. أضفها من ملفك.", "কোনো সার্ভিস সেট নেই। প্রোফাইলে যোগ করুন।", "Wala kang serbisyo. Idagdag sa profile."],
  bidSent: ["Bid sent", "بولی بھیج دی", "Bid bhej di", "बोली भेजी", "已报价", "تم الإرسال", "বিড পাঠানো হয়েছে", "Naipadala"],
  loading: ["Loading…", "لوڈ ہو رہا ہے…", "Loading…", "लोड हो रहा है…", "加载中…", "جارٍ التحميل…", "লোড হচ্ছে…", "Naglo-load…"],
  taskDesc: ["Describe the job", "کام کی تفصیل", "Kaam ki tafseel", "काम का विवरण", "描述工作", "صف العمل", "কাজের বিবরণ", "Ilarawan ang trabaho"],
  taskPh: ["e.g. Kitchen sink is leaking, pipe needs replacing…", "مثلاً کچن کا سنک لیک ہو رہا ہے…", "e.g. Kitchen sink leak ho raha hai, pipe change karna hai…", "जैसे किचन सिंक लीक हो रहा है…", "例如：厨房水槽漏水，需要换管…", "مثلاً: حوض المطبخ يسرّب…", "যেমন: রান্নাঘরের সিঙ্ক লিক করছে…", "hal. Tumutulo ang lababo…"],
  voiceNote: ["Voice note", "وائس نوٹ", "Voice note", "वॉइस नोट", "语音留言", "رسالة صوتية", "ভয়েস নোট", "Voice note"],
  holdRecord: ["Hold to record voice note", "ریکارڈ کرنے کے لیے دبائے رکھیں", "Record karne ke liye dabaye rakhein", "रिकॉर्ड करने के लिए दबाए रखें", "按住录音", "اضغط مطولًا للتسجيل", "রেকর্ড করতে চেপে ধরুন", "Pindutin nang matagal para mag-record"],
  recording: ["Recording… release to save", "ریکارڈنگ… چھوڑیں تو محفوظ", "Recording… chhorein to save", "रिकॉर्डिंग… छोड़ें तो सेव", "录音中…松开保存", "جارٍ التسجيل… اترك للحفظ", "রেকর্ড হচ্ছে… ছাড়লে সেভ", "Nagre-record… bitawan para i-save"],
  micDenied: ["Microphone permission denied", "مائیک کی اجازت نہیں ملی", "Microphone ki permission nahi mili", "माइक की अनुमति नहीं मिली", "麦克风权限被拒绝", "تم رفض إذن الميكروفون", "মাইক্রোফোনের অনুমতি নেই", "Walang pahintulot sa mikropono"],
  location: ["Location", "لوکیشن", "Location", "लोकेशन", "位置", "الموقع", "লোকেশন", "Lokasyon"],
  useLocation: ["Use my current location", "میری موجودہ لوکیشن", "Meri current location use karein", "मेरी मौजूदा लोकेशन", "使用当前位置", "استخدم موقعي الحالي", "আমার বর্তমান লোকেশন", "Gamitin ang aking lokasyon"],
  address: ["Address / building / flat no.", "پتہ / بلڈنگ / فلیٹ نمبر", "Address / building / flat no.", "पता / बिल्डिंग / फ्लैट नं.", "地址/楼宇/房号", "العنوان / المبنى / رقم الشقة", "ঠিকানা / বিল্ডিং / ফ্ল্যাট", "Address / gusali / unit"],
  offerPrice: ["Offer your price", "اپنی قیمت دیں", "Apni price dein", "अपनी कीमत दें", "您的出价", "قدّم سعرك", "আপনার দাম দিন", "Ialok ang presyo"],
  sendRequest: ["Send request", "درخواست بھیجیں", "Request bhejein", "रिक्वेस्ट भेजें", "发送请求", "إرسال الطلب", "অনুরোধ পাঠান", "Ipadala ang request"],
  sending: ["Sending…", "بھیجا جا رہا ہے…", "Bhej rahe hain…", "भेज रहे हैं…", "发送中…", "جارٍ الإرسال…", "পাঠানো হচ্ছে…", "Ipinapadala…"],
  needDesc: ["Please describe the job", "کام کی تفصیل لکھیں", "Kaam ki tafseel likhein", "काम का विवरण लिखें", "请描述工作", "يرجى وصف العمل", "কাজের বিবরণ লিখুন", "Ilarawan ang trabaho"],
  needPrice: ["Enter your offer in AED", "درہم میں آفر لکھیں", "AED mein offer likhein", "AED में ऑफर लिखें", "请输入迪拉姆出价", "أدخل عرضك بالدرهم", "AED-তে অফার লিখুন", "Ilagay ang alok sa AED"],
  noGps: ["Location permission denied", "لوکیشن کی اجازت نہیں ملی", "Location permission nahi mili", "लोकेशन की अनुमति नहीं मिली", "位置权限被拒绝", "تم رفض إذن الموقع", "লোকেশনের অনুমতি নেই", "Walang pahintulot sa lokasyon"],
  showMap: ["Show map", "نقشہ دکھائیں", "Map dikhayein", "नक्शा दिखाएं", "显示地图", "عرض الخريطة", "ম্যাপ দেখুন", "Ipakita ang mapa"],
  searching: ["Searching your service provider…", "آپ کا سروس پرووائیڈر تلاش ہو رہا ہے…", "Aap ka service provider dhoond rahe hain…", "आपका सर्विस प्रोवाइडर खोज रहे हैं…", "正在寻找服务提供者…", "جارٍ البحث عن مقدم الخدمة…", "আপনার সার্ভিস প্রোভাইডার খোঁজা হচ্ছে…", "Hinahanap ang iyong provider…"],
  yourOffer: ["Your offer", "آپ کی آفر", "Aap ki offer", "आपकी ऑफर", "您的出价", "عرضك", "আপনার অফার", "Iyong alok"],
  offersAppear: ["Offers will appear here", "آفرز یہاں آئیں گی", "Offers yahan aayengi", "ऑफर यहां आएंगे", "报价将显示在这里", "ستظهر العروض هنا", "অফার এখানে আসবে", "Lalabas dito ang mga alok"],
  accept: ["Accept", "قبول", "Accept", "स्वीकार", "接受", "قبول", "গ্রহণ", "Tanggapin"],
  decline: ["Decline", "رد", "Decline", "अस्वीकार", "拒绝", "رفض", "প্রত্যাখ্যান", "Tanggihan"],
  newPro: ["New", "نیا", "Naya", "नया", "新", "جديد", "নতুন", "Bago"],
  cancelRequest: ["Cancel request", "درخواست منسوخ کریں", "Request cancel karein", "रिक्वेस्ट रद्द करें", "取消请求", "إلغاء الطلب", "অনুরোধ বাতিল", "Kanselahin"],
  offerAccepted: ["Offer accepted!", "آفر قبول ہو گئی!", "Offer accept ho gayi!", "ऑफर स्वीकार हुई!", "已接受报价！", "تم قبول العرض!", "অফার গ্রহণ হয়েছে!", "Tinanggap ang alok!"],
  acceptFor: ["Accept for", "قبول کریں", "Accept for", "स्वीकार करें", "接受", "اقبل بسعر", "গ্রহণ করুন", "Tanggapin sa"],
  orOffer: ["or make your own offer", "یا اپنی آفر دیں", "ya apni offer dein", "या अपनी ऑफर दें", "或自行出价", "أو قدّم عرضك", "অথবা নিজের অফার দিন", "o mag-alok ng sarili"],
  yourPrice: ["Your price (AED)", "آپ کی قیمت (درہم)", "Aap ki price (AED)", "आपकी कीमत (AED)", "您的价格 (AED)", "سعرك (درهم)", "আপনার দাম (AED)", "Iyong presyo (AED)"],
  arrival: ["Arrival (min)", "پہنچنے کا وقت (منٹ)", "Pohanchne ka waqt (min)", "पहुंचने का समय (मिनट)", "到达 (分钟)", "الوصول (دقيقة)", "পৌঁছানো (মিনিট)", "Pagdating (min)"],
  messageOpt: ["Message (optional)", "پیغام (اختیاری)", "Message (optional)", "संदेश (वैकल्पिक)", "留言（可选）", "رسالة (اختياري)", "বার্তা (ঐচ্ছিক)", "Mensahe (opsyonal)"],
  sendOffer: ["Send offer", "آفر بھیجیں", "Offer bhejein", "ऑफर भेजें", "发送报价", "إرسال العرض", "অফার পাঠান", "Ipadala ang alok"],
  offerSent: ["Offer sent", "آفر بھیج دی", "Offer bhej di", "ऑफर भेजी", "报价已发送", "تم إرسال العرض", "অফার পাঠানো হয়েছে", "Naipadala ang alok"],
  waitingReply: ["Waiting for the customer…", "جواب کا انتظار…", "Customer ke jawab ka intezar…", "जवाब का इंतज़ार…", "等待客户回复…", "بانتظار رد العميل…", "উত্তরের অপেক্ষা…", "Hinihintay ang customer…"],
  declined: ["This offer was declined", "یہ آفر رد ہو گئی", "Ye offer decline ho gayi", "यह ऑफर अस्वीकार हुई", "报价被拒绝", "تم رفض هذا العرض", "অফারটি প্রত্যাখ্যাত", "Tinanggihan ang alok"],
  withdraw: ["Withdraw offer", "آفر واپس لیں", "Offer wapas lein", "ऑफर वापस लें", "撤回报价", "سحب العرض", "অফার প্রত্যাহার", "Bawiin ang alok"],
  matched: ["Matched!", "میچ ہو گیا!", "Match ho gaya!", "मैच हो गया!", "匹配成功！", "تمت المطابقة!", "ম্যাচ হয়েছে!", "Na-match!"],
  completed: ["Completed", "مکمل", "Mukammal", "पूरा", "已完成", "مكتمل", "সম্পন্ন", "Tapos na"],
  call: ["Call", "کال", "Call", "कॉल", "致电", "اتصال", "কল", "Tawag"],
  chat: ["Chat", "چیٹ", "Chat", "चैट", "聊天", "دردشة", "চ্যাট", "Chat"],
  markDone: ["Mark job as completed", "کام مکمل کریں", "Job complete mark karein", "काम पूरा करें", "标记为完成", "تعيين كمكتمل", "কাজ সম্পন্ন করুন", "Markahan bilang tapos"],
  jobDone: ["Job completed!", "کام مکمل!", "Job complete!", "काम पूरा!", "工作完成！", "اكتمل العمل!", "কাজ সম্পন্ন!", "Tapos ang trabaho!"],
  rate: ["Rate", "ریٹ کریں", "Rate karein", "रेट करें", "评价", "قيّم", "রেটিং দিন", "I-rate"],
  reviewPh: ["Share your experience…", "اپنا تجربہ لکھیں…", "Apna tajurba likhein…", "अपना अनुभव लिखें…", "分享您的体验…", "شارك تجربتك…", "আপনার অভিজ্ঞতা লিখুন…", "Ibahagi ang karanasan…"],
  submitReview: ["Submit review", "ریویو بھیجیں", "Review bhejein", "रिव्यू भेजें", "提交评价", "إرسال التقييم", "রিভিউ দিন", "Isumite"],
  thanksReview: ["Thanks! Review saved", "شکریہ! ریویو محفوظ", "Shukriya! Review save ho gaya", "धन्यवाद! रिव्यू सेव", "谢谢！评价已保存", "شكرًا! تم حفظ التقييم", "ধন্যবাদ! রিভিউ সেভ হয়েছে", "Salamat! Na-save"],
  yourReview: ["Your review", "آپ کا ریویو", "Aap ka review", "आपका रिव्यू", "您的评价", "تقييمك", "আপনার রিভিউ", "Iyong review"],
  cancelled: ["This request was cancelled.", "یہ درخواست منسوخ ہو گئی۔", "Ye request cancel ho chuki hai.", "यह रिक्वेस्ट रद्द हो गई।", "此请求已取消。", "تم إلغاء هذا الطلب.", "অনুরোধটি বাতিল হয়েছে।", "Nakansela ang request."],
  unavailable: ["This request is not available.", "یہ درخواست دستیاب نہیں۔", "Ye request available nahi.", "यह रिक्वेस्ट उपलब्ध नहीं।", "此请求不可用。", "هذا الطلب غير متاح.", "অনুরোধটি পাওয়া যাচ্ছে না।", "Hindi available ang request."],
  offers: ["offers", "آفرز", "offers", "ऑफर", "个报价", "عروض", "অফার", "alok"],
  nothing: ["Nothing yet.", "ابھی کچھ نہیں۔", "Abhi kuch nahi.", "अभी कुछ नहीं।", "暂无内容。", "لا شيء بعد.", "এখনো কিছু নেই।", "Wala pa."],
  st_open: ["Open", "کھلی", "Open", "खुली", "进行中", "مفتوح", "খোলা", "Bukas"],
  st_accepted: ["Accepted", "قبول شدہ", "Accepted", "स्वीकृत", "已接受", "مقبول", "গৃহীত", "Tinanggap"],
  st_completed: ["Completed", "مکمل", "Mukammal", "पूरा", "已完成", "مكتمل", "সম্পন্ন", "Tapos"],
  st_cancelled: ["Cancelled", "منسوخ", "Cancel", "रद्द", "已取消", "ملغى", "বাতিল", "Nakansela"],
  messagePh: ["Message…", "پیغام…", "Message…", "संदेश…", "消息…", "رسالة…", "বার্তা…", "Mensahe…"],
  save: ["Save", "محفوظ کریں", "Save", "सेव करें", "保存", "حفظ", "সেভ", "I-save"],
  saved: ["Saved", "محفوظ ہو گیا", "Save ho gaya", "सेव हो गया", "已保存", "تم الحفظ", "সেভ হয়েছে", "Na-save"],
  language: ["Language", "زبان", "Zaban", "भाषा", "语言", "اللغة", "ভাষা", "Wika"],
  myServices: ["My services", "میری سروسز", "Meri services", "मेरी सर्विस", "我的服务", "خدماتي", "আমার সার্ভিস", "Aking serbisyo"],
  myRatings: ["My ratings", "میری ریٹنگز", "Meri ratings", "मेरी रेटिंग", "我的评分", "تقييماتي", "আমার রেটিং", "Aking rating"],
  reviews: ["reviews", "ریویوز", "reviews", "रिव्यू", "条评价", "تقييمات", "রিভিউ", "review"],
  blocked: ["Account blocked", "اکاؤنٹ بلاک", "Account block hai", "अकाउंट ब्लॉक", "账户已封禁", "الحساب محظور", "অ্যাকাউন্ট ব্লক", "Naka-block ang account"],
  blockedD: ["An admin has blocked your account.", "ایڈمن نے آپ کا اکاؤنٹ بلاک کر دیا ہے۔", "Admin ne aap ka account block kar diya hai.", "एडमिन ने आपका अकाउंट ब्लॉक किया है।", "管理员已封禁您的账户。", "قام المشرف بحظر حسابك.", "অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন।", "Na-block ng admin ang account mo."],
  signOut: ["Sign out", "سائن آؤٹ", "Sign out", "साइन आउट", "退出", "تسجيل الخروج", "সাইন আউট", "Mag-sign out"],
  provider_t: ["Provider", "پرووائیڈر", "Provider", "प्रोवाइडर", "服务者", "مزود", "প্রোভাইডার", "Provider"],
} satisfies Record<string, string[]>;

export type TKey = keyof typeof D;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => D[k][0] ?? k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("hb-lang") as Lang | null;
    if (saved && ORDER.includes(saved)) setLangState(saved);
  }, []);
  useEffect(() => {
    const meta = LANGS.find((l) => l.code === lang);
    document.documentElement.lang = lang === "ru" ? "ur-Latn" : lang;
    document.documentElement.dir = meta && "rtl" in meta && meta.rtl ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => { setLangState(l); localStorage.setItem("hb-lang", l); }, []);
  const t = useCallback((k: TKey) => { const row = D[k]; return row[ORDER.indexOf(lang)] ?? row[0] ?? k; }, [lang]);
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useT = () => useContext(I18nCtx);

export function LanguagePicker({ className = "" }: { className?: string }) {
  const { lang, setLang } = useT();
  return (
    <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className={`h-9 rounded-full border border-border bg-secondary px-3 text-sm font-semibold ${className}`}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
