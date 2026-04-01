import React, { useState, useEffect, Component } from 'react';
import { 
  Phone, 
  Wrench, 
  Droplets, 
  Search, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Menu, 
  X, 
  ChevronRight, 
  Star,
  AlertCircle,
  ArrowRight,
  Smartphone,
  Info,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  Timer,
  Shield,
  BookOpen,
  User,
  DollarSign,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveImage, getImage, clearAllImages } from './services/db';

// --- Types & Constants ---
type Page = 'home' | 'service' | 'membership' | 'about' | 'booking';
type ServiceType = 'sink' | 'toilet' | 'drain' | 'jetting' | 'endoscopy' | 'odor' | 'leak' | 'repair';

const SERVICES: Record<ServiceType, { title: string; desc: string; icon: any; bgImage: string }> = {
  sink: { title: '싱크대막힘', desc: '음식물, 기름때로 꽉 막힌 싱크대 해결', icon: Droplets, bgImage: 'https://picsum.photos/seed/kitchen-sink-clog/400/300' },
  toilet: { title: '변기막힘', desc: '휴지, 이물질로 역류하는 변기 즉시 뚫음', icon: AlertCircle, bgImage: 'https://picsum.photos/seed/toilet-plumbing/400/300' },
  drain: { title: '하수구막힘', desc: '욕실, 베란다 하수구 물 고임 해결', icon: Droplets, bgImage: 'https://picsum.photos/seed/floor-drain/400/300' },
  jetting: { title: '고압세척', desc: '강력한 물살로 배관 속 유지방 완전 제거', icon: Wrench, bgImage: 'https://picsum.photos/seed/water-jetting/400/300' },
  endoscopy: { title: '배관내시경', desc: '첨단 장비로 배관 속 원인 정밀 진단', icon: Search, bgImage: 'https://picsum.photos/seed/pipe-inspection-camera/400/300' },
  odor: { title: '악취제거', desc: '올라오는 하수구 냄새 완벽 차단 트랩', icon: Info, bgImage: 'https://picsum.photos/seed/bathroom-odor/400/300' },
  leak: { title: '누수탐지', desc: '미세한 누수 지점까지 정확하게 포착', icon: Search, bgImage: 'https://picsum.photos/seed/water-leak-detection/400/300' },
  repair: { title: '기본수리', desc: '수전 교체부터 배관 부속 수리까지', icon: Wrench, bgImage: 'https://picsum.photos/seed/plumbing-repair/400/300' },
};

// --- Utilities ---

/**
 * Optimizes an image by resizing and compressing it.
 */
const optimizeImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // For very high quality (>= 0.95), use PNG to preserve transparency and sharpness (ideal for logos)
          if (quality >= 0.95) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            // Try webp first, fallback to jpeg
            const dataUrl = canvas.toDataURL('image/webp', quality);
            if (dataUrl.startsWith('data:image/webp')) {
              resolve(dataUrl);
            } else {
              resolve(canvas.toDataURL('image/jpeg', quality));
            }
          }
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl max-w-md border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black mb-3">문제가 발생했습니다</h2>
            <p className="text-gray-600 font-bold mb-8 leading-relaxed">
              이미지 용량이 너무 크거나 시스템 오류가 발생했습니다.<br />
              브라우저의 저장 공간이 부족할 수 있습니다.
            </p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="bg-black text-white font-black px-8 py-4 rounded-2xl w-full hover:bg-gray-800 transition-all"
            >
              초기화 후 새로고침
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Navbar = ({ 
  setPage, 
  logoImage, 
  onLogoUpload,
  isShared
}: { 
  setPage: (p: Page) => void,
  logoImage: string | null,
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  isShared: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="fixed top-0 w-full bg-white z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center cursor-pointer group" onClick={() => setPage('home')}>
          <label className={`${logoImage ? 'bg-white' : 'bg-yellow-400'} rounded-xl ${!isShared ? 'cursor-pointer' : ''} relative overflow-hidden w-40 sm:w-48 h-10 sm:h-12 flex items-center justify-center transition-all`}>
            {logoImage ? (
              <img src={logoImage} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center gap-2 px-3">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                <span className="text-base sm:text-lg font-black tracking-tighter text-black">달수배관케어</span>
              </div>
            )}
            {!isShared && (
              <>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
              </>
            )}
          </label>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-bold text-sm">
          <button onClick={() => setPage('home')} className="hover:text-yellow-600">홈</button>
          <button onClick={() => setPage('membership')} className="hover:text-yellow-600">멤버십</button>
          <button onClick={() => setPage('about')} className="hover:text-yellow-600">회사소개</button>
          <button onClick={() => setPage('booking')} className="bg-black text-white px-4 py-2 rounded-full">상담신청</button>
        </div>

        <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-gray-100 p-4 flex flex-col gap-4 font-bold"
          >
            <button onClick={() => { setPage('home'); setIsOpen(false); }}>홈</button>
            <button onClick={() => { setPage('membership'); setIsOpen(false); }}>멤버십 소개</button>
            <button onClick={() => { setPage('about'); setIsOpen(false); }}>회사소개</button>
            <button onClick={() => { setPage('booking'); setIsOpen(false); }} className="bg-yellow-400 text-black p-3 rounded-xl">상담신청하기</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const StatusTicker = () => {
  const statuses = [
    "서울 강남구 싱크대 막힘 해결 완료 (3분 전)",
    "서울 송파구 배관 내시경 정밀 진단 완료 (8분 전)",
    "경기 수원시 변기 역류 긴급 출동 중 (방금)",
    "인천 미추홀구 하수구 고압세척 진행 중 (12분 전)",
    "서울 마포구 하수구 악취 트랩 설치 완료 (20분 전)",
    "경기 성남시 미세 누수 탐지 및 수리 완료 (10분 전)",
    "대구 달서구 싱크대 수전 교체 완료 (15분 전)",
    "부산 해운대구 변기 막힘 즉시 해결 (5분 전)"
  ];

  return (
    <div className="mt-6 sm:mt-8 bg-white/80 backdrop-blur-md rounded-[24px] border border-yellow-200/50 overflow-hidden shadow-sm shadow-yellow-900/5">
      <div className="px-5 py-2.5 border-b border-yellow-100/50 flex items-center justify-between bg-yellow-50/30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">
            <div className="w-1 h-1 bg-white rounded-full" />
            LIVE
          </div>
          <h2 className="text-[11px] font-black text-black tracking-tight uppercase">실시간 서비스 현황</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-green-600 tracking-tight">Active Connection</span>
        </div>
      </div>

      <div className="py-3.5 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex gap-12 items-center">
          {[...statuses, ...statuses, ...statuses, ...statuses].map((status, idx) => (
            <div key={idx} className="flex items-center gap-3 text-[11px] sm:text-[12px] font-bold text-gray-800 tracking-tight">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
              {status}
              <span className="ml-12 text-gray-200 font-light">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Hero = ({ 
  onBooking, 
  heroImage, 
  profileImage, 
  onHeroUpload, 
  onProfileUpload,
  isShared
}: { 
  onBooking: () => void,
  heroImage: string,
  profileImage: string,
  onHeroUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onProfileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  isShared?: boolean
}) => (
  <section className="relative pt-20 md:pt-24 pb-8 px-4 bg-white overflow-hidden">
    {/* Background Decorative Elements */}
    <div className="absolute top-0 right-0 w-1/2 h-full bg-yellow-50/50 -skew-x-12 translate-x-1/4 pointer-events-none hidden md:block" />
    <div className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-100/30 rounded-full blur-3xl pointer-events-none" />
    
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Text Content Area */}
        <div className="lg:col-span-7 text-center lg:text-left order-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-black mb-4 sm:mb-8 tracking-widest uppercase">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              AI 배관 진단 솔루션 1위
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[1.2] lg:leading-[1] mb-6 sm:mb-8 tracking-tighter break-keep">
              막힌 배관, <br />
              <span className="text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]">AI가 3초만에</span> 진단합니다.
            </h1>

            {/* Creative Image Area - Integrated for mobile */}
            <div className="lg:hidden mb-8 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="aspect-square bg-gray-100 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative group max-w-[260px] mx-auto">
                  <img 
                    src={heroImage} 
                    alt="전문 엔지니어" 
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40" />
                  
                  {/* Image Upload Overlay - Mobile */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 shadow-2xl">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={onHeroUpload} 
                    />
                  </label>
                  
                  {/* Floating Badge on Image */}
                  <div className="absolute bottom-2 left-2 right-2 bg-white/10 backdrop-blur-xl border border-white/10 p-1.5 rounded-lg text-white">
                    <div className="flex items-center gap-1.5 mb-0">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[7px] font-black uppercase tracking-widest opacity-80">Now Active</span>
                    </div>
                    <p className="text-[8px] font-black leading-tight">달수배관케어 24시 실시간 응대중</p>
                  </div>
                </div>

                {/* AI Diagnosis Floating Card - Mobile */}
                <div className="absolute -top-3 -right-2 bg-black text-white p-2.5 rounded-[20px] shadow-xl border-2 border-white rotate-6 z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-yellow-400 p-1 rounded-md">
                      <Smartphone className="w-3 h-3 text-black" />
                    </div>
                    <span className="text-[8px] font-black">AI 진단 중</span>
                  </div>
                  <div className="h-1 w-12 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ x: [-50, 50] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full w-1/2 bg-yellow-400"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="mb-8 sm:mb-10 max-w-2xl mx-auto lg:mx-0">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-1"
              >
                <span className="text-lg sm:text-xl font-black italic text-gray-400 drop-shadow-sm uppercase tracking-tighter">
                  불필요한 공사 권유는 이제 그만.
                </span>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black italic tracking-tight leading-none uppercase break-keep">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.2)] pr-1">AI 혁명</span>
                  <span className="text-black ml-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)]">배관 주치의</span>
                </h2>
              </motion.div>
              <p className="mt-6 text-gray-500 font-bold text-sm sm:text-base border-l-4 border-yellow-400 pl-4 break-keep">
                대한민국 최초, 실시간 데이터 분석으로 정확한 원인을 찾아냅니다.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-10 sm:mb-12">
              <a 
                href="tel:1577-1197" 
                className="group relative bg-yellow-400 text-black font-black px-8 py-4 sm:py-5 rounded-2xl text-lg sm:text-2xl shadow-[0_10px_20px_rgba(250,204,21,0.3)] hover:shadow-[0_15px_30px_rgba(250,204,21,0.4)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <Phone className="w-6 h-6 sm:w-7 sm:h-7" /> 1577-1197
              </a>
              <button 
                onClick={onBooking} 
                className="bg-black text-white font-black px-10 py-4 sm:py-5 rounded-2xl text-sm sm:text-lg hover:bg-gray-800 transition-all hover:-translate-y-1 shadow-xl"
              >
                무료 상담 예약하기
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-5 items-center">
              {[
                { icon: ShieldCheck, text: '배관케어마스터', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
                { icon: CheckCircle2, text: '1년 무상 A/S', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                { icon: Smartphone, text: 'AI 정밀 진단', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { icon: Shield, text: '여성안심서비스', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                  className={`flex items-center gap-2 sm:gap-3 ${item.bg} px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border ${item.border} shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
                >
                  <div className="bg-white p-1.5 rounded-xl shadow-inner">
                    <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                  </div>
                  <span className="text-[11px] sm:text-sm font-black tracking-tighter text-gray-800">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Creative Image Area - Desktop Only */}
        <div className="hidden lg:block lg:col-span-5 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* Main Hero Image Frame */}
            <div className="aspect-[4/5] bg-gray-100 rounded-[80px] overflow-hidden border-8 border-white shadow-2xl relative group">
              <img 
                src={heroImage} 
                alt="전문 엔지니어" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40" />
              
              {/* Image Upload Overlay - Desktop */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                <div className="bg-white/20 backdrop-blur-md p-8 rounded-full border border-white/30 shadow-2xl">
                  <Camera className="w-12 h-12 text-white" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={onHeroUpload} 
                />
              </label>
              
              {/* Floating Badge on Image */}
              <div className="absolute bottom-6 left-6 right-6 bg-black/40 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl text-white shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Live Status</span>
                </div>
                <p className="text-base font-black tracking-tight">달수배관케어 24시 실시간 응대중</p>
              </div>
            </div>

            {/* AI Diagnosis Floating Card */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="absolute -top-6 -right-6 bg-black text-white p-5 rounded-[32px] shadow-2xl border-2 border-white rotate-6 z-20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-yellow-400 p-2 rounded-xl">
                  <Smartphone className="w-5 h-5 text-black" />
                </div>
                <span className="text-xs font-black">AI 진단 중</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: [-100, 100] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/2 bg-yellow-400"
                  />
                </div>
                <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase">Analyzing Pipe...</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>

    {/* Status Ticker Integration */}
    <div className="mt-4">
      <StatusTicker />
    </div>
  </section>
);

const ServiceGrid = ({ 
  onSelect, 
  serviceImages, 
  onImageUpload,
  isShared
}: { 
  onSelect: (s: ServiceType) => void,
  serviceImages: Record<ServiceType, string>,
  onImageUpload: (type: ServiceType, e: React.ChangeEvent<HTMLInputElement>) => void,
  isShared?: boolean
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-8 sm:py-16 px-4 bg-white relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-50 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-50 rounded-full blur-[100px] opacity-50" />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4"
          >
            Service Symptoms
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 tracking-tight break-keep"
          >
            서비스 <span className="text-yellow-400">증상</span>
          </motion.h2>

          {/* Navigation Arrows - Centered as requested */}
          <div className="flex justify-center gap-4 mb-10">
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm group"
            >
              <ChevronRight className="w-6 h-6 rotate-180 text-gray-400 group-hover:text-black transition-colors" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm group"
            >
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-black transition-colors" />
            </button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-12 snap-x snap-mandatory"
        >
          {(Object.entries(SERVICES) as [ServiceType, typeof SERVICES.sink][]).map(([key, service], idx) => (
            <motion.div 
              key={key}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="min-w-[260px] sm:min-w-[300px] snap-start group cursor-pointer"
              onClick={() => onSelect(key)}
            >
              <div className="flex flex-col gap-5">
                {/* Image Container with rounded corners */}
                <div className="aspect-[4/3] rounded-[32px] overflow-hidden relative shadow-lg shadow-black/5">
                  <img 
                    src={serviceImages[key] || service.bgImage} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-transparent transition-colors" />
                  
                  {/* Image Upload Trigger */}
                  {!isShared && (
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 z-20 border border-white/30"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => onImageUpload(key, e)} 
                      />
                    </label>
                  )}
                </div>

                {/* Content below image */}
                <div className="px-2 text-center">
                  <div className="inline-block px-3 py-1 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-[10px] font-black mb-3 tracking-tight">
                    {service.title}
                  </div>
                  <h3 className="font-black text-xs sm:text-sm leading-tight tracking-tight group-hover:text-blue-600 transition-colors truncate">
                    {service.desc}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MembershipPromo = ({ onGo, membershipImage, onImageUpload, isShared }: { onGo: () => void, membershipImage: string, onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isShared?: boolean }) => (
  <section className="py-12 px-4 relative overflow-hidden">
    {/* Decorative Background Glows */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-[120px] pointer-events-none" />
    
    <div className="max-w-7xl mx-auto relative">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-[#0A0A0A] rounded-[48px] p-8 md:p-20 text-white overflow-hidden relative group border border-white/5 shadow-2xl"
      >
        {/* Immersive Background Image */}
        <div className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-all duration-1000 scale-105 group-hover:scale-100">
          <img 
            src={membershipImage} 
            alt="Membership Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />
        </div>

        {/* Image Upload Trigger - Sophisticated Design */}
        {!isShared && (
          <label className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-2xl rounded-full flex items-center justify-center cursor-pointer transition-all z-30 border border-white/10 group-hover:scale-110">
            <Camera className="w-5 h-5 text-white/70" />
            <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
          </label>
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="text-center lg:text-left pt-4 lg:pt-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
            >
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
              Premium Care Membership
            </motion.div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tighter break-keep">
              배관 고민, <br />
              <span className="text-yellow-400">월 29,900원</span>으로 <br />
              완벽하게 끝내세요.
            </h2>
            
            <p className="text-gray-400 font-bold text-lg mb-12 max-w-md mx-auto lg:mx-0 leading-relaxed">
              달수배관케어 멤버십은 단순한 수리를 넘어 <br className="hidden md:block" />
              당신의 일상을 지키는 가장 스마트한 방법입니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={onGo} 
                className="group relative bg-yellow-400 text-black font-black px-10 py-5 rounded-2xl text-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(250,204,21,0.2)]"
              >
                멤버십 가입하기
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-5 rounded-2xl text-white font-black border border-white/10 hover:bg-white/5 transition-all">
                혜택 자세히 보기
              </button>
            </div>
          </div>

          {/* Feature Cards - Mobile Optimized Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: '건강검진', desc: '연 4회 배관 정밀 내시경 검진', color: 'bg-blue-500' },
              { icon: Clock, title: '우선배정', desc: '24시간 긴급 출동 최우선 배정', color: 'bg-purple-500' },
              { icon: Droplets, title: '응급보험', desc: '막힘 사고 시 최대 10만원 지원', color: 'bg-green-500' },
              { icon: Star, title: '특별할인', desc: '모든 유상 수리 서비스 20% 할인', color: 'bg-yellow-500' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] hover:bg-white/10 transition-all group/card"
              >
                <div className={`${item.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover/card:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-lg mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 font-bold leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decorative Floating Element */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-400/20 transition-all" />
      </motion.div>
    </div>
  </section>
);

const ServiceDetail = ({ type, onBack, onBooking }: { type: ServiceType, onBack: () => void, onBooking: () => void }) => {
  const service = SERVICES[type];
  return (
    <div className="pt-16 pb-12 px-4 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="mb-6 flex items-center gap-1 font-bold text-gray-400 hover:text-black">
          <ChevronRight className="w-4 h-4 rotate-180" /> 뒤로가기
        </button>
        
          <div className="bg-yellow-50 p-8 rounded-[40px] mb-12">
            <h1 className="text-4xl font-black mb-4">{service.title}</h1>
            <p className="text-xl text-gray-600 font-medium leading-relaxed">
              {service.desc.replace('\n', ' ')}. 원인을 완벽하게 제거합니다.
            </p>
          </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
              <AlertCircle className="text-yellow-500" /> 이런 증상이 있으신가요?
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {['물이 내려가는 속도가 눈에 띄게 느려짐', '배수구 주변에서 꿀렁거리는 소리가 남', '역류 현상이 발생하여 바닥이 젖음', '심한 악취가 올라와 일상생활이 불편함'].map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-5 rounded-2xl font-bold flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" /> {item}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-6">달수만의 작업 프로세스</h2>
            <div className="space-y-6">
              {[
                { step: '01', title: '정밀 진단', desc: '배관 내시경을 통해 막힘의 정확한 위치와 원인을 파악합니다.' },
                { step: '02', title: '상세 설명', desc: '고객님께 현재 상태를 영상으로 보여드리고 작업 범위를 설명합니다.' },
                { step: '03', title: '동의 후 작업', desc: '정찰제 비용 안내 후 동의를 얻어 전문 장비로 작업을 시작합니다.' },
                { step: '04', title: '완료 확인', desc: '작업 후 다시 내시경으로 깨끗해진 배관을 직접 확인시켜 드립니다.' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="text-3xl font-black text-yellow-400 opacity-50">{item.step}</div>
                  <div>
                    <h3 className="text-lg font-black mb-1">{item.title}</h3>
                    <p className="text-gray-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-black text-white p-8 rounded-[40px] text-center">
            <h3 className="text-2xl font-black mb-4">지금 바로 해결이 필요하신가요?</h3>
            <p className="text-gray-400 mb-8 font-bold">전화 한 통이면 30분 내외로 출동합니다.</p>
            <div className="flex flex-col gap-3">
              <a href="tel:1577-1197" className="bg-yellow-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xl">
                <Phone className="w-6 h-6" /> 1577-1197
              </a>
              <button onClick={onBooking} className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-all">
                온라인 예약하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      try {
        const optimizedImages = await Promise.all(
          newFiles.map(async (file) => {
            const optimized = await optimizeImage(file, 800, 800, 0.6);
            return { file, preview: optimized };
          })
        );
        setImages(prev => [...prev, ...optimizedImages]);
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  if (submitted) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-yellow-50 p-12 rounded-[40px]">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-4">접수 완료!</h2>
          <p className="text-gray-600 font-bold mb-4">담당 엔지니어가 5분 내로 전화 상담을 도와드리겠습니다.</p>
          {images.length > 0 && (
            <p className="text-sm text-yellow-700 font-bold mb-8">
              첨부하신 사진 {images.length}장도 함께 전송되었습니다.
            </p>
          )}
          <button onClick={() => window.location.reload()} className="bg-black text-white font-bold px-8 py-4 rounded-2xl">홈으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-12 sm:pt-16 pb-12 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 md:p-12 rounded-[32px] sm:rounded-[40px] shadow-xl border border-gray-100">
        <h1 className="text-2xl sm:text-3xl font-black mb-2 break-keep">빠른 상담 신청</h1>
        <p className="text-sm sm:text-base text-gray-500 font-bold mb-8 break-keep">정보를 남겨주시면 즉시 연락드립니다.</p>
        
        <form className="space-y-5 sm:space-y-6" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
          <div>
            <label className="block text-xs sm:text-sm font-black mb-2">성함</label>
            <input type="text" required className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold focus:ring-2 focus:ring-yellow-400 transition-all text-sm sm:text-base" placeholder="홍길동" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-black mb-2">연락처</label>
            <input type="tel" required className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold focus:ring-2 focus:ring-yellow-400 transition-all text-sm sm:text-base" placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-black mb-2">서비스 유형</label>
            <select className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold focus:ring-2 focus:ring-yellow-400 transition-all text-sm sm:text-base">
              {Object.values(SERVICES).map(s => <option key={s.title}>{s.title}</option>)}
              <option>기타 문의</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-black mb-2">문의 내용 (선택)</label>
            <textarea className="w-full bg-gray-50 border-none rounded-xl sm:rounded-2xl p-3.5 sm:p-4 font-bold focus:ring-2 focus:ring-yellow-400 transition-all h-28 sm:h-32 text-sm sm:text-base" placeholder="증상을 간단히 적어주세요."></textarea>
          </div>

          {/* Image Attachment Section */}
          <div>
            <label className="block text-xs sm:text-sm font-black mb-2">현장 사진 첨부 (선택)</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100">
                  <img src={img.preview} alt="첨부 사진" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="aspect-square rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-yellow-500 mb-1" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 group-hover:text-black">사진 추가</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium break-keep">
              * 최대 6장까지 첨부 가능합니다. 현장 사진을 보내주시면 더 정확한 견적이 가능합니다.
            </p>
          </div>
          
          <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-5 sm:py-6 rounded-xl sm:rounded-[24px] text-lg sm:text-xl shadow-2xl shadow-yellow-400/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            상담 신청하기
          </button>
          
          <p className="text-center text-[10px] sm:text-xs text-gray-400 font-medium break-keep">
            개인정보는 상담 목적으로만 사용되며 안전하게 보호됩니다.
          </p>
        </form>
      </div>
    </div>
  );
};

const AppDownloadBanner = ({ 
  appMockupImage, 
  onAppMockupUpload,
  onClearStorage,
  isShared,
  id
}: { 
  appMockupImage: string, 
  onAppMockupUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onClearStorage?: () => void,
  isShared?: boolean,
  id?: string
}) => (
  <section id={id} className="py-8 px-4 bg-white overflow-hidden">
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-[#0052CC] to-[#0066CC] rounded-[40px] flex flex-col lg:flex-row items-center justify-between relative overflow-hidden group shadow-2xl shadow-blue-200 min-h-[320px]">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 p-8 md:p-12 lg:w-1/2 text-center lg:text-left">
          <div className="inline-block bg-yellow-400 text-black px-3 py-1 rounded-lg text-[10px] font-black mb-4 uppercase tracking-widest">Limited Offer</div>
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-6 break-keep leading-tight">
            어플 다운받고 <span className="text-yellow-300">2만원 할인</span> 받으세요! <br />
            <span className="text-white/80 text-xl md:text-2xl">AI로 3초만에 진단하기</span>
          </h3>
          <p className="text-blue-100 font-bold mb-8 break-keep text-sm md:text-base">
            지금 바로 앱 설치하고 직접 정밀진단을 무료로 체험해 보세요. <br className="hidden md:block" />
            복잡한 예약 없이 사진 한 장으로 즉시 진단이 가능합니다.
          </p>
          
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
            <button className="bg-white text-[#0066CC] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-1">
              <Smartphone className="w-5 h-5" /> App Store
            </button>
            <button className="bg-white text-[#0066CC] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-1">
              <Smartphone className="w-5 h-5" /> Google Play
            </button>
          </div>

          {onClearStorage && (
            <button 
              onClick={onClearStorage}
              className="text-white/40 hover:text-white text-[10px] font-bold underline underline-offset-4 transition-colors"
            >
              이미지 용량 부족 시 저장소 초기화
            </button>
          )}
        </div>

        {/* App Mockup Image Area */}
        <div className="relative lg:w-1/2 h-full flex items-end justify-center lg:justify-end pr-0 lg:pr-12 mt-8 lg:mt-0">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-20 w-full max-w-[500px] lg:max-w-none lg:w-[120%] lg:translate-x-12 group/mockup"
          >
            <div className="relative">
              <img 
                src={appMockupImage} 
                alt="App Mockup" 
                className="w-full h-auto object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.4)]"
                referrerPolicy="no-referrer"
              />
              {/* Image Upload Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/mockup:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-full border border-white/30 shadow-2xl">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={onAppMockupUpload} 
                />
              </label>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12 px-4">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-12 mb-10 sm:mb-12">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-yellow-400 p-1 rounded-lg">
              <Wrench className="w-5 h-5 text-black" />
            </div>
            <span className="text-white text-xl font-black tracking-tighter">달수배관케어</span>
          </div>
          <div className="font-bold text-xs sm:text-sm leading-relaxed mb-4 space-y-1.5 break-keep">
            <p>달수배관케어 | 대표이사: 김주찬</p>
            <p className="pt-1">사업자번호: 846-19-02240</p>
            <p>본사: 경기도 김포시 김포한강10로133번길127. 디원시티507호</p>
            <p>고객센터: <a href="tel:1577-1197" className="hover:text-white transition-colors">1577-1197</a> (24시간 긴급출동 대기)</p>
          </div>
          <div className="flex gap-4 text-[10px] sm:text-xs font-bold underline underline-offset-4">
            <button>이용약관</button>
            <button>개인정보처리방침</button>
          </div>
        </div>
        <div className="bg-white/5 p-6 sm:p-8 rounded-[28px] sm:rounded-3xl border border-white/10">
          <h4 className="text-white font-black mb-2 break-keep">전국 서비스 가능 지역</h4>
          <p className="text-xs sm:text-sm font-medium leading-relaxed break-keep">
            수도권 전 지역 포함, 부산, 대구, 광주, 대전, 울산 등 전국 주요 도시 30분 내 출동 가능
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 pt-8 text-center text-[10px] sm:text-xs font-medium">
        © 2026 DALSU PIPE CARE. ALL RIGHTS RESERVED.
      </div>
    </div>
  </footer>
);

// --- Main App ---

const AppDownloadStickyBar = () => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md text-white py-1.5 px-4 flex items-center justify-between text-xs sm:text-sm font-bold z-50 border-t border-white/5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 p-1.5 rounded-lg shadow-lg shadow-yellow-400/20">
          <Smartphone className="w-4 h-4 text-black" />
        </div>
        <span className="tracking-tight font-black whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] sm:max-w-none">
          어플 다운받고 <span className="text-yellow-400 underline underline-offset-4 decoration-2">2만원 할인</span> 받기! 
          <span className="hidden sm:inline mx-3 opacity-20">|</span> 
          <span className="text-white/70 font-bold">AI로 3초만에 진단하기</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            const downloadSection = document.getElementById('download-section');
            if (downloadSection) {
              downloadSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="group relative bg-yellow-400 text-black px-4 py-1.5 rounded-[14px] text-[10px] sm:text-xs font-black shadow-xl hover:scale-105 active:scale-95 transition-all border-[2.5px] border-zinc-800 overflow-hidden flex items-center justify-center whitespace-nowrap"
        >
          {/* Smartphone Notch Visual */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-800 rounded-b-lg z-10" />
          
          {/* Smartphone Home Bar Visual */}
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-black/20 rounded-full" />

          <span className="flex items-center gap-1.5 relative z-0 pt-0.5">
            앱 다운로드
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>
        <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const isShared = typeof window !== 'undefined' && window.location.href.includes('ais-pre-');
  const [page, setPage] = useState<Page>('home');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://picsum.photos/seed/plumbing-work-1/400/400',
    'https://picsum.photos/seed/plumbing-work-2/400/400',
    'https://picsum.photos/seed/plumbing-work-3/400/400',
    'https://picsum.photos/seed/plumbing-work-4/400/400',
    'https://picsum.photos/seed/plumbing-work-5/400/400',
    'https://picsum.photos/seed/plumbing-work-6/400/400',
    'https://picsum.photos/seed/plumbing-work-7/400/400',
    'https://picsum.photos/seed/plumbing-work-8/400/400',
  ]);

  const galleryScrollRef = React.useRef<HTMLDivElement>(null);

  const galleryScroll = (direction: 'left' | 'right') => {
    if (galleryScrollRef.current) {
      const { scrollLeft, clientWidth } = galleryScrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      galleryScrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const [heroImage, setHeroImage] = useState('https://picsum.photos/seed/professional-plumber-working/600/750');
  const [profileImage, setProfileImage] = useState('https://picsum.photos/seed/korean-man-face/80/80');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [aboutImage, setAboutImage] = useState('https://picsum.photos/seed/team/800/533');
  const [membershipImage, setMembershipImage] = useState('https://picsum.photos/seed/premium-service/800/400');
  const [fullWidthImage, setFullWidthImage] = useState('https://picsum.photos/seed/plumbing-banner/1920/600');
  const [appMockupImage, setAppMockupImage] = useState('https://picsum.photos/seed/app-mockup-dalsu/1000/800');
  const [reviewsBgImage, setReviewsBgImage] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=400&fit=crop'
  ]);
  const [strengthImages, setStrengthImages] = useState<string[]>([
    'https://picsum.photos/seed/trust-handshake/600/400',
    'https://picsum.photos/seed/emergency-siren/600/400',
    'https://picsum.photos/seed/quality-guarantee/600/400'
  ]);
  const [serviceImages, setServiceImages] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const gallery = await getImage('dalsu_gallery');
        if (gallery) setGalleryImages(JSON.parse(gallery));

        const hero = await getImage('dalsu_hero');
        if (hero) setHeroImage(hero);

        const profile = await getImage('dalsu_profile');
        if (profile) setProfileImage(profile);

        const logo = await getImage('dalsu_logo');
        if (logo) setLogoImage(logo);

        const about = await getImage('dalsu_about');
        if (about) setAboutImage(about);

        const membership = await getImage('dalsu_membership');
        if (membership) setMembershipImage(membership);

        const fullWidth = await getImage('dalsu_full_width');
        if (fullWidth) setFullWidthImage(fullWidth);

        const appMockup = await getImage('dalsu_app_mockup');
        if (appMockup) setAppMockupImage(appMockup);

        const reviewsBg = await getImage('dalsu_reviews_bg');
        if (reviewsBg) setReviewsBgImage(reviewsBg);

        const reviews = await getImage('dalsu_reviews');
        if (reviews) setReviewImages(JSON.parse(reviews));

        const strengths = await getImage('dalsu_strengths');
        if (strengths) setStrengthImages(JSON.parse(strengths));

        const services = await getImage('dalsu_service_images');
        if (services) setServiceImages(JSON.parse(services));
      } catch (err) {
        console.error("Failed to load data from IndexedDB", err);
      } finally {
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  const safeSave = async (key: string, value: string) => {
    if (!dataLoaded) return;
    try {
      await saveImage(key, value);
    } catch (e) {
      console.error(`Failed to save to IndexedDB: ${key}`, e);
      setErrorMsg('이미지 저장 중 오류가 발생했습니다.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  useEffect(() => {
    safeSave('dalsu_gallery', JSON.stringify(galleryImages));
  }, [galleryImages, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_hero', heroImage);
  }, [heroImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_profile', profileImage);
  }, [profileImage, dataLoaded]);

  useEffect(() => {
    if (logoImage) safeSave('dalsu_logo', logoImage);
  }, [logoImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_strengths', JSON.stringify(strengthImages));
  }, [strengthImages, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_service_images', JSON.stringify(serviceImages));
  }, [serviceImages, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_about', aboutImage);
  }, [aboutImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_membership', membershipImage);
  }, [membershipImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_full_width', fullWidthImage);
  }, [fullWidthImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_app_mockup', appMockupImage);
  }, [appMockupImage, dataLoaded]);

  useEffect(() => {
    if (reviewsBgImage) safeSave('dalsu_reviews_bg', reviewsBgImage);
  }, [reviewsBgImage, dataLoaded]);

  useEffect(() => {
    safeSave('dalsu_reviews', JSON.stringify(reviewImages));
  }, [reviewImages, dataLoaded]);

  const handleImageUpload = (setter: (val: string) => void, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const optimized = await optimizeImage(e.target.files[0], maxWidth, maxHeight, quality);
        setter(optimized);
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  const handleServiceImageUpload = async (type: ServiceType, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const optimized = await optimizeImage(e.target.files[0], 1200, 800, 0.85);
        setServiceImages(prev => ({
          ...prev,
          [type]: optimized
        }));
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  const handleStrengthImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const optimized = await optimizeImage(e.target.files[0], 1200, 800, 0.85);
        setStrengthImages(prev => {
          const next = [...prev];
          next[index] = optimized;
          return next;
        });
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  const handleReviewImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const optimized = await optimizeImage(e.target.files[0], 800, 600, 0.85);
        setReviewImages(prev => {
          const next = [...prev];
          next[index] = optimized;
          return next;
        });
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      try {
        const optimizedImages = await Promise.all(
          files.map(file => optimizeImage(file, 1200, 1200, 0.8))
        );
        setGalleryImages(prev => [...optimizedImages, ...prev].slice(0, 12));
      } catch (err) {
        console.error("Image optimization failed", err);
      }
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, selectedService]);

  const renderContent = () => {
    if (selectedService) {
      return (
        <ServiceDetail 
          type={selectedService} 
          onBack={() => setSelectedService(null)} 
          onBooking={() => setPage('booking')}
        />
      );
    }

    switch (page) {
      case 'home':
        return (
          <>
            <Hero 
              onBooking={() => setPage('booking')} 
              heroImage={heroImage}
              profileImage={profileImage}
              onHeroUpload={handleImageUpload(setHeroImage, 1200, 1600, 0.85)}
              onProfileUpload={handleImageUpload(setProfileImage, 400, 400, 0.9)}
              isShared={isShared}
            />
            <ServiceGrid 
              onSelect={(s) => setSelectedService(s)} 
              serviceImages={serviceImages as Record<ServiceType, string>}
              onImageUpload={handleServiceImageUpload}
              isShared={isShared}
            />
            
            {/* Strengths Section */}
            <section className="py-12 sm:py-16 px-4 bg-[#F8FAFC] relative overflow-hidden">
              {/* Background Decorative Element */}
              <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
              </div>

              <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12 sm:mb-20">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-block px-4 py-1.5 bg-blue-50 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
                  >
                    Why Dalsu Pipe Care
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4 break-keep"
                  >
                    왜 달수배관케어인가요?
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-500 font-bold text-base sm:text-lg break-keep"
                  >
                    비교할수록 정답은 달수입니다.
                  </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                  {[
                    { 
                      icon: ShieldCheck, 
                      title: '정찰제 운영', 
                      badge: '과잉시공 NO', 
                      desc: '작업 전 비용을 명확히 안내하며, 불필요한 공사를 절대 권유하지 않습니다.',
                      color: 'text-blue-600',
                      bg: 'bg-blue-50'
                    },
                    { 
                      icon: Clock, 
                      title: '24시 긴급출동', 
                      badge: '전국 어디든 즉시', 
                      desc: '밤늦게 막혀도 걱정 마세요. 전국 어디든 가장 가까운 기사가 즉시 달려갑니다.',
                      color: 'text-yellow-600',
                      bg: 'bg-yellow-50'
                    },
                    { 
                      icon: CheckCircle2, 
                      title: '무상 보증 서비스', 
                      badge: '1년 안심 보증', 
                      desc: '작업 후 동일 증상 발생 시 1년간 무상으로 재방문 서비스를 제공합니다.',
                      color: 'text-green-600',
                      bg: 'bg-green-50'
                    },
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative bg-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center text-center group hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-2"
                    >
                      {/* Background Image with Upload Capability */}
                      <img 
                        src={strengthImages[idx]} 
                        alt={item.title} 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.08] group-hover:opacity-[0.15] transition-opacity rounded-[40px]" 
                        referrerPolicy="no-referrer" 
                      />
                      {!isShared && (
                        <label className="absolute top-6 right-6 w-10 h-10 bg-black/5 hover:bg-black/10 rounded-full flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 z-20">
                          <Camera className="w-5 h-5 text-gray-400" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStrengthImageUpload(idx, e)} />
                        </label>
                      )}

                      <div className={`w-20 h-20 ${item.bg} rounded-[28px] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                        <item.icon className={`w-10 h-10 ${item.color}`} strokeWidth={2.5} />
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-4">{item.title}</h3>
                      
                      <div className="bg-[#0066CC] text-white px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm mb-6 shadow-lg shadow-blue-100 tracking-tight break-keep">
                        {item.badge}
                      </div>
                      
                      <p className="text-gray-500 font-bold leading-relaxed text-sm sm:text-base break-keep">
                        {item.desc}
                      </p>

                      {/* Decorative Corner Element */}
                      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-gray-50 rounded-br-[40px] -z-10" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            <MembershipPromo 
              onGo={() => setPage('membership')} 
              membershipImage={membershipImage}
              onImageUpload={handleImageUpload(setMembershipImage, 1600, 1000, 0.9)}
              isShared={isShared}
            />

            {/* Work Gallery Section (시공사례) */}
            <section className="py-8 sm:py-12 px-4 bg-white relative overflow-hidden">
              {/* Background Decorative Elements */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gray-50/50 -skew-x-12 transform origin-top-right pointer-events-none" />
              
              <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12 items-start">
                  {/* Left Side: Title and Controls */}
                  <div className="flex flex-col h-full justify-between py-4">
                    <div>
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6"
                      >
                        Work Gallery
                      </motion.div>
                      <h2 className="text-3xl sm:text-4xl font-black mb-4 sm:mb-6 tracking-tighter leading-tight break-keep">
                        시공<span className="text-blue-600">사례</span>
                      </h2>
                      <p className="text-gray-500 font-bold text-sm sm:text-base mb-8 sm:mb-10 leading-relaxed break-keep">
                        믿고 맡길 수 있는 완벽한 시공을 약속 드립니다.
                      </p>
                      
                      {/* Navigation Arrows */}
                      <div className="flex gap-3 mb-10">
                        <button 
                          onClick={() => galleryScroll('left')}
                          className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm group"
                        >
                          <ChevronRight className="w-6 h-6 rotate-180 text-gray-400 group-hover:text-black transition-colors" />
                        </button>
                        <button 
                          onClick={() => galleryScroll('right')}
                          className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm group"
                        >
                          <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-black transition-colors" />
                        </button>
                      </div>
                    </div>

                    {!isShared && (
                      <label className="bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs cursor-pointer hover:bg-gray-800 transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                        <Upload className="w-4 h-4" /> 사진 직접 첨부하기
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleGalleryUpload} 
                        />
                      </label>
                    )}
                  </div>

                  {/* Right Side: Marquee Slider */}
                  <div className="relative overflow-hidden -mx-4 px-4">
                    <div className="flex animate-marquee-fast gap-6 hover:[animation-play-state:paused]">
                      {[...Array(3)].flatMap(() => galleryImages).map((url, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: (idx % galleryImages.length) * 0.1 }}
                          className="min-w-[200px] sm:min-w-[280px] aspect-[4/5] rounded-[32px] overflow-hidden border border-gray-100 shadow-xl relative group"
                        >
                          <img src={url} alt={`작업 현장 ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          {!isShared && (
                            <button 
                              onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== (idx % galleryImages.length)))}
                              className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 border border-white/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <div className="absolute bottom-6 left-6 right-6 text-white opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-yellow-400">Case Study 0{(idx % galleryImages.length) + 1}</div>
                            <h4 className="font-black text-lg tracking-tight">현장 작업 완료</h4>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="py-12 sm:py-16 px-4 bg-gray-50 relative overflow-hidden group/reviews">
              {/* Background Image */}
              {reviewsBgImage && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={reviewsBgImage} 
                    alt="Reviews Background" 
                    className="w-full h-full object-cover opacity-70" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Image Upload Overlay */}
              {!isShared && (
                <label className="absolute top-8 right-8 bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-xl cursor-pointer opacity-0 group-hover/reviews:opacity-100 transition-opacity z-30">
                  <Camera className="w-5 h-5 text-gray-600" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload(setReviewsBgImage, 1920, 1080, 0.4)} 
                  />
                </label>
              )}

              {/* Decorative Background Elements */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/2 -left-20 w-96 h-96 bg-yellow-100/30 rounded-full blur-[120px] opacity-60" />
                <div className="absolute top-0 -right-20 w-80 h-80 bg-blue-50/50 rounded-full blur-[100px] opacity-40" />
              </div>

              <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
                  <div className="max-w-xl">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-4"
                    >
                      Real Stories
                    </motion.div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.2] break-keep"
                    >
                      실제 고객님들의 <br />
                      <span className="text-gray-400">생생한 후기</span>
                    </motion.h2>
                  </div>
                </div>

                <div className="relative overflow-hidden -mx-4 px-4">
                  <div className="flex animate-marquee-fast gap-6 hover:[animation-play-state:paused]">
                    {[...Array(3)].flatMap(() => [
                      { id: 0, name: '이*정 고객님', service: '싱크대막힘', text: '기름때문에 꽉 막혀서 고생했는데, 내시경으로 직접 보면서 뚫어주시니 속이 다 시원하네요. 정말 친절하십니다!', img: reviewImages[0], date: '2024.03.15' },
                      { id: 1, name: '박*훈 고객님', service: '변기막힘', text: '밤 11시에 변기가 막혀서 멘붕이었는데 20분 만에 오셔서 해결해주셨어요. 가격도 정찰제라 믿음이 갑니다.', img: reviewImages[1], date: '2024.03.12' },
                      { id: 2, name: '최*숙 고객님', service: '악취제거', text: '화장실 냄새 때문에 스트레스였는데 트랩 설치하고 나서 냄새가 싹 사라졌어요. 진작 부를 걸 그랬네요.', img: reviewImages[2], date: '2024.03.10' },
                    ]).map((review, idx) => (
                      <motion.div 
                        key={idx}
                        className="bg-white rounded-[32px] shadow-lg shadow-black/5 overflow-hidden flex flex-col group relative border border-gray-50 min-w-[280px] sm:min-w-[320px] max-w-[280px] sm:max-w-[320px]"
                      >
                        <div className="h-40 sm:h-48 overflow-hidden relative">
                          <img 
                            src={review.img} 
                            alt={review.service} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40" />
                          
                          {!isShared && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                                <Camera className="w-6 h-6 text-white" />
                              </div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleReviewImageUpload(review.id, e)} 
                              />
                            </label>
                          )}

                          <div className="absolute bottom-3 left-4">
                            <span className="text-[9px] font-black bg-yellow-400 text-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">{review.service}</span>
                          </div>
                        </div>
                        <div className="p-5 sm:p-6 flex-1 flex flex-col">
                          <div className="flex gap-1 mb-3 sm:mb-4">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-400 text-yellow-400" />)}
                          </div>
                          <p className="text-sm sm:text-base font-bold text-gray-800 mb-4 sm:mb-6 leading-snug flex-1 italic break-keep">"{review.text}"</p>
                          <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-black text-xs">{review.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Verified Customer</p>
                              </div>
                            </div>
                            <span className="text-[9px] text-gray-300 font-bold">{review.date}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <AppDownloadBanner 
              id="download-section"
              appMockupImage={appMockupImage}
              onAppMockupUpload={handleImageUpload(setAppMockupImage, 1200, 1600, 0.9)}
              onClearStorage={!isShared ? () => {
                if (window.confirm('모든 이미지를 초기화하시겠습니까? (저장 공간 확보)')) {
                  clearAllImages().then(() => {
                    localStorage.clear();
                    window.location.reload();
                  });
                }
              } : undefined}
              isShared={isShared}
            />

            {/* Full Width Image Section */}
            <section className="w-full h-[60vh] sm:h-[80vh] md:h-[100vh] relative group overflow-hidden">
              <div className="w-full h-full bg-gray-100 relative">
                <img 
                  src={fullWidthImage} 
                  alt="Full Width Banner" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Image Upload Overlay */}
                {!isShared && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                    <div className="bg-white/20 backdrop-blur-md p-6 rounded-full border border-white/30 shadow-2xl">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload(setFullWidthImage, 1920, 1080, 0.9)} 
                    />
                  </label>
                )}
              </div>
            </section>
          </>
        );
      case 'membership':
        return (
          <div className="pt-12 sm:pt-16 pb-12 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12 sm:mb-16">
                <span className="bg-black text-yellow-400 px-4 py-1 rounded-full text-[10px] sm:text-xs font-black mb-4 inline-block">PREMIUM CARE</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 break-keep">배관도 관리가 필요합니다</h1>
                <p className="text-lg sm:text-xl text-gray-500 font-bold break-keep">월 29,900원으로 누리는 1% 배관 케어 서비스</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-12 sm:mb-16">
                {[
                  { title: '연 4회 배관 건강검진', desc: '내시경 장비로 배관 속을 정기 점검하여 큰 사고를 미리 예방합니다.' },
                  { title: '막힘 응급보험 지원', desc: '갑작스러운 막힘 발생 시 작업비 최대 10만원을 연 1회 지원해드립니다.' },
                  { title: '작업비 상시 10% 할인', desc: '멤버십 회원님은 모든 유상 서비스 이용 시 10% 할인이 자동 적용됩니다.' },
                  { title: 'AI 자가진단 리포트', desc: '앱을 통해 우리 집 배관 상태를 데이터로 관리하고 진단받을 수 있습니다.' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] flex items-start gap-4 sm:gap-6">
                    <div className="bg-white w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <CheckCircle2 className="text-yellow-500 w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black mb-2 break-keep">{item.title}</h3>
                      <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed break-keep">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-400 p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] text-center mb-12 shadow-2xl shadow-yellow-400/20">
                <p className="font-black text-base sm:text-lg mb-2">출장 한 번이면 1년치 본전!</p>
                <h2 className="text-3xl sm:text-4xl font-black mb-6 sm:mb-8">월 29,900원</h2>
                <button className="w-full bg-black text-white font-black py-5 sm:py-6 rounded-2xl sm:rounded-[28px] text-xl sm:text-2xl shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all">
                  지금 바로 가입하기
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-gray-400 font-bold mb-4">전용 앱에서 더 편리하게 관리하세요</p>
                <div className="flex justify-center gap-4">
                  <div className="bg-gray-100 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> App Store
                  </div>
                  <div className="bg-gray-100 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Google Play
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="pt-12 sm:pt-16 pb-12 px-4">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-black mb-6 sm:mb-8 break-keep">배관은 집의 혈관입니다</h1>
              <div className="aspect-video bg-gray-100 rounded-[32px] sm:rounded-[40px] mb-10 sm:mb-12 overflow-hidden relative group">
                <img src={aboutImage} alt="우리 팀" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {/* Image Upload Overlay */}
                {!isShared && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setAboutImage, 1200, 800, 0.9)} />
                  </label>
                )}
              </div>
              <div className="prose prose-sm sm:prose-lg font-medium text-gray-600 leading-relaxed space-y-6 sm:space-y-8 break-keep">
                <p>
                  우리는 스스로를 '배관 전문의'라고 부릅니다. 단순히 막힌 곳을 뚫는 기술자를 넘어, 
                  집이라는 유기체가 건강하게 순환할 수 있도록 진단하고 처방하는 전문가 집단입니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 not-prose">
                  {[
                    { title: '정직한 진단', desc: '과잉 시공 없이 꼭 필요한 작업만 제안합니다.' },
                    { title: '투명한 가격', desc: '정찰제 운영으로 바가지 요금 걱정을 없앴습니다.' },
                    { title: '사회적 가치', desc: '취약계층 배관 점검 지원 등 사회적 책임을 다합니다.' },
                    { title: '기술의 혁신', desc: '첨단 장비와 AI 데이터를 활용해 정확도를 높입니다.' },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100">
                      <h4 className="text-black font-black mb-2 break-keep">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed break-keep">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p>
                  달수배관케어는 고객님의 신뢰를 가장 큰 자산으로 여깁니다. 
                  한 번의 인연이 평생의 안심이 될 수 있도록 오늘도 정직하게 현장으로 달려갑니다.
                </p>
              </div>
            </div>
          </div>
        );
      case 'booking':
        return <BookingForm />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white font-sans text-black selection:bg-yellow-200">
        <Navbar 
          setPage={(p) => { setPage(p); setSelectedService(null); }} 
          logoImage={logoImage}
          onLogoUpload={handleImageUpload(setLogoImage, 1200, 600, 0.95)}
          isShared={isShared}
        />
        
        <div className="pt-16">
          <AppDownloadStickyBar />
          <main>
            {renderContent()}
          </main>
        </div>

        <Footer />

        {/* Error Toast */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3"
            >
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-sm font-bold leading-tight">{errorMsg}</p>
              <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-24 left-0 right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:right-8 md:left-auto z-50 flex md:flex-col justify-center gap-6 sm:gap-8 px-6 pointer-events-none">
          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <motion.a 
              href="tel:1577-1197"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(34,197,94,0.4)] border-4 border-white relative"
            >
              <Phone className="w-7 h-7 fill-white" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg">24h</span>
            </motion.a>
            <span className="text-[11px] font-black text-gray-700 drop-shadow-sm">전화상담</span>
          </div>
          
          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <motion.a 
              href="http://pf.kakao.com/_EdXzX"
              target="_blank"
              rel="noreferrer"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-[#FEE500] text-black rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(254,229,0,0.5)] border-4 border-white"
            >
              <div className="w-7 h-7">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.346 6.09-.19.67-.686 2.427-.786 2.81-.125.486.173.48.364.353.15-.1.2.39 2.407-1.49l.647-.44c.33.045.67.07 1.022.07 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z"/></svg>
              </div>
            </motion.a>
            <span className="text-[11px] font-black text-gray-700 drop-shadow-sm">카톡문의</span>
          </div>

          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <motion.button 
              onClick={() => {
                const downloadSection = document.getElementById('download-section');
                if (downloadSection) {
                  downloadSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(250,204,21,0.4)] border-4 border-white relative group"
            >
              <Smartphone className="w-7 h-7 drop-shadow-md" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-[-4px] rounded-full border-2 border-yellow-400/50"
              />
            </motion.button>
            <span className="text-[11px] font-black text-yellow-600 drop-shadow-sm">앱다운로드</span>
          </div>
        </div>
    </div>
    </ErrorBoundary>
  );
}
