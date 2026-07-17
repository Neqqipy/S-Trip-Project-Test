import React, { useState, useEffect, useRef } from 'react';
// 1. Import Router
import { HashRouter as Router, Routes, Route, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedDestinations from './components/FeaturedDestinations';
import AiSchedule from './components/AiSchedule';
import ChatAI from './components/ChatAI';
import MapBubble from './components/MapBubble';
import Footer from './components/Footer';
import ProfilePage from './components/Profilepage';
import SkeletonLoader from './components/SkeletonLoader';
import AboutPage from './components/AboutPage';
import Toast from './components/Toast';
import { fetchTripPlan, saveSearchHistory } from './services/api';
import ResetPassword from './components/ResetPassword';
import SplashScreen from './components/SplashScreen';
import { enrichPlacesWithCoords } from './services/geocodeUtils';
import { BASE_URL } from './config';
import ExploreVietnam from './components/ExploreVietnam/ExploreVietnam';
import './App.css';

// ----------------------------------------------------------------
// ✉️ Trang xử lý xác nhận email (khi user bấm link trong mail)
// Dùng useSearchParams để đọc ?token= đúng cách với HashRouter
// ----------------------------------------------------------------
const VerifyEmailPage = ({ isDark, onUserChange }) => {
  const [searchParams]                = useSearchParams();
  const [status,  setStatus]          = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage]         = useState('');
  const [expired, setExpired]         = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendDone,  setResendDone]  = useState(false);
  const [resendErr,   setResendErr]   = useState('');
  const [resending,   setResending]   = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy token xác nhận. Kiểm tra lại đường link trong email.');
      return;
    }

    fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (data.user) onUserChange(data.user);
          setStatus('success');
          setMessage(data.already_verified
            ? 'Email của bạn đã được xác nhận trước đó. Bạn có thể đăng nhập bình thường.'
            : 'Email đã xác nhận thành công! Bạn đã được đăng nhập tự động.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Xác nhận thất bại.');
          if (data.expired) setExpired(true);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Lỗi kết nối đến máy chủ. Vui lòng thử lại.');
      });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async () => {
    if (!resendEmail || !resendEmail.includes('@')) {
      setResendErr('Vui lòng nhập email hợp lệ');
      return;
    }
    setResending(true); setResendErr('');
    try {
      const r    = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await r.json();
      if (data.success) setResendDone(true);
      else setResendErr(data.error || 'Có lỗi xảy ra');
    } catch { setResendErr('Lỗi kết nối'); }
    finally  { setResending(false); }
  };

  const bg   = isDark ? '#1a1a1a' : '#f9fafb';
  const card = isDark ? '#0f172a' : 'white';
  const text = isDark ? '#e8e8e8' : '#111827';
  const sub  = isDark ? '#94a3b8' : '#6b7280';
  const inp  = { width: '100%', padding: '13px 16px', borderRadius: 14, border: isDark ? '2px solid #1e293b' : '2px solid #e5e7eb', fontSize: 15, outline: 'none', boxSizing: 'border-box', backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: text, marginBottom: 10 };

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: card, borderRadius: 28, padding: '44px 48px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>

        {/* Logo nhỏ */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>S-Trip</span>
        </div>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: text, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Đang xác nhận email...</h2>
            <p style={{ color: sub, fontSize: 14 }}>Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#10b981', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Xác nhận thành công!</h2>
            <p style={{ color: sub, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>{message}</p>
            <a href="/" style={{ background: '#10b981', color: 'white', padding: '13px 36px', borderRadius: 999, textDecoration: 'none', fontWeight: 800, fontSize: 15, display: 'inline-block' }}>
              Về trang chủ →
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#ef4444', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Xác nhận thất bại</h2>
            <p style={{ color: sub, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{message}</p>

            {/* Nếu hết hạn: cho nhập email để gửi lại ngay tại đây */}
            {expired && (
              <div style={{ textAlign: 'left', marginBottom: 20 }}>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Gửi lại email xác nhận:</p>
                {resendDone ? (
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f0fdf4', border: '2px solid #86efac', color: '#15803d', fontSize: 14, fontWeight: 600 }}>
                    ✅ Đã gửi! Kiểm tra hộp thư của bạn.
                  </div>
                ) : (
                  <>
                    <input type="email" placeholder="Nhập email đăng ký" style={inp}
                      value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleResend()}
                    />
                    {resendErr && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 8px' }}>⚠️ {resendErr}</p>}
                    <button onClick={handleResend} disabled={resending}
                      style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: '#10b981', color: 'white', fontWeight: 800, fontSize: 15, cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.7 : 1 }}>
                      {resending ? '⏳ Đang gửi...' : '🔄 Gửi lại email xác nhận'}
                    </button>
                  </>
                )}
              </div>
            )}

            <a href="/" style={{ background: isDark ? '#1e293b' : '#f1f5f9', color: text, padding: '12px 32px', borderRadius: 999, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-block', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
              ← Về trang chủ
            </a>
          </>
        )}
      </div>
    </div>
  );
};

// Component bọc logic trang chủ để giữ nguyên tính năng Scroll Spy
const HomePage = ({ 
  handleSearch, isLoading, searchData, editedPlans, setEditedPlans, 
  setActiveSection, setToast, scrollToSection, isDark, user
}) => {
  return (
    <>
      <div id="hero-section" style={{ scrollMarginTop: '110px' }}>
        <Hero onSearch={handleSearch} isDark={isDark} />
      </div>
      
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div id="itinerary-section" style={{ scrollMarginTop: '110px', position: 'relative', zIndex: 10 }}>
          {isLoading && <SkeletonLoader isDark={isDark} />}
          {searchData && !isLoading && (
            <AiSchedule 
              data={searchData} 
              onPlanChange={setEditedPlans}
              isDark={isDark}
              onSave={async () => {
                if (!user) {
                  if (window.confirm("Hãy đăng nhập để thực hiện hành động này. Bạn có muốn đăng nhập ngay?")) {
                    window.dispatchEvent(new Event('openAuthModal'));
                  }
                  throw new Error("Not authenticated");
                }
                try {
                  const res = await fetch(`${BASE_URL}/api/schedules/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      title: `Khám phá ${searchData.location}`,
                      location: searchData.location,
                      days: parseInt(String(searchData.days || '3').split(' ')[0]),
                      data_json: { searchData, editedPlans }
                    })
                  });
                  const data = await res.json();
                  
                  if (data.success) {
                    setToast({ show: true, message: 'Đã lưu thành công vào Hồ sơ của bạn!', type: 'success' });
                  } else {
                    setToast({ show: true, message: data.error || 'Lỗi khi lưu!', type: 'error' });
                  }
                } catch (err) {
                  setToast({ show: true, message: 'Lỗi kết nối đến máy chủ', type: 'error' });
                }
              }}
            />
          )}
        </div>

        <div id="featured-section" style={{ scrollMarginTop: '110px', position: 'relative', zIndex: 1 }}>
          <FeaturedDestinations onNavigate={scrollToSection} isDark={isDark} />
        </div>
      </div>
    </>
  );
};

const InitialRedirect = ({ children }) => {
  const hasVisited = sessionStorage.getItem('sTripHasVisited');
  if (!hasVisited) {
    sessionStorage.setItem('sTripHasVisited', 'true');
    return <Navigate to="/about" replace />;
  }
  return children;
};

function AppContent({ isDarkProp, setIsDarkProp, userProp, setUserProp }) {
  const [searchData, setSearchData] = useState(null);
  const [editedPlans, setEditedPlans] = useState(null);
  const [activeSection, setActiveSection] = useState('home'); 
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // isDark and user are now lifted to App — use props with local aliases for readability
  const isDark  = isDarkProp;
  const setIsDark = setIsDarkProp;
  const user    = userProp;
  const setUser = setUserProp;


  useEffect(() => {
    localStorage.setItem('sTripTheme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Flag để tạm dừng scroll spy khi user vừa click nav
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const activeSectionRef = useRef(activeSection);
  const searchDataRef = useRef(searchData);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);
  useEffect(() => { searchDataRef.current = searchData; }, [searchData]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Kiểm tra session khi app load
  useEffect(() => {
    // Google OAuth redirect về /#/?auth_success=1 (HashRouter format)
    const rawHash    = window.location.hash || '';
    const hashSearch = rawHash.includes('?') ? rawHash.slice(rawHash.indexOf('?')) : '';
    const rawSearch  = window.location.search || '';
    const params     = new URLSearchParams(hashSearch || rawSearch);

    if (params.get('auth_success') === '1') {
      window.history.replaceState({}, '', '/#/');
      // User data được Flask nhúng thẳng vào URL — không cần fetch lại
      // => hoàn toàn không phụ thuộc cookie cross-port
      try {
        const userRaw = params.get('user');
        if (userRaw) {
          const userData = JSON.parse(decodeURIComponent(userRaw));
          setUser(userData);
          return;
        }
      } catch (_) {}
      // Fallback: nếu không có user param thì fetch qua proxy như bình thường
      fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => { if (d.success && d.user) setUser(d.user); })
        .catch(() => {});
      return;
    }

    if (params.get('auth_error')) {
      window.history.replaceState({}, '', '/#/');
      return;
    }

    // Load bình thường — fetch qua proxy OK vì đây không phải cross-origin redirect
    fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success && d.user) setUser(d.user); })
      .catch(() => {});
  }, [setUser]);

  const location = useLocation();

  // --- 1. TỰ ĐỘNG THEO DÕI VỊ TRÍ CUỘN ---
  useEffect(() => {
    let scrollStopTimer;

    const handleScroll = () => {
      if (isScrollingRef.current) {
        clearTimeout(scrollStopTimer);
        scrollStopTimer = setTimeout(() => { isScrollingRef.current = false; }, 150);
        return;
      }

      if (location.pathname !== '/' || activeSectionRef.current === 'dashboard') return;

      const hero = document.getElementById('hero-section');
      const itinerary = document.getElementById('itinerary-section');
      const featured = document.getElementById('featured-section');

      const isPastNavbar = (el) => el && el.getBoundingClientRect().top <= 150;
      const isAtBottom = window.innerHeight + Math.round(window.scrollY) >= document.documentElement.scrollHeight - 50;

      if (isAtBottom && featured) {
        setActiveSection('featured');
      }
      else if (isPastNavbar(featured)) {
        setActiveSection('featured');
      } 
      else if (isPastNavbar(itinerary) && (searchDataRef.current || isLoadingRef.current)) {
        setActiveSection('schedule');
      } 
      else if (hero) {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollStopTimer);
    };
  }, [location.pathname]);

  // --- 2. HÀM ĐIỀU HƯỚNG MƯỢT MÀ ---
  const scrollToSection = (id) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    
    isScrollingRef.current = true;

    if (id === 'dashboard') {
      setActiveSection('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = false; }, 800);
      return;
    }

    if (id === 'hero-section') setActiveSection('home');
    else if (id === 'itinerary-section') setActiveSection('schedule');
    else if (id === 'featured-section') setActiveSection('featured');

    setTimeout(() => {
      if (id === 'hero-section') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const element = document.getElementById(id);
        if (element) {
           element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      scrollTimeoutRef.current = setTimeout(() => { 
        isScrollingRef.current = false; 
      }, 800);
    }, 50);
  };

  // --- 3. XỬ LÝ TÌM KIẾM ---
  const handleSearch = async (formData) => {
    setIsLoading(true);
    setSearchData(null);
    setEditedPlans(null);
    setActiveSection('schedule');

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    isScrollingRef.current = true;
    
    setTimeout(() => {
      const el = document.getElementById('itinerary-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = false; }, 800);
    }, 100);

    const result = await fetchTripPlan(
      formData.location, formData.budget, formData.days,
      formData.origin, formData.passengers, formData.departureDate
    );

    if (result) {
      const fullPlan = {
        ...formData,
        departure_date: formData.departureDate || '',  // snake_case cho AiSchedule
        realHotels: result.hotels || [],
        realFlights: result.flights || [],
        realTours: result.tours || [],
        realFoods: result.foods || [],
        transport: result.transport || null,
        itinerary: result.itinerary || [],
      };
      setSearchData(fullPlan);
      localStorage.setItem('s_trip_last_search', JSON.stringify(fullPlan));
      setToast({ show: true, message: 'Đã AI hóa lịch trình thực tế cho bạn!', type: 'success' });

      // 💾 Lưu lịch sử tìm kiếm vào DB (chạy nền, không block UI)
      saveSearchHistory({
        location:       formData.location     || '',
        origin:         formData.origin       || '',
        budget:         parseInt(String(formData.budget || '0').replace(/\D/g, '')) || 0,
        days:           parseInt(String(formData.days || '3').split(' ')[0]),
        passengers:     parseInt(formData.passengers  || 1),
        departure_date: formData.departureDate || '',
      }).catch(() => {}); // silent fail nếu chưa đăng nhập

      enrichPlacesWithCoords(formData.location, result.tours || [], result.foods || [])
        .then(({ tours: enrichedTours, foods: enrichedFoods }) => {
          setSearchData(prev => prev ? { ...prev, realTours: enrichedTours, realFoods: enrichedFoods } : prev);
        }).catch(() => {});
    } else {
      setToast({ show: true, message: 'Lỗi kết nối Backend!', type: 'error' });
    }
    setIsLoading(false);
  };

  const hasItinerary = !!searchData || isLoading;

  return (
    <div className={isDark ? 'theme-dark' : 'theme-light'} style={{ display: 'flex', flexDirection: 'column', backgroundColor: isDark ? '#050914' : '#f9fafb', color: isDark ? '#f8fafc' : '#111827', minHeight: '100vh', margin: 0, padding: 0, transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Navbar 
        activeSection={activeSection} 
        onNavigate={scrollToSection} 
        onRefresh={() => {
          setSearchData(null);
          setEditedPlans(null);
          setActiveSection('home');
          localStorage.removeItem('s_trip_last_search');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasItinerary={hasItinerary}
        isDark={isDark}
        onToggleTheme={() => setIsDark(prev => !prev)}
        // ✅ [THÊM MỚI] Truyền user và callback cập nhật xuống Navbar
        user={user}
        onUserChange={setUser}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}> 
        <Routes>
          <Route path="/" element={
            <InitialRedirect>
              {activeSection !== 'dashboard' ? (
              <HomePage 
                handleSearch={handleSearch} isLoading={isLoading} 
                searchData={searchData} editedPlans={editedPlans} 
                setEditedPlans={setEditedPlans} setActiveSection={setActiveSection}
                setToast={setToast} scrollToSection={scrollToSection}
                isDark={isDark} user={user}
              />
            ) : (
              <div style={{ paddingTop: '0px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* ✅ [THÊM MỚI] Truyền onUserChange để ProfilePage cập nhật avatar lên Navbar */}
                <ProfilePage
                  onBack={() => setActiveSection('home')}
                  isDark={isDark}
                  user={user}
                  onUserChange={setUser}
                  onSearch={handleSearch}
                  onLoadSchedule={(dataJson) => {
                    if (!dataJson) { setActiveSection('home'); return; }
                    setSearchData(dataJson.searchData);
                    setEditedPlans(dataJson.editedPlans);
                    setActiveSection('home');
                    setTimeout(() => {
                      const el = document.getElementById('itinerary-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                />
              </div>
            )}
            </InitialRedirect>
          } />

          <Route path="/about" element={
            <AboutPage isDark={isDark} onNavigate={scrollToSection} setActiveSection={setActiveSection} />
          } />

          <Route path="/reset-password" element={<ResetPassword isDark={isDark} />} />

          <Route path="/explore" element={
            <div style={{ paddingTop: '100px', height: '100vh' }}>
              <ExploreVietnam />
            </div>
          } />

          <Route path="/destinations" element={
            <div style={{ paddingTop: '100px' }}>
              <FeaturedDestinations onNavigate={scrollToSection} isDark={isDark} />
            </div>
          } />
        </Routes>

        {searchData && (
          <MapBubble targetOffset={800} data={searchData} editedPlans={editedPlans} isDark={isDark} />
        )}
        <ChatAI tripData={searchData} isDark={isDark}/>
      </div>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} isDark={isDark} />
      )}
      <Footer onNavigate={scrollToSection} noMarginTop={location.pathname === '/about' || activeSection === 'dashboard'} />
    </div>
  );
}

function App() {
  // isDark cần đọc sớm để VerifyEmailPage cũng có theme đúng
  const [isDark, setIsDark] = useState(() => localStorage.getItem('sTripTheme') === 'dark');
  const [user,   setUser]   = useState(null);

  // ── SPLASH SCREEN: chỉ hiện 1 lần mỗi phiên (sessionStorage) ──
  const [showSplash, setShowSplash] = useState(() => {
    // Nếu đã xem trong phiên này → không hiện lại
    if (sessionStorage.getItem('s_trip_splash_shown')) return false;
    return true;
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem('s_trip_splash_shown', '1');
    setShowSplash(false);
  };

  return (
    <>
      {/* Splash Screen — lớp phủ toàn màn hình, chỉ hiện lần đầu trong phiên */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      <Router>
        <Routes>
          {/* Route xác nhận email: render độc lập, không có Navbar/Footer/widgets */}
          <Route path="/verify-email" element={<VerifyEmailPage isDark={isDark} onUserChange={setUser} />} />
          {/* Tất cả route còn lại: layout đầy đủ */}
          <Route path="*" element={<AppContent isDarkProp={isDark} setIsDarkProp={setIsDark} userProp={user} setUserProp={setUser} />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;