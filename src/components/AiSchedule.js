import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHotel, faUtensils, faMapLocationDot,
  faPenToSquare, faStar, faXmark, faLocationArrow, faPlane,
  faSun, faCloudSun, faMoon, faMap, faImages, faComments, faSpinner,
  faUsers, faBed, faHome, faUserGroup,
  faBookmark as faBookmarkSolid,
  faHeart as faHeartSolid,
  faMugHot, faChevronLeft, faChevronRight,
  faArrowUp, faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { 
  faCalendar as faRegularCalendar,
  faBookmark as faBookmarkRegular,
  faHeart as faHeartRegular,
  faClock
 } from '@fortawesome/free-regular-svg-icons';
import { fetchReviews, fetchImages, fetchWeather, fetchAutocomplete, fetchPlaceDetails } from '../services/api';
import { BASE_URL } from '../config';

// ═════════════════════════════════════════════════════════════
// 🗂️ GLOBAL STATE CACHE — favorites & saved-places
//
// Fetch toàn bộ danh sách 1 lần khi app load, lưu vào Set.
// Mỗi hook tra cứu Set local → instant, không tốn network.
// Toggle → cập nhật Set ngay + notify tất cả card cùng tên.
// Search lại / render lại → state vẫn giữ (Set là module-level).
// ═════════════════════════════════════════════════════════════

const _favCache = {
  set: new Set(), ready: false, fetching: false, listeners: [],
};
const _spCache = {
  set: new Set(), ready: false, fetching: false, listeners: [],
};

const _cacheKey = (name, location) => `${name}|||${location}`;
const _notify   = (cache) => cache.listeners.forEach(fn => fn());

const _ensureLoaded = (cache, apiPath, dataKey) => {
  if (cache.ready || cache.fetching) return;
  cache.fetching = true;
  fetch(`${BASE_URL}${apiPath}`, { credentials: 'include' })
    .then(r => r.json())
    .then(d => {
      const items = d[dataKey] || [];
      cache.set.clear();
      items.forEach(item => {
        if (item.name) cache.set.add(_cacheKey(item.name, item.location || ''));
      });
      cache.ready    = true;
      cache.fetching = false;
      _notify(cache);
    })
    .catch(() => { cache.fetching = false; });
};

const _useCacheEntry = (cache, apiPath, dataKey, name, location) => {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    cache.listeners.push(fn);
    _ensureLoaded(cache, apiPath, dataKey);
    return () => { cache.listeners = cache.listeners.filter(f => f !== fn); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return cache.ready ? cache.set.has(_cacheKey(name, location)) : false;
};

// ─────────────────────────────────────────────────────────────
// ❤️ useFavorite — toggle YÊU THÍCH với /api/favorites
// ─────────────────────────────────────────────────────────────
const useFavorite = ({ name, location = '', rating = '', thumbnail = '', type = 'default' }) => {
  const inCache = _useCacheEntry(_favCache, '/api/favorites', 'favorites', name, location);
  const [loading, setLoading] = useState(false);

  const saved = inCache;

  const toggle = async (e) => {
    if (e) e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const key = _cacheKey(name, location);
    if (!saved) _favCache.set.add(key); else _favCache.set.delete(key);
    _notify(_favCache);
    try {
      if (!saved) {
        const res = await fetch(`${BASE_URL}/api/favorites`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name, location, rating: String(rating), thumbnail, type }),
        });
        const d = await res.json();
        if (!d.success) {
          _favCache.set.delete(key);
          _notify(_favCache);
          if (res.status === 401 || (d.error && d.error.toLowerCase().includes('đăng nhập'))) {
            if (window.confirm("Hãy đăng nhập để thực hiện hành động này. Bạn có muốn đăng nhập ngay?")) {
              window.dispatchEvent(new Event('openAuthModal'));
            }
          }
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/favorites/remove-by-name`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name, location }),
        });
        const d = await res.json();
        if (!d.success) {
          _favCache.set.add(key);
          _notify(_favCache);
        }
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  return { saved, loading, toggle };
};

// ─────────────────────────────────────────────────────────────
// 🔖 useSavedPlace — toggle LƯU ĐỊA ĐIỂM với /api/saved-places
// ─────────────────────────────────────────────────────────────
const useSavedPlace = ({ name, location = '', rating = '', thumbnail = '', type = 'default' }) => {
  const inCache = _useCacheEntry(_spCache, '/api/saved-places', 'savedPlaces', name, location);
  const [loading, setLoading] = useState(false);

  const saved = inCache;

  const toggle = async (e) => {
    if (e) e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const key = _cacheKey(name, location);
    if (!saved) _spCache.set.add(key); else _spCache.set.delete(key);
    _notify(_spCache);
    try {
      if (!saved) {
        const res = await fetch(`${BASE_URL}/api/saved-places`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name, location, rating: String(rating), thumbnail, type }),
        });
        const d = await res.json();
        if (!d.success) {
          _spCache.set.delete(key);
          _notify(_spCache);
          if (res.status === 401 || (d.error && d.error.toLowerCase().includes('đăng nhập'))) {
            if (window.confirm("Hãy đăng nhập để thực hiện hành động này. Bạn có muốn đăng nhập ngay?")) {
              window.dispatchEvent(new Event('openAuthModal'));
            }
          }
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/saved-places/remove-by-name`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name, location }),
        });
        const d = await res.json();
        if (!d.success) {
          _spCache.set.add(key);
          _notify(_spCache);
        }
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  return { saved, loading, toggle };
};

// 🖼️ Proxy ảnh Google qua backend để tránh bị chặn hotlink
const GOOGLE_IMG_DOMAINS = ['googleusercontent.com', 'ggpht.com', 'googleapis.com', 'googleapi'];
const proxyImage = (url) => {
  if (!url) return null;
  if (url.includes('placehold.co') || url.includes('placeholder')) return url;
  
  let rawUrl = url;
  let isProxied = false;
  if (url.includes('/api/proxy-image')) {
    const match = url.match(/[?&]url=([^&]+)/);
    if (match) {
      rawUrl = decodeURIComponent(match[1]);
      isProxied = true;
    } else {
      return url;
    }
  }

  let optimizedUrl = rawUrl;
  
  if (GOOGLE_IMG_DOMAINS.some(d => rawUrl.includes(d))) {
    // 🟢 Ép tham số size của Google Maps thành kích thước lớn w600-h450 chuẩn nét
    if (optimizedUrl.includes('=')) {
      optimizedUrl = optimizedUrl.replace(/=.*$/, '=w600-h450-k-no');
    } else {
      optimizedUrl = `${optimizedUrl}=w600-h450-k-no`;
    }
    return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(optimizedUrl)}`;
  }

  // 🟢 Nâng cấp ảnh Tripadvisor từ photo-s (small) hoặc photo-m lên photo-w (wide/high-res)
  if (rawUrl.includes('tripadvisor.com') && rawUrl.includes('/media/photo-')) {
    optimizedUrl = optimizedUrl.replace(/\/media\/photo-[a-z]\//, '/media/photo-w/');
    return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(optimizedUrl)}`;
  }

  return isProxied ? url : optimizedUrl;
};

// 📦 Mock data dự phòng
const mockRepo = {
  'Khách sạn': [
    { name: "Colline Hotel", rating: "4.8", price: "1.200.000đ/đêm", desc: "Khách sạn 4 sao hiện đại ngay trung tâm." },
    { name: "Terracotta Resort", rating: "4.7", price: "1.500.000đ/đêm", desc: "Không gian xanh mát bên bờ hồ." }
  ],
  'Điểm tham quan': [
    { name: "Địa điểm tham quan 1", rating: "4.8", price: "150.000đ", desc: "Địa điểm nổi tiếng tại điểm đến." },
    { name: "Địa điểm tham quan 2", rating: "4.5", price: "200.000đ", desc: "Trải nghiệm độc đáo không thể bỏ qua." },
    { name: "Địa điểm tham quan 3", rating: "4.7", price: "170.000đ", desc: "Khám phá vẻ đẹp thiên nhiên." }
  ],
  'Địa điểm ăn uống': [
    { name: "Nhà hàng địa phương 1", rating: "4.6", price: "250.000đ", desc: "Đặc sản địa phương đậm đà hương vị." },
    { name: "Quán ăn ngon 2", rating: "4.7", price: "80.000đ", desc: "Món ăn truyền thống giá bình dân." },
    { name: "Quán ăn ngon 3", rating: "4.8", price: "120.000đ", desc: "Ẩm thực đặc trưng vùng miền." }
  ]
};

const normalizeActivity = (item, defaultType = null) => {
  let p = item.price;
  if (!p || p === "Giá tùy chọn" || p === "Giá tuỳ chọn") {
    p = "✨ Đang ước tính...";
  } else if (typeof p === 'number') {
    p = p === 0 ? 'Miễn phí' : p.toLocaleString('vi-VN') + 'đ/người';
  } else if (typeof p === 'string') {
    let lower = p.toLowerCase().trim();
    if (lower === '0' || lower === '0đ' || lower === 'miễn phí') {
      p = 'Miễn phí';
    } else if (p !== '✨ Đang ước tính...') {
      if (!lower.includes('/người')) {
        p = lower.includes('đ') || lower.includes('vnd') ? p + '/người' : p + 'đ/người';
      }
    }
  }

  return {
    name: item.name,
    rating: item.rating || "4.5",
    price: p,
    desc: item.desc || "",
    thumbnail: item.thumbnail || null,
    lat: item.lat || item.latitude || null,
    lng: item.lng || item.longitude || null,
    place_id: item.place_id || "",
  };
};

// 💾 Cache toàn cục — tránh gọi API lại khi đã fetch
const panelCache = {};

// ─────────────────────────────────────────────────────────────
// 🧋 DRINKS PANEL — drawer bên trái lịch trình
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// 🔀 usePanelResize — drag cạnh phải để thay đổi độ rộng panel
// ─────────────────────────────────────────────────────────────
const usePanelResize = (minPct = 20, maxPct = 50, defaultPct = 30) => {
  const [widthPct, setWidthPct] = useState(defaultPct);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startPct = useRef(defaultPct);

  const onMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current   = e.clientX;
    startPct.current = widthPct;
    document.body.style.cursor     = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx     = e.clientX - startX.current;
      const vw     = window.innerWidth;
      const newPct = Math.min(maxPct, Math.max(minPct, startPct.current + (dx / vw) * 100));
      setWidthPct(newPct);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [minPct, maxPct]);

  return { widthPct, onMouseDown };
};

const DrinksPanel = ({ location, isOpen, onClose, isDark }) => {
  const cacheKey = `drinks:${location}`;
  const [drinks,  setDrinks]  = useState(panelCache[cacheKey] || []);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [fetched, setFetched] = useState(!!(panelCache[cacheKey]?.length > 0));
  const { widthPct: dpWidth, onMouseDown: dpDragStart } = usePanelResize(30, 40, 35);

  // Fetch khi mở lần đầu
  useEffect(() => {
    if (!isOpen || fetched) return;
    setLoading(true); setError('');
    fetch(`${BASE_URL}/api/activities?location=${encodeURIComponent(location)}&type=${encodeURIComponent('Quán cà phê đồ uống')}`)
      .then(r => r.json())
      .then(d => {
        const results = d.results || [];
        if (results.length > 0) panelCache[cacheKey] = results;
        setDrinks(results);
        setFetched(true);
      })
      .catch(() => setError('Không thể tải dữ liệu đồ uống.'))
      .finally(() => setLoading(false));
  }, [isOpen, location, fetched, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock scroll khi mở
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
    };
  }, [isOpen]);

  // Đóng bằng ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes dpFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes dpSlideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes dpSlideOut{ from{transform:translateX(0)} to{transform:translateX(-100%)} }
        .dp-overlay { animation: dpFadeIn 0.2s ease forwards; }
        .dp-panel   { animation: ${isOpen ? 'dpSlideIn' : 'dpSlideOut'} 0.3s cubic-bezier(.22,1,.36,1) forwards; }
        .dp-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.10); transform: translateY(-3px); }
        .dp-card { transition: all 0.25s ease; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Overlay mờ */}
      <div
        className="dp-overlay"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        className="dp-panel"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: `${dpWidth}vw`,
          minWidth: '260px',
          backgroundColor: isDark ? '#111827' : 'white', // ✅ Đổi màu
          zIndex: 100000,
          display: 'flex', flexDirection: 'column',
          boxShadow: '8px 0 40px rgba(0,0,0,0.18)',
          overflow: 'hidden'
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={dpDragStart}
          title="Kéo để thay đổi kích thước"
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: 14, cursor: 'ew-resize', zIndex: 10,
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 3, height: 40, borderRadius: 99, background: 'rgba(16,185,129,0.5)' }} />
        </div>
        {/* Header */}
        <div style={{
          padding: '24px 22px 16px',
          paddingRight: '32px',
          background: isDark ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', // ✅ Đổi màu
          borderBottom: isDark ? '1px solid #065f46' : '1px solid #d1fae5', // ✅ Đổi màu
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              }}>
                <FontAwesomeIcon icon={faMugHot} style={{ color: 'white', fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? '#ffffff' : '#065f46' }}>Đồ uống & Cà phê</div> {/* ✅ Đổi màu */}
                <div style={{ fontSize: 12, color: '#6ee7b7' }}>Quán ngon tại {location}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: 'none', background: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)', // ✅ Đổi màu
                color: isDark ? '#34d399' : '#059669', cursor: 'pointer', // ✅ Đổi màu
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: '0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)'}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {/* Số lượng kết quả */}
          {!loading && drinks.length > 0 && (
            <div style={{
              marginTop: 12, padding: '6px 12px', borderRadius: 20,
              background: 'rgba(16,185,129,0.1)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                🧋 {drinks.length} quán được tìm thấy
              </span>
            </div>
          )}
        </div>

        {/* Body — danh sách quán */}
        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', paddingRight: '10px', marginRight: '14px' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: 220, color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 30, color: '#10b981', animation: 'rvSpin 1s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600 }}>Đang tìm quán ngon...</div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>☕</div>
              <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>{error}</div>
              <button
                onClick={() => { setFetched(false); }}
                style={{ marginTop: 14, padding: '8px 18px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && drinks.length === 0 && fetched && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14 }}>Chưa tìm thấy quán đồ uống nào.</div>
            </div>
          )}

          {/* Danh sách */}
          {!loading && !error && drinks.map((d, i) => (
            <DrinkCard key={i} item={d} location={location} isDark={isDark} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: isDark ? '1px solid #1e293b' : '1px solid #f0fdf4', // ✅ Đổi màu
          flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: isDark ? '#0f172a' : '#f9fafb', // ✅ Đổi màu
        }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Dữ liệu từ Google Maps · SerpAPI</span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 10, border: 'none',
              background: '#10b981', color: 'white', fontWeight: 700,
              fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 10 }} /> Đóng
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────
// 🧃 DRINK CARD — card cho từng quán đồ uống
// ─────────────────────────────────────────────────────────────
const DrinkCard = ({ item, location, isDark }) => {
  const { saved: isFav,   loading: favLoading,   toggle: toggleFav   } = useFavorite({
    name: item.name, location, rating: item.rating, thumbnail: item.thumbnail, type: 'drink',
  });
  const { saved: isSaved, loading: savedLoading, toggle: toggleSaved } = useSavedPlace({
    name: item.name, location, rating: item.rating, thumbnail: item.thumbnail, type: 'drink',
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fallbackImg, setFallbackImg] = useState(null);

  // Khi ảnh thumbnail lỗi → thử reviews trước, rồi mới images (tuần tự, tránh gọi thừa)
  const handleImgError = async () => {
    setImgError(true);
    try {
      const revData = await fetchReviews(item.name, item.place_id || '');
      const photos = (revData?.reviews || []).flatMap(r => r.photos || []);
      if (photos.length > 0) { setFallbackImg(photos[0]); return; }
      const imgData = await fetchImages(item.name, item.place_id || '');
      const imgs = imgData?.images || [];
      if (imgs.length > 0) setFallbackImg(imgs[0]);
    } catch (_) {}
  };

  const displayImg = !imgError ? proxyImage(item.thumbnail) : (fallbackImg ? proxyImage(fallbackImg) : null);

  return (
    <>
      <div
        className="dp-card"
        style={{
          backgroundColor: isDark ? '#1e293b' : 'white', // ✅ Đổi màu
          borderRadius: 18,
          border: isDark ? '1px solid #334155' : '1px solid #f1f5f9', // ✅ Đổi màu
          padding: '14px',
          marginBottom: 12,
          display: 'flex', gap: 14,
          position: 'relative',
          cursor: 'default',
        }}
      >
        {/* ❤️ Yêu thích + 🔖 Lưu địa điểm — 2 nút riêng biệt */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5, zIndex: 2 }}>
          {/* ❤️ Yêu thích → /api/favorites */}
          <button
            onClick={toggleFav}
            disabled={favLoading}
            title={isFav ? 'Bỏ yêu thích' : 'Thêm vào Yêu thích'}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: isFav ? (isDark ? '#7f1d1d' : '#fee2e2') : (isDark ? '#334155' : '#f8fafc'),
              color: isFav ? '#ef4444' : '#9ca3af',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: '0.2s', opacity: favLoading ? 0.6 : 1,
            }}
          >
            <FontAwesomeIcon icon={isFav ? faHeartSolid : faHeartRegular} />
          </button>
          {/* 🔖 Lưu địa điểm → /api/saved-places */}
          <button
            onClick={toggleSaved}
            disabled={savedLoading}
            title={isSaved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: isSaved ? (isDark ? '#854d0e' : '#fef08a') : (isDark ? '#334155' : '#f8fafc'),
              color: isSaved ? (isDark ? '#fde047' : '#eab308') : '#9ca3af',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: '0.2s', opacity: savedLoading ? 0.6 : 1,
            }}
          >
            <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmarkRegular} />
          </button>
        </div>

        {/* Ảnh */}
        <div style={{
          width: 80, height: 80, flexShrink: 0,
          borderRadius: 12, overflow: 'hidden',
          background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {(item.thumbnail || fallbackImg) && displayImg ? (
            <img
              src={displayImg}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={imgError ? undefined : handleImgError}
            />
          ) : (
            <FontAwesomeIcon icon={faMugHot} style={{ fontSize: 28, color: '#10b981' }} />
          )}
        </div>

        {/* Nội dung */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
          {/* Badge loại */}
          <div style={{
            fontSize: 10, fontWeight: 800, color: '#059669',
            textTransform: 'uppercase', letterSpacing: '0.4px',
            marginBottom: 3,
          }}>
            🧋 Đồ uống & Cà phê
          </div>

          {/* Tên */}
          <div style={{
            fontSize: 15, fontWeight: 900, color: isDark ? '#f8fafc' : '#111827', // ✅ Đổi màu
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: 1.35, marginBottom: 4,
          }}>
            {item.name}
          </div>

          {/* Rating + Giá */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>
              ⭐ {item.rating || 'N/A'}
            </span>
            {item.price && item.price !== 'Giá tùy chọn' && (
              <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>{item.price}</span>
            )}
          </div>

          {/* Mô tả */}
          {item.desc && (
            <div style={{
              fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4, // ✅ Đổi màu
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 8,
            }}>
              {item.desc}
            </div>
          )}

          {/* Nút hành động */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setMapOpen(true)}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none',
                background: '#3b82f6', color: 'white',
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <FontAwesomeIcon icon={faLocationArrow} style={{ fontSize: 9 }} /> Vị trí
            </button>
            <button
              onClick={() => setReviewsOpen(true)}
              style={{
                padding: '5px 12px', borderRadius: 8,
                border: '1.5px solid #0d9488',
                background: isDark ? '#111827' : 'white', color: '#0d9488', // ✅ Đổi màu
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: '0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d9488'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#111827' : 'white'; e.currentTarget.style.color = '#0d9488'; }} // ✅ Đổi màu hover
            >
              <FontAwesomeIcon icon={faStar} style={{ fontSize: 9 }} /> Reviews
            </button>
          </div>
        </div>
      </div>

      {/* Mini map popup */}
      {mapOpen && (
        <MapModal
          placeName={item.name}
          query={`${item.name} ${location}`}
          onClose={() => setMapOpen(false)}
        />
      )}
      {reviewsOpen && (
        <ReviewsModal
          placeName={item.name}
          placeId={item.place_id || ''}
          onClose={() => setReviewsOpen(false)} locationName={location} placeType="drink"
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// 🍜 SPECIALTIES PANEL — drawer đặc sản địa phương
// ─────────────────────────────────────────────────────────────
// 📦 Dữ liệu đặc sản tĩnh theo tỉnh thành (không cần API)
const SPECIALTIES_DB = {
  'đà lạt': { items: ['Mứt dâu tây', 'Rượu vang Đà Lạt', 'Atiso sấy khô', 'Hồng sấy dẻo', 'Mắc ca rang muối', 'Trà Ô Long', 'Bánh tráng nướng', 'Cà phê chồn'], tip: 'Mua tại chợ Đà Lạt hoặc các shop ven đường Phan Đình Phùng để được giá tốt hơn.' },
  'hội an': { items: ['Cao lầu khô', 'Bánh đậu xanh', 'Cơm gà Hội An', 'Mì Quảng sấy', 'Bánh in', 'Chè đậu ván', 'Đèn lồng thủ công', 'Tơ lụa Mã Châu'], tip: 'Phố cổ bán hàng lưu niệm giá cao hơn, ra ngoài chợ Hội An để mua đặc sản thực phẩm.' },
  'hà nội': { items: ['Phở bò khô', 'Bánh cốm', 'Chả cá Lã Vọng', 'Ô mai mơ', 'Rượu nếp cẩm', 'Kẹo lạc', 'Cốm làng Vòng', 'Bánh cuốn Thanh Trì'], tip: 'Phố Hàng Đường chuyên kẹo bánh, Hàng Buồm có nhiều đặc sản khô đóng hộp tiện làm quà.' },
  'hồ chí minh': { items: ['Bánh tráng phơi sương Tây Ninh', 'Mắm tôm chà Gò Công', 'Bánh pía Sóc Trăng', 'Muối tôm', 'Kẹo dừa Bến Tre', 'Cà phê Trung Nguyên', 'Bì cuốn', 'Tương hoisin'], tip: 'Siêu thị Co.opmart hoặc chợ Bình Tây là nơi mua đặc sản miền Nam với giá ổn định.' },
  'sài gòn': { items: ['Bánh tráng phơi sương', 'Mắm tôm chà', 'Kẹo dừa Bến Tre', 'Muối tôm', 'Cà phê Trung Nguyên', 'Bánh pía', 'Bì cuốn', 'Tương đen'], tip: 'Chợ Bình Tây và siêu thị Co.opmart là điểm mua đặc sản Nam Bộ giá tốt nhất.' },
  'đà nẵng': { items: ['Mì Quảng', 'Bánh tráng cuốn thịt heo', 'Nước mắm Nam Ô', 'Bánh khô mè', 'Mắm cá cơm', 'Bê thui Cầu Mống', 'Chả bò Đà Nẵng', 'Bánh ướt'], tip: 'Chợ Hàn và chợ Cồn là nơi lý tưởng mua đặc sản tươi và khô mang về.' },
  'nha trang': { items: ['Tôm hùm khô', 'Mực một nắng', 'Yến sào Khánh Hòa', 'Nước mắm Phan Thiết', 'Bánh căn', 'Chả cá Nha Trang', 'Rong biển sấy', 'Nem Ninh Hòa'], tip: 'Mua hải sản khô tại chợ Đầm hoặc cảng Cầu Đá để đảm bảo tươi ngon và giá gốc.' },
  'phú quốc': { items: ['Nước mắm Phú Quốc', 'Tiêu Phú Quốc', 'Rượu sim', 'Khô mực', 'Ngọc trai', 'Cá trích rim', 'Nhum biển sấy', 'Mật ong rừng'], tip: 'Nước mắm Phú Quốc chỉ đúng chuẩn khi mua tại xưởng sản xuất hoặc chợ Dương Đông.' },
  'huế': { items: ['Mè xửng', 'Bánh in Huế', 'Tôm chua', 'Ruốc Huế', 'Mắm sả ớt', 'Bánh đậu xanh', 'Chè hạt sen', 'Nón lá Thủy Thanh'], tip: 'Đường Đinh Tiên Hoàng có nhiều tiệm bán đặc sản Huế chính gốc, tránh hàng nhái ở phố du lịch.' },
  'sapa': { items: ['Thịt lợn gác bếp', 'Rượu táo mèo', 'Cá suối một nắng', 'Chè Shan Tuyết', 'Thảo quả', 'Mật ong bạc hà', 'Miến dong', 'Vải thổ cẩm'], tip: 'Mua tại chợ phiên bản địa cuối tuần để có hàng thủ công thật và giá người dân tộc.' },
  'phan thiết': { items: ['Nước mắm Phan Thiết', 'Bánh rế', 'Mực khô Bình Thuận', 'Thanh long ruột đỏ', 'Cá mai khô', 'Bánh tráng Bình Thuận', 'Rượu cần', 'Hải sản khô'], tip: 'Nước mắm Phan Thiết mua tại các cơ sở sản xuất ven biển sẽ đặc và thơm hơn ngoài siêu thị.' },
  'cần thơ': { items: ['Bánh cống', 'Cá khô sặt', 'Nem Lai Vung', 'Kẹo dừa', 'Khô cá lóc', 'Rượu nếp than', 'Bánh tét lá cẩm', 'Mắm cá linh'], tip: 'Chợ nổi Cái Răng và chợ An Bình có nhiều đặc sản miền Tây tươi ngon giá hợp lý.' },
};

// Tìm đặc sản phù hợp với location (tìm kiếm mờ)
const normalizeTextForMatch = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

const getLocalSpecialties = (location) => {
  if (!location) return null;
  const locNorm = normalizeTextForMatch(location);
  const entries = Object.entries(SPECIALTIES_DB);
  for (const [key, val] of entries) {
    const keyNorm = normalizeTextForMatch(key);
    // Nhờ xóa khoảng trắng, "ho chi minh" hay "hochiminh" đều sẽ khớp với nhau
    if (locNorm.includes(keyNorm) || keyNorm.includes(locNorm)) return val;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────
const SpecialtiesPanel = ({ location, isOpen, onClose, isDark }) => {
  const cacheKey = `specialties:${location}`;
  const [specialties, setSpecialties] = useState(panelCache[cacheKey] || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(!!(panelCache[cacheKey]?.length > 0));
  const { widthPct: spWidth, onMouseDown: spDragStart } = usePanelResize(30, 40, 35);

  const localTips = getLocalSpecialties(location);

  // Fetch danh sách cửa hàng
  useEffect(() => {
    if (!isOpen || fetched) return;
    setLoading(true); setError('');
    fetch(`${BASE_URL}/api/activities?location=${encodeURIComponent(location)}&type=${encodeURIComponent('Đặc sản địa phương món ăn truyền thống')}`)
      .then(r => r.json())
      .then(d => {
        const results = d.results || [];
        if (results.length > 0) panelCache[cacheKey] = results;
        setSpecialties(results);
        setFetched(true);
      })
      .catch(() => setError('Không thể tải dữ liệu đặc sản.'))
      .finally(() => setLoading(false));
  }, [isOpen, location, fetched, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes spFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spSlideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        .sp-overlay { animation: spFadeIn 0.2s ease forwards; }
        .sp-panel   { animation: spSlideIn 0.3s cubic-bezier(.22,1,.36,1) forwards; }
        .sp-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.10); transform: translateY(-3px); }
        .sp-card { transition: all 0.25s ease; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="sp-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      <div className="sp-panel" onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: `${spWidth}vw`, minWidth: '260px', backgroundColor: isDark ? '#111827' : 'white', zIndex: 100000, display: 'flex', flexDirection: 'column', boxShadow: '8px 0 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}> {/* ✅ Đổi màu */}
        {/* Drag handle */}
        <div onMouseDown={spDragStart} title="Kéo để thay đổi kích thước" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 14, cursor: 'ew-resize', zIndex: 10, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.18)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ width: 3, height: 40, borderRadius: 99, background: 'rgba(249,115,22,0.5)' }} />
        </div>
        {/* Header */}
        <div style={{ padding: '28px 24px 20px', paddingRight: '32px', background: isDark ? '#1e293b' : 'white', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', flexShrink: 0, zIndex: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}> {/* ✅ Đổi màu */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                <FontAwesomeIcon icon={faMugHot} style={{ color: 'white', fontSize: 22 }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#ffffff' : '#064e3b', letterSpacing: '-0.3px' }}>Đồ uống & Cà phê</div> {/* ✅ Đổi màu */}
                <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Khám phá quán ngon tại {location}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#cbd5e1' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: '0.2s' }} onMouseEnter={e => {e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444';}} onMouseLeave={e => {e.currentTarget.style.background = isDark ? '#334155' : '#f1f5f9'; e.currentTarget.style.color = isDark ? '#cbd5e1' : '#64748b';}}> {/* ✅ Đổi màu */}
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          {!loading && specialties.length > 0 && (
            <div style={{ marginTop: 12, padding: '6px 12px', borderRadius: 20, background: 'rgba(249,115,22,0.1)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>🍜 {specialties.length} đặc sản được tìm thấy</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', paddingRight: '10px', marginRight: '14px' }}>

          {/* 🍜 GỢI Ý ĐẶC SẢN TĨNH */}
          {localTips && (
            <div style={{ marginBottom: 16, borderRadius: 18, overflow: 'hidden', border: isDark ? '1.5px solid #9a3412' : '1.5px solid #fed7aa', boxShadow: isDark ? 'none' : '0 4px 16px rgba(249,115,22,0.10)' }}> {/* ✅ Đổi màu */}
              <div style={{ padding: '12px 16px', background: isDark ? 'linear-gradient(135deg, #c2410c, #7c2d12)' : 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', gap: 8 }}> {/* ✅ Đổi màu */}
                <span style={{ fontSize: 18 }}>🛍️</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>Nên mua gì tại {location}?</span>
              </div>
              <div style={{ padding: '12px 14px', background: isDark ? '#2a1508' : '#fff7ed' }}> {/* ✅ Đổi màu */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: localTips.tip ? 10 : 0 }}>
                  {(localTips.items || []).map((item, i) => (
                    <span key={i} style={{ padding: '5px 12px', borderRadius: 99, background: isDark ? '#111827' : 'white', border: isDark ? '1px solid #7c2d12' : '1.5px solid #fed7aa', fontSize: 12, fontWeight: 700, color: isDark ? '#fdba74' : '#9a3412', display: 'flex', alignItems: 'center', gap: 5 }}> {/* ✅ Đổi màu */}
                      <span style={{ color: '#f97316' }}>•</span> {item}
                    </span>
                  ))}
                </div>
                {localTips.tip && (
                  <div style={{ fontSize: 14, color: isDark ? '#fdba74' : '#78350f', lineHeight: 1.5, padding: '8px 10px', background: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.08)', borderRadius: 10, marginTop: 4 }}> {/* ✅ Đổi màu */}
                    💡 <em>{localTips.tip}</em>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tiêu đề danh sách cửa hàng */}
          {!loading && (specialties.length > 0 || fetched) && (
            <div style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faMapLocationDot} style={{ color: '#f97316' }} />
              Cửa hàng đặc sản gần đây
            </div>
          )}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: 220, color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 30, color: '#f97316', animation: 'rvSpin 1s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#fb923c', fontWeight: 600 }}>Đang tìm đặc sản ngon...</div>
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
              <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600 }}>{error}</div>
              <button onClick={() => setFetched(false)} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 10, border: 'none', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Thử lại</button>
            </div>
          )}
          {!loading && !error && specialties.length === 0 && fetched && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14 }}>Chưa tìm thấy đặc sản nào.</div>
            </div>
          )}
          {!loading && !error && specialties.map((s, i) => (
            <SpecialtyCard key={i} item={s} location={location} isDark={isDark} /> // ✅ Truyền isDark
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: isDark ? '1px solid #1e293b' : '1px solid #fff7ed', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? '#0f172a' : '#f9fafb' }}> {/* ✅ Đổi màu */}
          <span style={{ fontSize: 11, color: '#64748b' }}>Dữ liệu từ Google Maps · SerpAPI</span>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 10 }} /> Đóng
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

// 🍜 SPECIALTY CARD
const SpecialtyCard = ({ item, location, isDark }) => {
  const { saved: isFav,   loading: favLoading,   toggle: toggleFav   } = useFavorite({
    name: item.name, location, rating: item.rating, thumbnail: item.thumbnail, type: 'dacsan',
  });
  const { saved: isSaved, loading: savedLoading, toggle: toggleSaved } = useSavedPlace({
    name: item.name, location, rating: item.rating, thumbnail: item.thumbnail, type: 'dacsan',
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fallbackImg, setFallbackImg] = useState(null);

  const handleImgError = async () => {
    setImgError(true);
    try {
      const revData = await fetchReviews(item.name, item.place_id || '');
      const photos = (revData?.reviews || []).flatMap(r => r.photos || []);
      if (photos.length > 0) { setFallbackImg(photos[0]); return; }
      const imgData = await fetchImages(item.name, item.place_id || '');
      const imgs = imgData?.images || [];
      if (imgs.length > 0) setFallbackImg(imgs[0]);
    } catch (_) {}
  };

  const displayImg = !imgError ? proxyImage(item.thumbnail) : (fallbackImg ? proxyImage(fallbackImg) : null);

  return (
    <>
      <div className="sp-card" style={{ backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: 18, border: isDark ? '1px solid #334155' : '1px solid #f1f5f9', padding: '14px', marginBottom: 12, display: 'flex', gap: 14, position: 'relative', cursor: 'default' }}>

        {/* ❤️ Yêu thích + 🔖 Lưu đặc sản — 2 nút riêng biệt */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5, zIndex: 2 }}>
          {/* ❤️ Yêu thích → /api/favorites */}
          <button
            onClick={toggleFav}
            disabled={favLoading}
            title={isFav ? 'Bỏ yêu thích' : 'Thêm vào Yêu thích'}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: isFav ? (isDark ? '#7f1d1d' : '#fee2e2') : (isDark ? '#334155' : '#f8fafc'),
              color: isFav ? '#ef4444' : '#9ca3af',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: '0.2s', opacity: favLoading ? 0.6 : 1,
            }}
          >
            <FontAwesomeIcon icon={isFav ? faHeartSolid : faHeartRegular} />
          </button>
          {/* 🔖 Lưu địa điểm → /api/saved-places */}
          <button
            onClick={toggleSaved}
            disabled={savedLoading}
            title={isSaved ? 'Bỏ lưu đặc sản' : 'Lưu đặc sản'}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: isSaved ? (isDark ? '#854d0e' : '#fef08a') : (isDark ? '#334155' : '#f8fafc'),
              color: isSaved ? (isDark ? '#fde047' : '#eab308') : '#9ca3af',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, transition: '0.2s', opacity: savedLoading ? 0.6 : 1,
            }}
          >
            <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmarkRegular} />
          </button>
        </div>

        <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #ffedd5, #fed7aa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(item.thumbnail || fallbackImg) && displayImg ? (
            <img src={displayImg} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={imgError ? undefined : handleImgError} />
          ) : (
            <FontAwesomeIcon icon={faUtensils} style={{ fontSize: 28, color: '#f97316' }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 72 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>🎁 Đặc sản địa phương</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: isDark ? '#ffffff' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35, marginBottom: 4 }}>{item.name}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>⭐ {item.rating || 'N/A'}</span>
            {item.price && item.price !== 'Giá tùy chọn' && (
              <span style={{ color: '#f97316', fontSize: 12, fontWeight: 700 }}>{item.price}</span>
            )}
          </div>
          {item.desc && (
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>{item.desc}</div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setMapOpen(true)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FontAwesomeIcon icon={faLocationArrow} style={{ fontSize: 9 }} /> Vị trí
            </button>
            <button
              onClick={() => setReviewsOpen(true)}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #0d9488', background: isDark ? '#111827' : 'white', color: '#0d9488', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: '0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d9488'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#111827' : 'white'; e.currentTarget.style.color = '#0d9488'; }}
            >
              <FontAwesomeIcon icon={faStar} style={{ fontSize: 9 }} /> Reviews
            </button>
          </div>
        </div>
      </div>
      {mapOpen && <MapModal placeName={item.name} query={`${item.name} ${location}`} onClose={() => setMapOpen(false)} />}
      {reviewsOpen && <ReviewsModal placeName={item.name} placeId={item.place_id || ''} onClose={() => setReviewsOpen(false)} locationName={location} placeType="specialty" />}
    </>
  );
};

// 🗺️ MAP MODAL POPUP
const MapModal = ({ placeName, query, placeId, lat, lng, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const modalContent = (
    <>
      <style>{`
        @keyframes mapFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mapSlideUp { from { transform: translateY(40px) scale(0.97); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
        .map-overlay { animation: mapFadeIn 0.2s ease forwards; }
        .map-box { animation: mapSlideUp 0.25s ease forwards; }
        .map-close-btn:hover { background-color: #e2e8f0 !important; }
      `}</style>
      <div
        className="map-overlay"
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 999999,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', boxSizing: 'border-box',
        }}
      >
        <div
          className="map-box"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white', borderRadius: '24px', width: '100%',
            maxWidth: '760px', overflow: 'hidden',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={faMap} style={{ color: '#3b82f6', fontSize: '17px' }} />
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#111827' }}>{placeName}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Bản đồ vị trí · Bấm ESC hoặc ra ngoài để đóng</div>
              </div>
            </div>
            <button className="map-close-btn" onClick={onClose} style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s', fontSize: '16px', color: '#374151' }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div style={{ height: '450px', flexShrink: 0 }}>
            {/* Fix 1: Ưu tiên place_id để ghim chính xác ngay lần đầu render;
                       fallback về query-string khi không có place_id */}
            <iframe
              title={`map-popup-${placeName}`}
              width="100%" height="100%"
              style={{ border: 0, display: 'block' }}
              src={
                (lat && lng)
                  ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
              }
              allowFullScreen
            />
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <a
              href={
                placeId
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${placeId}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
              }
              target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#3b82f6', color: 'white', fontWeight: '700', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}
            >
              <FontAwesomeIcon icon={faLocationArrow} /> Mở Google Maps
            </a>
          </div>
        </div>
      </div>
    </>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

// ⭐ Stars
const Stars = ({ rating = 0 }) => (
  <span style={{ color: '#f59e0b', fontSize: 13 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i}>{i < Math.round(rating) ? '★' : '☆'}</span>
    ))}
  </span>
);

// 📸 ReviewsModal
const ReviewsModal = ({ placeName, placeId, onClose, locationName = '' , placeType = 'default'}) => {
  const [tab,      setTab]      = useState('images');
  const [reviews,  setReviews]  = useState([]);
  const [images,   setImages]   = useState([]);
  const [total,    setTotal]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [filterStar, setFilterStar] = useState('all'); 
  const [visibleCount, setVisibleCount] = useState(5);

  const { saved: isSaved,      toggle: toggleSaved }     = useSavedPlace({ name: placeName, location: locationName, type: placeType });
  const { saved: isFavorited,  toggle: toggleFavorited } = useFavorite({ name: placeName, location: locationName, type: placeType });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') lightbox ? setLightbox(null) : onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { 
      window.removeEventListener('keydown', onKey); 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
    };
  }, [onClose, lightbox]);

  useEffect(() => {
    setLoading(true); setError('');
    Promise.all([fetchReviews(placeName, placeId), fetchImages(placeName, placeId)])
      .then(([revData, imgData]) => {
        setReviews(revData.reviews || []);
        setTotal(revData.total || null);
        setImages(imgData.images || []);
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [placeName, placeId]);

  const stats = {
    all: reviews.length,
    5: reviews.filter(r => Math.round(r.rating || 0) === 5).length,
    4: reviews.filter(r => Math.round(r.rating || 0) === 4).length,
    3: reviews.filter(r => Math.round(r.rating || 0) === 3).length,
    2: reviews.filter(r => Math.round(r.rating || 0) === 2).length,
    1: reviews.filter(r => Math.round(r.rating || 0) === 1).length,
  };

  const filteredReviews = reviews.filter(r => filterStar === 'all' || Math.round(r.rating || 0) === filterStar);
  const displayedReviews = filteredReviews.slice(0, visibleCount);

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes rvFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes rvSlideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes rvSpin    { to{transform:rotate(360deg)} }
        .rv-overlay { animation: rvFadeIn 0.2s ease forwards; }
        .rv-box     { animation: rvSlideUp 0.25s cubic-bezier(.22,1,.36,1) forwards; }
        .rv-img:hover { transform: scale(1.06); }
      `}</style>
      <div
        className="rv-overlay"
        onClick={() => lightbox ? setLightbox(null) : onClose()}
        style={{ position: 'fixed', inset: 0, zIndex: 9999999, backgroundColor: lightbox ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {lightbox && (
          <img src={proxyImage(lightbox)} alt="" referrerPolicy="no-referrer" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 8px 50px rgba(0,0,0,0.7)' }}
          />
        )}
        {!lightbox && (
          <div className="rv-box" onClick={e => e.stopPropagation()} style={{ width: 'min(620px, 95vw)', maxHeight: '85vh', backgroundColor: 'white', borderRadius: 24, boxShadow: '0 30px 90px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '44px', lineHeight: '1.4' }}>{placeName}</div>
                  {total && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{Number(total).toLocaleString()} đánh giá trên Google</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={toggleFavorited} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: isFavorited ? '#fee2e2' : '#f1f5f9', color: isFavorited ? '#ef4444' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: '0.2s' }} title="Yêu thích">
                    <FontAwesomeIcon icon={isFavorited ? faHeartSolid : faHeartRegular} />
                  </button>
                  <button onClick={toggleSaved} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: isSaved ? '#fef08a' : '#f1f5f9', color: isSaved ? '#eab308' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, transition: '0.2s' }} title="Lưu trữ">
                    <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmarkRegular} />
                  </button>
                  <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#374151' }}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', gap: 4 }}>
                {[{ key: 'images', label: 'Hình ảnh', icon: faImages }, { key: 'reviews', label: 'Đánh giá', icon: faComments }].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: tab === t.key ? '#8b5cf6' : '#9ca3af', borderBottom: tab === t.key ? '2px solid #8b5cf6' : '2px solid transparent', marginBottom: -2, transition: '0.15s' }}>
                    <FontAwesomeIcon icon={t.icon} />
                    {t.label}
                    {t.key === 'images' && images.length > 0 && (
                      <span style={{ background: '#8b5cf620', color: '#8b5cf6', fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 99 }}>{images.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
              {loading && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: 180, color: '#9ca3af' }}><FontAwesomeIcon icon={faSpinner} style={{ fontSize: 28, color: '#8b5cf6', animation: 'rvSpin 1s linear infinite' }} /><div style={{ fontSize: 13 }}>Đang tải dữ liệu...</div></div>}
              {!loading && error && <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 14, padding: '50px 0' }}>{error}</div>}
              {!loading && !error && tab === 'reviews' && (
                reviews.length === 0
                  ? <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '50px 0' }}>Chưa có đánh giá nào.</div>
                  : <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {['all', 5, 4, 3, 2, 1].map(star => (
                          <button key={star} onClick={() => { setFilterStar(star); setVisibleCount(10); }} style={{ padding: '6px 14px', borderRadius: '20px', border: filterStar === star ? '1px solid #8b5cf6' : '1px solid #e2e8f0', backgroundColor: filterStar === star ? '#f5f3ff' : '#f8fafc', color: filterStar === star ? '#8b5cf6' : '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: '0.2s', display: stats[star] === 0 && star !== 'all' ? 'none' : 'block' }}>
                            {star === 'all' ? 'Tất cả' : `${star} Sao`} ({stats[star]})
                          </button>
                        ))}
                      </div>
                      {displayedReviews.length === 0
                        ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontSize: 14 }}>Không có đánh giá {filterStar} sao nào.</div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {displayedReviews.map((r, i) => (
                              <div key={i} style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                    {r.avatar ? <img src={r.avatar} referrerPolicy="no-referrer" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{(r.user || 'U')[0].toUpperCase()}</span>}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{r.user || 'Người dùng ẩn danh'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Stars rating={r.rating} /><span style={{ fontSize: 11, color: '#9ca3af' }}>{r.date || ''}</span></div>
                                  </div>
                                </div>
                                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{r.content || 'Không có nội dung.'}</p>
                                {r.photos && r.photos.length > 0 && (
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {r.photos.map((photoUrl, idx) => (
                                      <img key={idx} src={photoUrl} referrerPolicy="no-referrer" alt="review-pic" style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #f1f5f9', flexShrink: 0 }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                      }
                      {visibleCount < filteredReviews.length && (
                        <button onClick={() => setVisibleCount(prev => prev + 10)} style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1', backgroundColor: 'transparent', color: '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: '0.2s', textAlign: 'center' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.backgroundColor = '#f5f3ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          Xem thêm đánh giá ({filteredReviews.length - visibleCount} cái nữa) ⬇️
                        </button>
                      )}
                    </div>
              )}
              {!loading && !error && tab === 'images' && (
                images.length === 0
                  ? <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '50px 0' }}>Chưa có hình ảnh nào.</div>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {images.map((url, i) => (
                        <div key={i} onClick={() => setLightbox(url)} style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', background: '#f1f5f9' }}>
                          <img src={proxyImage(url)} alt="" className="rv-img" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.2s', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      ))}
                    </div>
              )}
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#d1d5db' }}>Dữ liệu từ Google Maps · SerpAPI</span>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', textDecoration: 'none' }}>Xem trên Google Maps ↗</a>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

// ✈️ Build URL đặt vé — ưu tiên booking_token của Google Flights
const getBookingUrl = (airlineName = '', bookingToken = '') => {
  if (bookingToken) {
    return `https://www.google.com/travel/flights?tfs=$${encodeURIComponent(bookingToken)}`;
  }
  
  // Cơ chế Fallback khi không có vé
  const n = airlineName.toLowerCase();
  if (n.includes('vietjet') || n.includes('vj')) return 'https://www.vietjetair.com';
  if (n.includes('vietnam airlines') || n.includes('vna')) return 'https://www.vietnamairlines.com';
  if (n.includes('bamboo')) return 'https://www.bambooairways.com';
  if (n.includes('pacific')) return 'https://www.pacificairlines.com';
  if (n.includes('vietravel') || n.includes('vu')) return 'https://www.vietravelairlines.com';

  return 'https://www.google.com/travel/flights'; 
};

// ✈️ Airline logo helper — trả về data URI SVG tránh bị chặn hotlink
const getAirlineLogo = (name = '', url = '') => {
  const n = name.toLowerCase();
  const u = (url || '').toLowerCase();

  // ĐÃ SỬA: Xóa chữ 'airlines/' trong tất cả các đường dẫn
  if (n.includes('vietnam airlines') || u.includes('vietnam-airlines') || u.includes('/vn.png') || u.includes('vna')) {
    return '/assets/vna.png'; 
  }
  
  if (n.includes('vietjet') || n.includes('viet jet') || u.includes('/vj.png') || u.includes('vietjet')) {
    return '/assets/vj.png';
  }
  
  if (n.includes('bamboo') || u.includes('bamboo') || u.includes('/qh.png')) {
    return '/assets/bamboo.png';
  }
  
  if (n.includes('pacific') || n.includes('jetstar') || u.includes('pacific') || u.includes('/bl.png')) {
    return '/assets/pacific.png';
  }
  
  if (n.includes('vietravel') || u.includes('vietravel') || u.includes('/vu.png')) {
    return '/assets/vietravel.png'; 
  }

  return null; 
};

// 🎨 PlaceCard
const PlaceCard = ({ type, data, sessionLabel, locationName, setMapQuery, onShowMap, onEdit, onEditDuration, onRemove, guestCount, isDark, draggable, onDragStart }) => {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);

  const placeType = type === 'Khách sạn' ? 'hotel' : type === 'Điểm tham quan' ? 'tour' : type === 'Địa điểm ăn uống' ? 'food' : 'default';

  // ❤️ Yêu thích → /api/favorites
  const { saved: isFav,   loading: favLoading,   toggle: toggleFav   } = useFavorite({
    name: data.name || data.airline || '',
    location: locationName || '',
    rating: data.rating,
    thumbnail: data.thumbnail,
    type: placeType,
  });

  // 🔖 Lưu địa điểm → /api/saved-places
  const { saved: isSaved, loading: savedLoading, toggle: toggleSaved } = useSavedPlace({
    name: data.name || data.airline || '',
    location: locationName || '',
    rating: data.rating,
    thumbnail: data.thumbnail,
    type: placeType,
  });

  const [imgError, setImgError] = useState(false);
  const [fallbackImg, setFallbackImg] = useState(null);

  const isHotel  = type === 'Khách sạn';
  const isFlight = type?.includes('Chuyến bay');
  const icon      = isHotel ? faHotel : (isFlight ? faPlane : (type === 'Địa điểm ăn uống' ? faUtensils : faMapLocationDot));
  const mainColor = isHotel ? '#3b82f6' : (isFlight ? '#10b981' : (type === 'Điểm tham quan' ? '#8b5cf6' : '#f97316'));
  const sessionIcon = sessionLabel === 'Sáng' ? faSun : (sessionLabel === 'Chiều' ? faCloudSun : faMoon);

  const getRoomIcon = (roomType) => {
    if (roomType?.includes("Nguyên căn") || roomType?.includes("Bungalow")) return faHome;
    if (roomType?.includes("Family") || roomType?.includes("Tập thể")) return faUsers;
    if (roomType?.includes("Đôi")) return faUserGroup;
    return faBed;
  };

  const handleLocation = () => {
    const query = `${data.name} ${locationName}`;
    if (setMapQuery) setMapQuery(query);
    else if (onShowMap) onShowMap(query, data.name, data.place_id || '', data.lat || null, data.lng || null);
  };

  const handleImgError = async () => {
    setImgError(true);
    try {
      const revData = await fetchReviews(data.name, data.place_id || '');
      const photos = (revData?.reviews || []).flatMap(r => r.photos || []);
      if (photos.length > 0) { setFallbackImg(photos[0]); return; }
      const imgData = await fetchImages(data.name, data.place_id || '');
      const imgs = imgData?.images || [];
      if (imgs.length > 0) setFallbackImg(imgs[0]);
    } catch (_) {}
  };

  const airlineName = isFlight ? (data.name || data.airline || '') : '';
  // Logo airline dùng ảnh local — KHÔNG proxy. Chỉ proxy cho hotel/food/tour.
  const airlineLogo = isFlight ? (getAirlineLogo(airlineName) || data.thumbnail || null) : null;
  const displayImg = isFlight
    ? airlineLogo
    : (!imgError ? proxyImage(data.thumbnail) : (fallbackImg ? proxyImage(fallbackImg) : null));

  return (
    <div
      className="ais-place-card"
      draggable={draggable}
      onDragStart={(e) => {
        setIsDragging(true);
        if (onDragStart) onDragStart(e);
      }}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        backgroundColor: isDark ? '#0f172a' : 'white',
        borderRadius: '20px', padding: '18px 20px',
        display: 'flex', gap: '16px',
        border: isDark ? (isHovered ? '1px solid #10b981' : '1px solid #1e293b') : (isHovered ? '1px solid #059669' : '1px solid #f1f5f9'),
        flex: 1,
        boxShadow: isHovered ? (isDark ? '0 10px 25px -5px rgba(16, 185, 129, 0.15)' : '0 15px 35px rgba(5, 150, 105, 0.15)') : '0 2px 8px rgba(0,0,0,0.06)',
        alignItems: 'center',
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isHovered ? 10 : 1, position: 'relative',
      }}
    >

      {/* ❤️ Yêu thích + 🔖 Lưu địa điểm — chỉ hiện với tour/food, KHÔNG hiện cho chuyến bay */}
      {!isFlight && <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: 6, zIndex: 20 }}>
        {/* ❤️ Yêu thích → /api/favorites */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFav(e); }}
          disabled={favLoading}
          title={isFav ? 'Bỏ yêu thích' : 'Thêm vào Yêu thích'}
          style={{
            backgroundColor: isFav ? (isDark ? '#7f1d1d' : '#fee2e2') : (isDark ? '#374151' : 'rgba(255,255,255,0.85)'),
            color: isFav ? '#ef4444' : '#9ca3af',
            border: isDark ? '1px solid #4b5563' : '1px solid #f1f5f9',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: '0.2s',
            opacity: favLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FontAwesomeIcon icon={isFav ? faHeartSolid : faHeartRegular} style={{ fontSize: '15px' }} />
        </button>
        {/* 🔖 Lưu địa điểm → /api/saved-places */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSaved(e); }}
          disabled={savedLoading}
          title={isSaved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}
          style={{
            backgroundColor: isSaved ? (isDark ? '#854d0e' : '#fef08a') : (isDark ? '#374151' : 'rgba(255,255,255,0.85)'),
            color: isSaved ? (isDark ? '#fde047' : '#eab308') : '#9ca3af',
            border: isDark ? '1px solid #4b5563' : '1px solid #f1f5f9',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: '0.2s',
            opacity: savedLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmarkRegular} style={{ fontSize: '15px' }} />
        </button>
      </div>}

      {/* Thêm điều kiện isFlight ? 'white' : ... để ép nền trắng cho logo hãng bay */}
      <div className="ais-place-card-img" style={{ width: '120px', height: '120px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden', backgroundColor: (displayImg && typeof displayImg === 'string' && displayImg.includes('vna.png')) ? '#006072' : (isDark ? '#111827' : '#f8fafc'), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {(isFlight || data.thumbnail || fallbackImg) && displayImg ? (
          <img src={displayImg} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isHovered ? 'scale(1.09)' : 'scale(1)', transition: 'transform 0.4s ease', display: 'block' }} onError={imgError ? (e => { e.target.onerror = null; e.target.src = 'https://placehold.co/120x120?text=S-Trip'; }) : handleImgError} />
        ) : (
          <FontAwesomeIcon icon={sessionLabel ? sessionIcon : icon} style={{ fontSize: '28px', color: mainColor }} />
        )}
      </div>

      <div className="ais-place-card-content" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          {data.timeLabel && (
            <span 
              onClick={onEditDuration}
              style={{ fontSize: '11px', fontWeight: '800', backgroundColor: isDark ? '#374151' : '#f1f5f9', color: isDark ? '#f8fafc' : '#475569', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', cursor: onEditDuration ? 'pointer' : 'default', transition: '0.2s', border: onEditDuration ? `1px solid ${isDark ? '#4b5563' : '#cbd5e1'}` : '1px solid transparent' }}
              title={onEditDuration ? 'Nhấn để điều chỉnh thời gian' : ''}
              onMouseEnter={(e) => { if (onEditDuration) e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e2e8f0'; }}
              onMouseLeave={(e) => { if (onEditDuration) e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f1f5f9'; }}
            >
              <FontAwesomeIcon icon={faClock} /> {data.timeLabel}
              {onEditDuration && <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }} />}
            </span>
          )}
          <span style={{ fontSize: '11px', fontWeight: '800', color: mainColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{type}</span>
        </div>
        
        {/* Ép chữ tên địa điểm hoặc tên hãng máy bay (Vietjet/Vietnam Airlines) sang màu trắng */}
        <div style={{ fontSize: '16px', fontWeight: '900', color: isDark ? '#ffffff' : '#111827', margin: '4px 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.35', wordBreak: 'break-word' }}>
          {data.name || data.airline}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ color: '#eab308', fontWeight: '700', fontSize: '13px' }}><FontAwesomeIcon icon={faStar} /> {data.rating || 'N/A'}</span>
          <span style={{ color: '#10b981', fontWeight: '800', fontSize: '13px' }}>{data.price}</span>
        </div>
        
        {/* Ép chữ mô tả (Hãng bay... Thời gian bay...) sang màu xám trắng sáng */}
        <div style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>
          {data.desc}
        </div>

        {(isHotel || isFlight) && guestCount && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: isFlight ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#1e3a8a' : '#eff6ff'), padding: '4px 10px', borderRadius: '6px', border: `1px solid ${isFlight ? (isDark ? '#059669' : '#a7f3d0') : (isDark ? '#2563eb' : '#dbeafe')}` }}>
              <FontAwesomeIcon icon={faUsers} style={{ fontSize: '10px', color: isFlight ? (isDark ? '#34d399' : '#059669') : (isDark ? '#93c5fd' : '#3b82f6') }} />
              <span style={{ fontSize: '11px', fontWeight: '700', color: isFlight ? (isDark ? '#a7f3d0' : '#065f46') : (isDark ? '#bfdbfe' : '#1e40af') }}>{isFlight ? `Vé cho ${guestCount} khách` : `${guestCount} khách`}</span>
            </div>
            {isHotel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: isDark ? '#4c1d95' : '#f5f3ff', padding: '4px 10px', borderRadius: '6px', border: isDark ? '1px solid #7c3aed' : '1px solid #ede9fe' }}>
                <FontAwesomeIcon icon={getRoomIcon(data.room_type)} style={{ fontSize: '10px', color: isDark ? '#c4b5fd' : '#8b5cf6' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: isDark ? '#ddd6fe' : '#5b21b6' }}>{data.room_type || "Phòng tiêu chuẩn"}</span>
              </div>
            )}
            {isFlight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: isDark ? '#7c2d12' : '#fff7ed', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${isDark ? '#9a3412' : '#ffedd5'}` }}>
                <FontAwesomeIcon icon={faPlane} style={{ fontSize: '10px', color: isDark ? '#fdba74' : '#f97316' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: isDark ? '#ffedd5' : '#c2410c' }}>Hạng {data.ticket_class || "Phổ thông"}</span>
              </div>
            )}
          </div>
        )}

        <div className="ais-place-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          {!isFlight && !isHotel && (
            <button onClick={handleLocation} style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FontAwesomeIcon icon={faLocationArrow} style={{ fontSize: '10px' }} /> Vị trí
            </button>
          )}
          {!isFlight && (
            <button onClick={() => setReviewsOpen(true)} style={{ padding: '7px 14px', borderRadius: '10px', border: '1.5px solid #0d9488', backgroundColor: isDark ? '#111827' : 'white', color: '#0d9488', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0d9488'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#111827' : 'white'; e.currentTarget.style.color = '#0d9488'; }}
            >
              <FontAwesomeIcon icon={faStar} style={{ fontSize: '10px' }} /> Reviews
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} style={{ padding: '7px 12px', borderRadius: '10px', border: `1.5px solid ${mainColor}`, color: mainColor, backgroundColor: isDark ? '#111827' : 'white', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: '10px' }} /> Đổi
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} style={{ padding: '7px 12px', borderRadius: '10px', border: `1.5px solid #ef4444`, color: '#ef4444', backgroundColor: isDark ? '#111827' : 'white', fontWeight: '700', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: '10px' }} /> Xóa
            </button>
          )}
          {isFlight && (
            <a
              href={getBookingUrl(data.airline || data.name || '', data.booking_token || '')}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto', // Tự động đẩy nút sang sát lề phải
                padding: '8px 22px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                textDecoration: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.4)'; 
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)'; 
              }}
            >
              Đặt vé ngay <FontAwesomeIcon icon={faPlane} style={{ fontSize: '13px' }} />
            </a>
          )}
        </div>
      </div>

      {reviewsOpen && <ReviewsModal placeName={data.name || data.airline} placeId={data.place_id || ""} onClose={() => setReviewsOpen(false)} locationName={locationName} placeType={placeType} />}
    </div>
  );
};

// ── TRANSPORT CARD — có hiệu ứng hover nổi lên ───────────────
const TransportCard = ({ opt, isCombined, isDark, noTickets }) => {
  const [hovered, setHovered] = useState(false);
  const isFlight = /bay|flight/i.test(opt.label || opt.type || '');

  return (
    <div
      className="ais-transport-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: '24px', padding: '24px',
        border: (noTickets && isFlight)
          ? '2px solid #ef4444'
          : opt.recommended
            ? '2.5px solid #10b981'
            : hovered ? (isDark ? '2px solid #10b981' : '2px solid #059669') : (isDark ? '2px solid #1e293b' : '2px solid #f1f5f9'),
        boxShadow: hovered
          ? (isDark ? '0 10px 25px -5px rgba(16, 185, 129, 0.15)' : '0 32px 64px rgba(5, 150, 105, 0.15)')
          : opt.recommended
            ? '0 12px 30px rgba(16,185,129,0.15)'
            : '0 4px 12px rgba(0,0,0,0.03)',
        transform: hovered ? 'translateY(-16px)' : 'translateY(0)',
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative', display: 'flex', flexDirection: 'column',
        cursor: 'default',
      }}
    >
      {opt.recommended && (
        <div style={{ position: 'absolute', top: '-12px', left: '24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '4px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
          ✨ Khuyên dùng
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', marginTop: opt.recommended ? '8px' : '0' }}>
        {(() => {
          const airlineLogoUrl = getAirlineLogo(opt.label, opt.thumbnail) || 
                       (opt.legs || []).reduce((found, l) => found || getAirlineLogo(l.label || '', opt.thumbnail), null);
          const logoSrc = airlineLogoUrl || opt.thumbnail || null; // ảnh local, không proxy
          return logoSrc && (
            <div style={{ 
              width: '50px', height: '50px', borderRadius: '12px', flexShrink: 0, overflow: 'hidden',
              backgroundColor: (logoSrc && typeof logoSrc === 'string' && logoSrc.includes('vna.png')) ? '#006072' : (isDark ? '#1e293b' : '#f8fafc'),
              border: `1px solid ${isDark ? '#4b5563' : '#e2e8f0'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0'
            }}>
              <img
                src={logoSrc}
                alt="logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          );
        })()}
        <div style={{ fontSize: '20px', fontWeight: '900', color: hovered ? '#10b981' : (isDark ? '#ffffff' : '#111827'), transition: 'color 0.2s' }}>
          {opt.label}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ⏱ {opt.duration}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#ea580c', background: '#fff7ed', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          💰 {opt.price_range}
        </span>
        {opt.distance && (
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', background: '#ecfdf4', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            📍 {opt.distance}
          </span>
        )}
        {opt.ticket_type && (
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6', background: '#f5f3ff', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            🎟️ {opt.ticket_type}
          </span>
        )}
      </div>

      <div style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.5', flex: 1 }}>
        {/* Parse link trong tips thành <a> đẹp */}
        {opt.tips ? (() => {
          const parts = [];
          const re = /([\w\sÀ-ỹ]+?)\s*\((https?:\/\/[^\s)]+)\)/g;
          let last = 0, m;
          const tips = opt.tips;
          while ((m = re.exec(tips)) !== null) {
            if (m.index > last) parts.push({ type: 'text', val: tips.slice(last, m.index) });
            
            const label = m[1].trim();
            const lblLower = label.toLowerCase();
            let finalUrl = m[2]; // Mặc định giữ nguyên link chi tiết gốc từ API mang về
            
            // CHỈ ÉP URL VỀ TRANG CHỦ KHI KHÔNG CÓ VÉ THỰC TẾ (noTickets === true)
            if (noTickets) {
              if (lblLower.includes('vietjet') || lblLower.includes('vj')) finalUrl = 'https://www.vietjetair.com';
              else if (lblLower.includes('vna') || lblLower.includes('vietnam airlines')) finalUrl = 'https://www.vietnamairlines.com';
              else if (lblLower.includes('bamboo')) finalUrl = 'https://www.bambooairways.com';
              else if (lblLower.includes('pacific')) finalUrl = 'https://www.pacificairlines.com';
              else if (lblLower.includes('vietravel')) finalUrl = 'https://www.vietravelairlines.com';
              else finalUrl = 'https://www.google.com/travel/flights';
            }

            parts.push({ type: 'link', label: label, url: finalUrl });
            last = m.index + m[0].length;
          }
          if (last < tips.length) parts.push({ type: 'text', val: tips.slice(last) });
          
          return parts.length > 1 ? (
            <span>
              {parts[0]?.type === 'text' && <span>{parts[0].val}</span>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '100%' }}>
                {parts.filter(p => p.type === 'link').map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: 1, 
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      padding: '8px 10px', borderRadius: '12px',
                      background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                      color: '#3b82f6', fontWeight: '700', fontSize: '13px',
                      textDecoration: 'none', border: '1px solid rgba(59,130,246,0.25)',
                      transition: '0.2s', whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
                  >
                    ✈️ {p.label}
                  </a>
                ))}
              </div>
            </span>
          ) : <span>{tips}</span>;
        })() : null}
      </div>

      {isCombined && opt.legs && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ position: 'absolute', left: '16px', top: '24px', bottom: '24px', width: '2px', background: '#e2e8f0', zIndex: 1 }} />
          {opt.legs.map((leg, lIdx) => (
            <div key={lIdx} style={{ display: 'flex', gap: '14px', zIndex: 2 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'white', border: '2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                {leg.icon}
              </div>
              <div className="ais-transport-leg" style={{ background: isDark ? '#334155' : '#f8fafc', padding: '12px 14px', borderRadius: '14px', flex: 1, border: `1px solid ${isDark ? '#475569' : '#f1f5f9'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: isDark ? '#9ca3af' : '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Chặng {leg.step}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: isDark ? '#ffffff' : '#1e293b', marginBottom: '4px' }}>{leg.label}</div>
                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>{leg.duration} • {leg.price_range}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(noTickets && isFlight) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: '16px', padding: '9px 14px',
          background: isDark ? 'rgba(239,68,68,0.08)' : '#fff1f2',
          border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid #fecdd3',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fca5a5' : '#be123c', lineHeight: '1.4' }}>
            Không tìm thấy vé máy bay cho ngày đã chọn. Vui lòng kiểm tra lại hoặc chọn ngày khác.
          </span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🌤️ WEATHER WIDGET — hiển thị thời tiết điểm đến
// ─────────────────────────────────────────────────────────────
const WeatherWidget = ({ location, isDark, externalData, departureDate }) => {
  const [weather, setWeather] = useState(externalData || null);
  const [loading, setLoading] = useState(!externalData);

  useEffect(() => {
    if (externalData) { setWeather(externalData); setLoading(false); return; }
    if (!location) return;
    setLoading(true);
    fetchWeather(location, departureDate)
      .then(data => setWeather(data))
      .finally(() => setLoading(false));
  }, [location, externalData, departureDate]);

  const cardBg   = isDark ? '#1e293b' : 'white';
  const border   = isDark ? '1px solid #334155' : '1px solid #e2e8f0';
  const textMain = isDark ? '#f8fafc' : '#111827';
  const textSub  = isDark ? '#94a3b8' : '#64748b';

  if (loading) return (
    <div style={{ marginBottom: 48, padding: '28px 32px', borderRadius: 28, background: cardBg, border, display: 'flex', alignItems: 'center', gap: 14 }}>
      <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 22, color: '#3b82f6', animation: 'rvSpin 1s linear infinite' }} />
      <span style={{ fontSize: 15, color: textSub, fontWeight: 600 }}>Đang tải thông tin thời tiết...</span>
    </div>
  );

  if (!weather) return null;

  const { current, forecast, travel_advice } = weather;

  return (
    <div style={{ marginBottom: 55, borderRadius: 32, overflow: 'hidden', border, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(59,130,246,0.10)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>

      {/* Header gradient - Bán trong suốt */}
      <div className="weather-header" style={{ background: isDark ? 'linear-gradient(135deg, rgba(30,58,95,0.65) 0%, rgba(22,32,50,0.65) 100%)' : 'linear-gradient(135deg, rgba(186,230,253,0.35) 0%, rgba(219,234,254,0.35) 100%)', padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

        {/* Thời tiết hiện tại — bên trái */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div className="weather-icon-main" style={{ fontSize: 52, lineHeight: 1 }}>{current.icon}</div>
          <div>
            <div className="weather-label" style={{ fontSize: 11, fontWeight: 800, color: isDark ? '#7dd3fc' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              🌍 Thời tiết tại {location}
            </div>
            <div className="weather-temp" style={{ fontSize: 38, fontWeight: 900, color: isDark ? '#ffffff' : '#1e3a8a', lineHeight: 1, marginBottom: 2 }}>
              {current.temp_c !== null ? `${current.temp_c}°C` : '--'}
            </div>
            <div className="weather-cond" style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#94a3b8' : '#1d4ed8' }}>
              {current.condition || 'Không xác định'}
            </div>
            {current.feels_like_c !== null && (
              <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 1 }}>
                Cảm giác như {current.feels_like_c}°C
              </div>
            )}
          </div>
        </div>

        {/* Chỉ số phụ — hàng ngang trên desktop, 2x2 grid trên mobile (qua CSS) */}
        <div className="weather-stats" style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {[
            { label: '💧 Độ ẩm',    val: current.humidity      != null ? `${current.humidity}%`        : '--' },
            { label: '💨 Gió',       val: current.wind_kph      != null ? `${current.wind_kph} km/h`    : '--' },
            { label: '🌞 UV',        val: current.uv_index      != null ? `${current.uv_index}`          : '--' },
            { label: '👁️ Tầm nhìn', val: current.visibility_km != null ? `${current.visibility_km} km` : '--' },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '8px 12px', minWidth: 72, textAlign: 'center', flex: '1 1 72px', maxWidth: 110 }}>
              <div style={{ fontSize: 10, color: isDark ? '#7dd3fc' : '#1d4ed8', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: isDark ? '#e2e8f0' : '#1e3a8a', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lời khuyên du lịch - Bán trong suốt */}
      {travel_advice && (
        <div style={{ padding: '10px 24px', background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(219,234,254,0.3)', borderTop: isDark ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(147,197,253,0.3)', fontSize: 13, fontWeight: 700, color: isDark ? '#94a3b8' : '#1e3a8a' }}>
          {travel_advice}
        </div>
      )}

      {/* Dự báo — grid tự co vừa khung - Bán trong suốt */}
      {forecast && forecast.length > 0 && (
        <div style={{ padding: '16px 24px 20px', background: isDark ? 'rgba(30,41,59,0.65)' : 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: textSub, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            📅 Dự báo thời tiết {forecast[0]?.date}–{forecast[forecast.length-1]?.date}
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {forecast.map((day, i) => (
              <div key={i} style={{ flex: '1 0 65px', background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(239,246,255,0.4)', border: isDark ? '1px solid rgba(30,41,59,0.5)' : '1px solid rgba(191,219,254,0.4)', borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: textSub, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.day || `N${i+1}`}</div>
                <div style={{ fontSize: 22, marginBottom: 3 }}>{day.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: textMain }}>{day.high_c !== null ? `${day.high_c}°` : '--'}</div>
                <div style={{ fontSize: 11, color: textSub }}>{day.low_c !== null ? `${day.low_c}°` : '--'}</div>
                {day.rain_chance != null && (
                  <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: isDark ? '#7dd3fc' : '#1d4ed8' }}>💧{day.rain_chance}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// iCal Export — tao file .ics chuan RFC 5545
// ─────────────────────────────────────────────────────────────
const _pad  = (n) => String(n).padStart(2, '0');
const _fmt  = (d) => d.getFullYear()+_pad(d.getMonth()+1)+_pad(d.getDate())+'T'+_pad(d.getHours())+_pad(d.getMinutes())+'00';
const _uid  = () => 'strip-'+Math.random().toString(36).slice(2,10)+'@strip.app';
const _esc  = (s='') => String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
const _fold = (line) => {
  if (line.length<=75) return line;
  let out='',pos=0;
  while(pos<line.length){out+=(pos===0?'':' ')+line.slice(pos,pos+(pos===0?75:74))+'\r\n';pos+=pos===0?75:74;}
  return out.trimEnd();
};
const _vevent = ({summary,description,location,dtStart,dtEnd}) =>
  ['BEGIN:VEVENT','UID:'+_uid(),'DTSTAMP:'+_fmt(new Date()),'DTSTART:'+_fmt(dtStart),'DTEND:'+_fmt(dtEnd),
   'SUMMARY:'+_esc(summary),description?'DESCRIPTION:'+_esc(description):null,location?'LOCATION:'+_esc(location):null,
   'END:VEVENT'].filter(Boolean).map(_fold).join('\r\n');
const _SCFG = {
  morning:   {startH:8, startM:0, dur:2, label:'Sang',  emoji:'[Sang]'},
  afternoon: {startH:13,startM:0, dur:2, label:'Chieu', emoji:'[Chieu]'},
  evening:   {startH:18,startM:30,dur:2, label:'Toi',   emoji:'[Toi]'},
};
const exportICalFile = ({dailyPlans=[],initialData={},currentHotel=null}) => {
  const loc = initialData.location || 'Diem den';
  let base = initialData.startDate ? new Date(initialData.startDate) : new Date();
  if (isNaN(base.getTime())) base = new Date();
  if (!initialData.startDate) base.setDate(base.getDate()+1);
  base.setHours(0,0,0,0);
  const events = [];
  if (currentHotel?.name) {
    const ci=new Date(base); ci.setHours(14,0,0,0);
    const co=new Date(base); co.setDate(co.getDate()+dailyPlans.length); co.setHours(12,0,0,0);
    events.push(_vevent({summary:'[Khach san] '+currentHotel.name,
      description:[currentHotel.desc,currentHotel.price&&'Gia: '+currentHotel.price,currentHotel.rating&&'Danh gia: '+currentHotel.rating].filter(Boolean).join(' | '),
      location:currentHotel.name+', '+loc,dtStart:ci,dtEnd:co}));
  }
  dailyPlans.forEach((dayPlan) => {
    const offset=dayPlan.day-1;
    Object.entries(_SCFG).forEach(([session,cfg]) => {
      const sd=dayPlan[session]||{};
      if (sd.tour?.name) {
        const s=new Date(base); s.setDate(s.getDate()+offset); s.setHours(cfg.startH,cfg.startM,0,0);
        const e=new Date(s); e.setHours(e.getHours()+cfg.dur);
        events.push(_vevent({summary:cfg.emoji+' '+sd.tour.name,
          description:[sd.tour.desc,sd.tour.rating&&'Danh gia: '+sd.tour.rating,sd.tour.price&&'Gia: '+sd.tour.price].filter(Boolean).join(' | '),
          location:sd.tour.lat&&sd.tour.lng?sd.tour.name+', '+loc+' ('+sd.tour.lat+','+sd.tour.lng+')':sd.tour.name+', '+loc,
          dtStart:s,dtEnd:e}));
      }
      if (sd.food?.name) {
        const s=new Date(base); s.setDate(s.getDate()+offset); s.setHours(cfg.startH+cfg.dur,cfg.startM,0,0);
        const e=new Date(s); e.setHours(e.getHours()+1); e.setMinutes(e.getMinutes()+30);
        events.push(_vevent({summary:'[An uong] '+cfg.emoji+' '+sd.food.name,
          description:[sd.food.desc,sd.food.rating&&'Danh gia: '+sd.food.rating,sd.food.price&&'Gia: '+sd.food.price].filter(Boolean).join(' | '),
          location:sd.food.name+', '+loc,dtStart:s,dtEnd:e}));
      }
    });
  });
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//S-Trip//S-Trip App//VI',
    'X-WR-CALNAME:'+_esc('S-Trip: '+loc),'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH',...events,'END:VCALENDAR'].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:'strip-'+loc.replace(/\s+/g,'-').toLowerCase()+'.ics'});
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// eslint-disable-next-line no-unused-vars
const ICalButton = ({ dailyPlans, initialData, currentHotel, isDark }) => {
  const [status, setStatus] = React.useState('idle');
  const handleClick = () => {
    try {
      exportICalFile({ dailyPlans, initialData, currentHotel });
      setStatus('success'); setTimeout(() => setStatus('idle'), 3000);
    } catch(err) { setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };
  const cfgMap = {
    idle:    { label: 'Xuat lich (.ics)', bg: '#2563eb', shadow: '0 12px 30px rgba(37,99,235,0.35)' },
    success: { label: 'Da tai xuong!',    bg: '#059669', shadow: 'none' },
    error:   { label: 'Co loi xay ra',    bg: '#dc2626', shadow: 'none' },
  };
  const cfg = cfgMap[status];
  return (
    <button onClick={handleClick} disabled={status !== 'idle'} title="Import vao Google Calendar / Apple Calendar"
      style={{ backgroundColor: cfg.bg, color: 'white', padding: '22px 50px', borderRadius: '99px', border: 'none',
        fontWeight: '800', fontSize: '22px', cursor: status==='idle'?'pointer':'default',
        boxShadow: cfg.shadow, transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: '10px',
        opacity: status!=='idle' ? 0.85 : 1 }}>
      {status === 'idle' ? '📅' : ''} {cfg.label}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// 📸 ScreenshotButton — chụp DOM thật, cắt thành nhiều ảnh
// Dùng html2canvas (npm install html2canvas)
// ─────────────────────────────────────────────────────────────

// Chuyển tất cả <img> và background-image trong el sang blob URL để html2canvas đọc được
const _preloadImages = async (el) => {
  const imgs = [...el.querySelectorAll('img')];
  const origSrcs = [];

  await Promise.all(imgs.map(async (img, i) => {
    origSrcs[i] = img.src;
    if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) return;
    try {
      // Thử fetch qua proxy backend trước
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
      const res = await fetch(proxyUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('proxy fail');
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
      await new Promise(r => { img.onload = r; img.onerror = r; });
    } catch (_) {
      // fallback: thử fetch trực tiếp
      try {
        const res = await fetch(img.src, { mode: 'no-cors' });
        const blob = await res.blob();
        if (blob.size > 0) {
          img.src = URL.createObjectURL(blob);
          await new Promise(r => { img.onload = r; img.onerror = r; });
        }
      } catch (_2) { /* giữ nguyên */ }
    }
  }));

  return () => imgs.forEach((img, i) => { img.src = origSrcs[i]; });
};

// eslint-disable-next-line no-unused-vars
const ScreenshotButton = ({ contentRef, location, isDark }) => {
  const [status,   setStatus]   = React.useState('idle');
  const [progress, setProgress] = React.useState('');

  const handleClick = async () => {
    if (status !== 'idle') return;
    const el = contentRef?.current;
    if (!el) return;

    setStatus('loading');
    try {
      const html2canvas = (await import('html2canvas')).default;

      // 1. Pre-load ảnh → blob URL (fix ảnh proxy bị trắng)
      setProgress('Đang tải ảnh...');
      const restore = await _preloadImages(el);

      // 2. Chụp toàn bộ element thành 1 canvas duy nhất
      setProgress('Đang chụp...');
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDark ? '#111827' : '#ffffff',
        logging: false,
        ignoreElements: (node) => node.tagName === 'IFRAME',
        onclone: (doc) => {
          // Ẩn iframe map, hiện overlay placeholder
          doc.querySelectorAll('iframe').forEach(f => { f.style.display = 'none'; });
          doc.querySelectorAll('.map-screenshot-overlay').forEach(d => { d.style.display = 'flex'; });
          // Bỏ hover transform
          doc.querySelectorAll('button').forEach(b => {
            b.style.transform = 'none';
            b.style.boxShadow = 'none';
          });
        },
      });

      // 3. Restore src gốc
      restore();

      // 4. Download 1 ảnh duy nhất
      setProgress('Đang lưu...');
      const loc = (location || 's-trip').toLowerCase().replace(/\s+/g, '-');
      await new Promise((res) => {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a   = Object.assign(document.createElement('a'), {
            href:     url,
            download: `strip-${loc}.png`,
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          res();
        }, 'image/png');
      });

      setStatus('success');
      setProgress('');
    } catch (err) {
      console.error('[ScreenshotButton]', err);
      setStatus('error');
      setProgress('');
    } finally {
      setTimeout(() => setStatus('idle'), 3500);
    }
  };

  const cfgMap = {
    idle:    { label: '📸 Xuất ảnh lịch trình', bg: '#7c3aed', shadow: '0 12px 30px rgba(124,58,237,0.35)' },
    loading: { label: progress || 'Đang xử lý...', bg: '#6d28d9', shadow: 'none' },
    success: { label: '✅ Đã tải xong!',           bg: '#059669', shadow: 'none' },
    error:   { label: '❌ Có lỗi — thử lại',       bg: '#dc2626', shadow: 'none' },
  };
  const cfg = cfgMap[status];

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      style={{
        backgroundColor: cfg.bg,
        color: 'white',
        padding: '22px 50px',
        borderRadius: '99px',
        border: 'none',
        fontWeight: '800',
        fontSize: '22px',
        cursor: status === 'loading' ? 'wait' : 'pointer',
        boxShadow: cfg.shadow,
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        opacity: status === 'loading' ? 0.85 : 1,
        minWidth: 280,
        justifyContent: 'center',
      }}
    >
      {cfg.label}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// 🔗 ShareButton — tạo link chia sẻ + copy + Zalo/Messenger
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const ShareButton = ({ dailyPlans, initialData, currentHotel, plan, isDark }) => {
  const [status,   setStatus]   = React.useState('idle');
  const [shareUrl, setShareUrl] = React.useState('');
  const [copied,   setCopied]   = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const handleShare = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const body = {
        plan:       plan || {},
        dailyPlans: dailyPlans || [],
        meta: {
          location:  initialData.location,
          days:      parseInt(String(initialData.days || '3').split(' ')[0]),
          origin:    initialData.origin || initialData.from || '',
          startDate: initialData.startDate || initialData.departure_date || '',
        },
      };
      const res  = await fetch(`${BASE_URL}/api/trip/save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Lỗi server');

      setShareUrl(data.share_url);
      setStatus('success');
      setPanelOpen(true);
    } catch (err) {
      console.error('[ShareButton]', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`Xem lịch trình ${initialData.location} của mình trên S-Trip! `);

  const btnBase = {
    padding: '12px 24px', borderRadius: 99, border: 'none',
    fontWeight: 800, fontSize: 15, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all 0.2s',
  };

  return (
    <>
      {/* Nút chính */}
      <button
        onClick={handleShare}
        disabled={status === 'loading'}
        title="Tạo link chia sẻ lịch trình"
        style={{
          backgroundColor: '#0ea5e9',
          color: 'white',
          padding: '22px 50px',
          borderRadius: '99px',
          border: 'none',
          fontWeight: '800',
          fontSize: '22px',
          cursor: status === 'loading' ? 'wait' : 'pointer',
          boxShadow: status === 'idle' ? '0 12px 30px rgba(14,165,233,0.35)' : 'none',
          transition: 'all 0.3s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          opacity: status === 'loading' ? 0.8 : 1,
        }}
      >
        {status === 'loading' ? '⏳' : status === 'error' ? '❌' : '🔗'}
        {status === 'loading' ? 'Đang tạo link...' : status === 'error' ? 'Có lỗi xảy ra' : 'Chia sẻ lịch trình'}
      </button>

      {/* Panel chia sẻ */}
      {panelOpen && shareUrl && ReactDOM.createPortal(
        <>
          <style>{`
            @keyframes spShareFade { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            .share-panel { animation: spShareFade 0.25s cubic-bezier(.22,1,.36,1) forwards; }
          `}</style>
          {/* Overlay */}
          <div
            onClick={() => setPanelOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99998,
              backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
          {/* Panel */}
          <div
            className="share-panel"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 40, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 99999,
              backgroundColor: isDark ? '#1e293b' : 'white',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 28,
              padding: '28px 32px',
              width: 'min(480px, 92vw)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? '#f8fafc' : '#111827' }}>
                  🔗 Chia sẻ lịch trình
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Link hoạt động ngay · Có OG preview cho Zalo & Messenger
                </div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none',
                  background: isDark ? '#334155' : '#f1f5f9', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#64748b' }}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* URL box */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 20,
              padding: '12px 16px',
              background: isDark ? '#0f172a' : '#f8fafc',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 14,
            }}>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600,
                color: isDark ? '#94a3b8' : '#475569',
                wordBreak: 'break-all', lineHeight: 1.4,
              }}>
                {shareUrl}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  ...btnBase,
                  padding: '8px 16px', fontSize: 13,
                  backgroundColor: copied ? '#059669' : '#0ea5e9',
                  color: 'white', flexShrink: 0,
                }}
              >
                {copied ? '✅ Đã copy' : '📋 Copy'}
              </button>
            </div>

            {/* Social buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

              {/* Zalo */}
              <a
                href={`https://zalo.me/share?url=${encodedUrl}&text=${encodedText}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  ...btnBase,
                  backgroundColor: '#0068ff', color: 'white',
                  textDecoration: 'none', flex: '1 1 120px',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="white">
                  <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm8.7 28.5l-2.5-1.5c-1.2 1.3-2.9 2.1-4.8 2.1-3.9 0-7-3.1-7-7s3.1-7 7-7c1.7 0 3.2.6 4.4 1.6l2.2-2c-1.7-1.5-4-2.4-6.6-2.4-5.5 0-10 4.5-10 10s4.5 10 10 10c2.9 0 5.5-1.2 7.3-3.1v.3z"/>
                </svg>
                Chia sẻ Zalo
              </a>

              {/* Messenger */}
              <a
                href={`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodedUrl}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  ...btnBase,
                  backgroundColor: '#0099ff', color: 'white',
                  textDecoration: 'none', flex: '1 1 120px',
                  justifyContent: 'center',
                }}
              >
                💬 Messenger
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  ...btnBase,
                  backgroundColor: '#1877f2', color: 'white',
                  textDecoration: 'none', flex: '1 1 120px',
                  justifyContent: 'center',
                }}
              >
                👤 Facebook
              </a>
            </div>

            <div style={{ marginTop: 16, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              Khi chia sẻ qua Zalo / Messenger, link sẽ hiện preview ảnh + mô tả lịch trình tự động ✨
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// Hàm tiện ích phân tích chuỗi thành số tiền (VNĐ)
const parseMoney = (str) => {
  if (!str) return 0;
  const s = String(str).toLowerCase().replace(/,/g, '').replace(/\./g, '');
  // Nếu có dạng "300.000đ - 500.000đ", lấy số đầu tiên
  const match = s.match(/(\d+)/);
  if (!match) return 0;
  let num = parseInt(match[1], 10);
  if (s.includes('triệu') || s.includes('tr')) {
    if (num < 1000) num *= 1000000;
  }
  return num;
};

const BudgetDashboard = ({ initialData, currentHotel, dailyPlans, numDays, isDark }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef({ startX: 0, startY: 0, initX: 0, initY: 0, hasMoved: false });

  // Mặc định 5 triệu nếu ko nhập
  const budget = parseMoney(initialData.budget) || 5000000; 
  const passengers = parseInt(initialData.passengers) || 1;

  // Tính toán real-time bằng useMemo
  const { hotelCost, flightCost, foodTourCost, totalCost, remaining, transportLabel } = React.useMemo(() => {
    // 1. Khách sạn
    const hCost = parseMoney(currentHotel?.price) * numDays;

    // 2. Phương tiện (Vé máy bay hoặc Tàu/Xe)
    const validFlights = (initialData.realFlights || initialData.flights || []).filter(f => f.airline && f.price);
    let fCost = 0;
    let tLabel = 'Vé máy bay';
    
    if (validFlights.length > 0) {
      fCost = parseMoney(validFlights[0].price) * passengers;
    } else if (initialData.transport && initialData.transport.options && initialData.transport.options.length > 0) {
      let opts = initialData.transport.options;
      let activeOpt = opts.find(o => o.recommended);
      
      // Fallback nếu máy bay được gợi ý nhưng không có vé
      if (activeOpt && /bay|flight/i.test(activeOpt.label || activeOpt.type || '')) {
         const fallbackOpt = opts.find(o => !(/bay|flight/i.test(o.label || o.type || '')));
         if (fallbackOpt) activeOpt = fallbackOpt;
      }
      if (!activeOpt) activeOpt = opts[0];

      fCost = parseMoney(activeOpt.price || activeOpt.price_range) * passengers;
      tLabel = 'Vé xe/tàu';
    }

    // 3. Ăn uống & tham quan
    let actCost = 0;
    (dailyPlans || []).forEach(day => {
      ['morning', 'afternoon', 'evening'].forEach(session => {
        if (day[session]?.food?.price) actCost += parseMoney(day[session].food.price) * passengers;
        if (day[session]?.tour?.price) actCost += parseMoney(day[session].tour.price) * passengers;
      });
    });

    const total = hCost + fCost + actCost;
    return { hotelCost: hCost, flightCost: fCost, foodTourCost: actCost, totalCost: total, remaining: budget - total, transportLabel: tLabel };
  }, [currentHotel, dailyPlans, initialData, numDays, budget, passengers]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.budget-popover')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y, hasMoved: false };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.hasMoved = true;
    
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    const maxDragRight = 175;
    const maxDragLeft = -(screenW - 175);
    const maxDragBottom = screenH - 124 - 40;
    const maxDragTop = -14 - 100; // Cho phép kéo lố lên trên để tạo độ nhún
    
    let newX = dragRef.current.initX + dx;
    let newY = dragRef.current.initY + dy;
    
    if (newX > maxDragRight) newX = maxDragRight;
    if (newX < maxDragLeft) newX = maxDragLeft;
    if (newY > maxDragBottom) newY = maxDragBottom;
    if (newY < maxDragTop) newY = maxDragTop;
    
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    let finalX = dragRef.current.initX + (e.clientX - dragRef.current.startX);
    let finalY = dragRef.current.initY + (e.clientY - dragRef.current.startY);
    
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    let snapRight = 0; // margin 30px (do CSS default là right 30px)
    let snapLeft = -(screenW - 350 - 60); // margin 30px
    if (snapLeft > snapRight) {
      const margin = (screenW - 350) / 2;
      snapRight = 30 - margin;
      snapLeft = 30 - margin;
    }
    const snapBottom = screenH - 124 - 80 - 30; // margin dưới 30px
    const snapTop = -14; // sát Navbar
    
    if (finalX > snapRight) finalX = snapRight;
    if (finalX < snapLeft) finalX = snapLeft;
    if (finalY > snapBottom) finalY = snapBottom;
    if (finalY < snapTop) finalY = snapTop;

    const dist = Math.sqrt(finalX * finalX + finalY * finalY);
    if (dist < 150) { // snap radius = 150px
      setPos({ x: 0, y: 0 });
    } else {
      setPos({ x: finalX, y: finalY });
    }
    if (!dragRef.current.hasMoved) setShowDetails(prev => !prev);
  };

  return (
    <>
      <style>
        {`
          @keyframes dangerBlink {
            0% { opacity: 1; box-shadow: 0 4px 20px rgba(239,68,68,0.8); }
            50% { opacity: 0.7; box-shadow: 0 4px 10px rgba(239,68,68,0.3); }
            100% { opacity: 1; box-shadow: 0 4px 20px rgba(239,68,68,0.8); }
          }
        `}
      </style>
      {/* Backdrop (chỉ dùng để đóng chi tiết khi click ra ngoài) */}
      {showDetails && (
        <div onClick={() => setShowDetails(false)} style={{ position: 'fixed', inset: 0, zIndex: 989, background: 'transparent' }} />
      )}
      
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'fixed', top: '124px', right: '30px', zIndex: 990,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.8, 0.64, 1)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
      >
        {/* The Text Above the Bar */}
        <div style={{
          fontSize: '11px', fontWeight: 900, 
          color: isDark ? '#f8fafc' : '#1e293b',
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '5px 12px', borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '8px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          transition: 'all 0.2s ease',
        }}>
          <span style={{ color: remaining < 0 ? '#ef4444' : 'inherit' }}>{(totalCost/1000000).toFixed(1)}M</span> 
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}> / {(budget/1000000).toFixed(1)}M</span>
        </div>

        {/* The Bar */}
        <div style={{
          width: '350px', height: '8px',
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(226, 232, 240, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '4px', overflow: 'hidden',
          boxShadow: remaining < 0 ? '0 6px 20px rgba(239,68,68,0.5)' : '0 6px 16px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)',
          border: `1px solid ${remaining < 0 ? 'rgba(239,68,68,0.6)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}`,
          animation: remaining < 0 ? 'dangerBlink 0.8s infinite' : 'none'
        }}>
          {/* Background fill - Modern Semantic Gradient */}
          <div style={{ 
            height: '100%', 
            width: `${Math.min((totalCost/budget)*100, 100)}%`, 
            background: remaining < 0 ? '#ef4444' : 'linear-gradient(90deg, #0ea5e9, #10b981, #eab308, #f97316, #ef4444)', 
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>

        {/* The Details Popover */}
        {showDetails && (
          <div className="budget-popover" style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '14px',
            width: '320px',
            background: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.2s ease',
            cursor: 'default'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '13px' }}>
              <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Ngân sách ban đầu:</span>
              <span style={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b' }}>{budget.toLocaleString('vi-VN')}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '14px', marginBottom: '14px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, fontSize: '13px' }}>
              <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>Đã lên kế hoạch:</span>
              <span style={{ fontWeight: 800, color: isDark ? '#f8fafc' : '#1e293b' }}>{totalCost.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
              <span style={{ color: isDark ? '#cbd5e1' : '#334155', fontWeight: 700 }}>Trạng thái:</span>
              <span style={{ fontWeight: 900, color: remaining < 0 ? '#ef4444' : '#10b981' }}>
                {remaining < 0 ? 'Lố ' : 'Còn dư '}
                {Math.abs(remaining).toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width:10,height:10,borderRadius:'50%',background:'#0ea5e9'}}/> {transportLabel}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>{flightCost.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width:10,height:10,borderRadius:'50%',background:'#8b5cf6'}}/> Khách sạn ({numDays} đêm)</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>{hotelCost.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width:10,height:10,borderRadius:'50%',background:'#10b981'}}/> Ăn uống & Tour</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>{foodTourCost.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ── COMPONENT CHÍNH ──────────────────────────────────────────
const AiSchedule = ({ data: rawData, plan, onSave, onPlanChange, onSwap, isDark = false }) => {
  // Normalize tất cả các field string để tránh lỗi ".replace is not a function"
  // khi component cha truyền vào number/object thay vì string.
  // Dùng useMemo để object không bị tạo mới mỗi render → tránh warning exhaustive-deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialData = React.useMemo(() => ({
    ...(rawData || {}),
    location:       String(rawData?.location       || ''),
    days:           String(rawData?.days           || '3'),
    origin:         String(rawData?.origin         || ''),
    from:           String(rawData?.from           || ''),
    startDate:      String(rawData?.startDate      || ''),
    departure_date: String(rawData?.departure_date || ''),
    budget:         String(rawData?.budget         || ''),
  }), [rawData]); // eslint-disable-line react-hooks/exhaustive-deps
  const numDays  = parseInt(initialData.days.split(' ')[0]) || 3;
  const [dailyPlans,  setDailyPlans]  = useState([]);
  const [mapQuery,    setMapQuery]    = useState(() => { const h = (initialData.realHotels || [])[0]; return h ? `${h.name} ${initialData.location || ''}`.trim() : (initialData.location || ''); });
  const [modal,       setModal]       = useState({ show: false, type: '', day: null, session: '', subType: '' });
  const [addModal,    setAddModal]    = useState({ show: false, day: null, session: '', query: '', results: [], loading: false, selectedPlace: null, replaceTarget: 'new' });
  const [mapModal,    setMapModal]    = useState({ show: false, query: '', placeName: '', placeId: '', lat: null, lng: null });

  const [drumDataUrl, setDrumDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        // Chuyển màu trắng thành trong suốt hoàn toàn
        const alpha = 255 - brightness; 
        if (isDark) {
          data[i] = 255; data[i+1] = 220; data[i+2] = 100; // Vàng sáng cho Dark Mode
        } else {
          data[i] = 40; data[i+1] = 40; data[i+2] = 40; // Xám đậm cho Light Mode
        }
        data[i+3] = alpha;
      }
      ctx.putImageData(imgData, 0, 0);
      if (active) setDrumDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = '/hoa-tiet-trong-dong.jpg';
    return () => { active = false; };
  }, [isDark]);

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverSession, setDragOverSession] = useState(null);
  const [dragHoverItem, setDragHoverItem] = useState(null);
  const [durationEdit, setDurationEdit] = useState(null);
  const [customDuration, setCustomDuration] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [isGlassMode, setIsGlassMode] = useState(false);

  useEffect(() => {
    const handleDragEndGlobal = () => {
      setDragOverSession(null);
      setDragHoverItem(null);
      setDraggedItem(null);
    };
    window.addEventListener('dragend', handleDragEndGlobal);
    return () => window.removeEventListener('dragend', handleDragEndGlobal);
  }, []);

  const closeAddModal = () => setAddModal({ show: false, day: null, session: '', query: '', results: [], loading: false, selectedPlace: null, replaceTarget: 'new' });

  const contentRef = useRef(null);

  const getSortedItems = (sessionData) => {
    if (!sessionData) return [];
    const items = [];
    if (sessionData.food) items.push({ key: 'food', act: sessionData.food, index: null, typeLabel: 'Địa điểm ăn uống', subType: 'food' });
    if (sessionData.tour) items.push({ key: 'tour', act: sessionData.tour, index: null, typeLabel: 'Điểm tham quan', subType: 'tour' });
    if (sessionData.extras) sessionData.extras.forEach((ex, i) => items.push({ key: 'extras', index: i, act: ex, typeLabel: 'Điểm đến thêm', subType: 'extras' }));
    
    items.forEach((item, idx) => {
      if (typeof item.act._order !== 'number') item.act._order = idx;
    });

    items.sort((a, b) => a.act._order - b.act._order);
    return items;
  };

  const renderSessionCards = (d, sessionName) => {
    let items = getSortedItems(d[sessionName]);

    return items.map((item, idx) => {
      const isBeingDragged = draggedItem && draggedItem.day === d.day && draggedItem.session === sessionName && draggedItem.subType === item.subType && draggedItem.index === item.index;
      const isHoveredHere = dragHoverItem?.day === d.day && dragHoverItem?.session === sessionName && dragHoverItem?.order === item.act._order;
      const showPlaceholderBefore = isHoveredHere && dragHoverItem?.position === 'before' && draggedItem;
      const showPlaceholderAfter = isHoveredHere && dragHoverItem?.position === 'after' && draggedItem;
      
      const placeholder = (
        <div 
          style={{
            width: '100%',
            borderRadius: '20px',
            backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
            border: '2px dashed #3b82f6',
            animation: 'expandDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }} 
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
      );

      return (
        <React.Fragment key={`${item.key}-${item.index !== null ? item.index : '0'}`}>
          {showPlaceholderBefore && placeholder}
          <div 
            style={{ 
              display: isBeingDragged ? 'none' : 'flex',
              flex: 1,
              width: '100%',
            }}
            onDragOver={(e) => handleDragOverCard(e, d.day, sessionName, item.act._order)}
          >
            <PlaceCard 
              draggable={true} 
              onDragStart={(e) => handleDragStart(e, d.day, sessionName, item.subType, item.index, item.act)} 
              type={item.typeLabel} 
              sessionLabel={sessionName === 'morning' ? 'Sáng' : sessionName === 'afternoon' ? 'Chiều' : 'Tối'}
              data={item.act} 
              locationName={initialData.location} 
              onShowMap={handleShowMap} 
              onEdit={item.key !== 'extras' ? () => setModal({ show: true, type: item.typeLabel, day: d.day, session: sessionName, subType: item.subType }) : undefined} 
              onEditDuration={() => {
                let startMatch = '';
                const t = item.act.timeLabel || item.act.time;
                if (t) startMatch = t.split('-')[0].trim();
                setDurationEdit({ day: d.day, session: sessionName, act: item.act, key: item.key, index: item.index, currentDuration: item.duration });
                setCustomDuration('');
                setCustomStartTime(startMatch);
              }}
              onRemove={item.key === 'extras' ? () => handleRemoveExtraActivity(d.day, sessionName, item.index) : undefined} 
              isDark={isDark} 
            />
          </div>
          {showPlaceholderAfter && placeholder}
        </React.Fragment>
      );
    });
  };

  const handleDragStart = (e, day, session, subType, index, data) => {
    setTimeout(() => {
      setDraggedItem({ day, session, subType, index, data });
      setDragHoverItem({ day, session, order: data._order, position: 'before' });
    }, 0);
  };

  const handleDragOverCard = (e, day, session, order) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const isBottomHalf = e.clientY > rect.top + rect.height / 2;
    const position = isBottomHalf ? 'after' : 'before';

    if (dragOverSession?.day !== day || dragOverSession?.session !== session) {
      setDragOverSession({ day, session });
    }
    if (dragHoverItem?.day !== day || dragHoverItem?.session !== session || dragHoverItem?.order !== order || dragHoverItem?.position !== position) {
      setDragHoverItem({ day, session, order, position });
    }
  };

  const handleDragOver = (e, day, session) => {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem) return;
    
    if (dragHoverItem && (dragHoverItem.day !== day || dragHoverItem.session !== session)) {
      setDragHoverItem(null);
    }

    if (dragOverSession?.day !== day || dragOverSession?.session !== session) {
      setDragOverSession({ day, session });
    }
  };

  const handleDrop = (e, targetDay, targetSession) => {
    e.preventDefault();
    e.stopPropagation();
    
    const insertAtOrder = dragHoverItem ? dragHoverItem.order : Infinity;

    setDragOverSession(null);
    setDragHoverItem(null);

    if (!draggedItem) return;

    setDailyPlans(prev => {
      const next = prev.map(d => ({ ...d })); 
      
      const sourceDayObj = next.find(d => d.day === draggedItem.day);
      const targetDayObj = next.find(d => d.day === targetDay);
      if (!sourceDayObj || !targetDayObj) return prev;

      if (draggedItem.day === targetDay && draggedItem.session === targetSession) {
        // Reordering within the same session
        const sessData = { ...targetDayObj[targetSession] };
        let items = getSortedItems(sessData);
        
        const draggedIdx = items.findIndex(i => i.subType === draggedItem.subType && i.index === draggedItem.index);
        if (draggedIdx === -1) return prev;
        
        const [removed] = items.splice(draggedIdx, 1);
        
        let insertIdx = items.length;
        if (insertAtOrder !== Infinity) {
          if (insertAtOrder === draggedItem.data._order) {
            insertIdx = draggedIdx;
          } else {
            const hoverIdx = items.findIndex(i => i.act._order === insertAtOrder);
            if (hoverIdx !== -1) {
              insertIdx = dragHoverItem.position === 'after' ? hoverIdx + 1 : hoverIdx;
            }
          }
        }
        
        items.splice(insertIdx, 0, removed);
        items.forEach((item, idx) => { item.act._order = idx; });
        
        targetDayObj[targetSession] = recalculateSessionTimes(sessData, targetSession);
      } else {
        // Moving across sessions
        const sourceSession = { ...sourceDayObj[draggedItem.session] };
        if (draggedItem.subType === 'food') sourceSession.food = null;
        else if (draggedItem.subType === 'tour') sourceSession.tour = null;
        else if (draggedItem.subType === 'extras' && sourceSession.extras) {
          sourceSession.extras = sourceSession.extras.filter((_, i) => i !== draggedItem.index);
        }
        sourceDayObj[draggedItem.session] = recalculateSessionTimes(sourceSession, draggedItem.session);

        const targetSessionData = { ...targetDayObj[targetSession] };
        targetSessionData.extras = targetSessionData.extras ? [...targetSessionData.extras] : [];
        targetSessionData.extras.push(draggedItem.data);
        
        let targetItems = getSortedItems(targetSessionData);
        const newItemWrapperIdx = targetItems.findIndex(i => i.act === draggedItem.data);
        const [removedWrapper] = targetItems.splice(newItemWrapperIdx, 1);

        let insertIdx = targetItems.length;
        if (insertAtOrder !== Infinity) {
          const hoverIdx = targetItems.findIndex(i => i.act._order === insertAtOrder);
          if (hoverIdx !== -1) {
            insertIdx = dragHoverItem.position === 'after' ? hoverIdx + 1 : hoverIdx;
          }
        }
        
        targetItems.splice(insertIdx, 0, removedWrapper);
        targetItems.forEach((item, idx) => { item.act._order = idx; });

        targetDayObj[targetSession] = recalculateSessionTimes(targetSessionData, targetSession);
        sourceDayObj[draggedItem.session] = recalculateSessionTimes(sourceSession, draggedItem.session);
        Object.assign(sourceDayObj, recalculateDay(sourceDayObj));
        Object.assign(targetDayObj, recalculateDay(targetDayObj));
      }

      if (onPlanChange) onPlanChange(next);
      return next;
    });

    setDraggedItem(null);
  };

  // 💾 Trạng thái lưu lịch trình — đồng bộ nút trong và ngoài action panel
  const [scheduleSaved,      setScheduleSaved]      = useState(false);
  const [scheduleSaveLoading, setScheduleSaveLoading] = useState(false);

  const handleSaveDuration = (newDuration, newStartTime = null) => {
    if (!durationEdit) return;
    const { day, session, key, index } = durationEdit;
    
    let parsedStartMins = undefined;
    if (newStartTime) {
       const [h, m] = newStartTime.split(':').map(Number);
       if (!isNaN(h) && !isNaN(m)) parsedStartMins = h * 60 + m;
    }
    
    setDailyPlans(prev => {
      const next = prev.map(d => {
        if (d.day === day) {
          const sessionData = { ...d[session] };
          
          const applyCustom = (act) => {
            const updated = { ...act, userDurationMins: newDuration };
            if (parsedStartMins !== undefined) updated.userStartTimeMins = parsedStartMins;
            return updated;
          };
          
          if (key === 'food') {
            sessionData.food = applyCustom(sessionData.food);
          } else if (key === 'tour') {
            sessionData.tour = applyCustom(sessionData.tour);
          } else if (key === 'extras' && sessionData.extras) {
            sessionData.extras = sessionData.extras.map((ex, i) => i === index ? applyCustom(ex) : ex);
          }
          
          return recalculateDay({ ...d, [session]: sessionData });
        }
        return d;
      });
      if (onPlanChange) onPlanChange(next);
      return next;
    });
    setDurationEdit(null);
    setCustomDuration('');
    setCustomStartTime('');
  };

  const handleSaveSchedule = async () => {
    if (scheduleSaveLoading || scheduleSaved) return;
    setScheduleSaveLoading(true);
    try {
      if (onSave) await onSave();
      setScheduleSaved(true);
    } catch (_) {}
    finally { setScheduleSaveLoading(false); }
  };

  useEffect(() => {
    const forceRefreshGlobalCache = (cache, apiPath, dataKey) => {
      fetch(`${BASE_URL}${apiPath}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          const items = d[dataKey] || [];
          cache.set.clear(); // Xóa sạch dữ liệu cũ lưu trong RAM
          items.forEach(item => {
            if (item.name) cache.set.add(_cacheKey(item.name, item.location || '')); // Nạp dữ liệu mới nhất từ file JSON/DB vào
          });
          cache.ready = true;
          cache.listeners.forEach(fn => fn()); // Kích hoạt lệnh render lại đồng loạt cho toàn bộ thẻ Card trên màn hình
        })
        .catch(err => console.error("Lỗi làm tươi bộ nhớ Cache:", err));
    };

    // Gọi lệnh làm mới bộ chứa Yêu thích và Lưu trữ
    forceRefreshGlobalCache(_favCache, '/api/favorites', 'favorites');
    forceRefreshGlobalCache(_spCache, '/api/saved-places', 'savedPlaces');
  }, [initialData]);

  // 🌤️ Weather data — lift lên đây để chia sẻ với từng ngày
  const [weatherData, setWeatherData] = useState(null);
  useEffect(() => {
    if (!initialData.location) return;
    fetchWeather(initialData.location, initialData.departure_date).then(data => setWeatherData(data));
  }, [initialData.location, initialData.departure_date]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🧋 State nút Tham Khảo Đồ Uống
  const [drinksOpen, setDrinksOpen] = useState(false);
  // 🍜 State nút Tham Khảo Đặc Sản
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);

  // 🔝 Back to top
  const [showBackTop, setShowBackTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 🚀 Prefetch đồ uống + đặc sản ngay khi mount (chạy ngầm, không block UI)
  useEffect(() => {
    const loc = initialData.location;
    if (!loc) return;

    const prefetch = (cacheKey, type) => {
      if (panelCache[cacheKey]) return; // đã có cache rồi, bỏ qua
      fetch(`${BASE_URL}/api/activities?location=${encodeURIComponent(loc)}&type=${encodeURIComponent(type)}`)
        .then(r => r.json())
        .then(d => { const r = d.results || []; if (r.length > 0) panelCache[cacheKey] = r; })
        .catch(() => {}); // im lặng nếu lỗi, panel sẽ tự retry khi mở
    };

    // Delay nhẹ để không tranh băng thông với các fetch chính
    const timer = setTimeout(() => {
      prefetch(`drinks:${loc}`, 'Quán cà phê đồ uống');
      prefetch(`specialties:${loc}`, 'Đặc sản địa phương món ăn truyền thống');
    }, 1500);

    return () => clearTimeout(timer);
  }, [initialData.location]); // eslint-disable-line react-hooks/exhaustive-deps

  const passengers = initialData.passengers || 1;

  const realHotels = (initialData.realHotels || []).map(h => ({
    name: h.name, rating: h.rating,
    price: h.price_per_night != null ? h.price_per_night.toLocaleString() + "đ/đêm" : "Liên hệ",
    price_per_night: h.price_per_night,
    thumbnail: h.thumbnail,
    desc: h.desc || "Lựa chọn tốt nhất dựa trên ngân sách.",
    lat: h.lat, lng: h.lng, place_id: h.place_id || "", room_type: h.room_type,
  }));

  const realTours = (initialData.realTours || []).map(i => normalizeActivity(i, 'tour'));
  const realFoods = (initialData.realFoods || []).map(i => normalizeActivity(i, 'food'));

  const realFlights = (initialData.realFlights || initialData.flights || []).filter(f => f.airline && f.price);

  const hotelsPool = realHotels.length > 0 ? realHotels : mockRepo['Khách sạn'];
  const toursPool  = realTours.length  > 0 ? realTours  : mockRepo['Điểm tham quan'];
  const foodsPool  = realFoods.length  > 0 ? realFoods  : mockRepo['Địa điểm ăn uống'];

  const [currentHotel, setCurrentHotel] = useState(hotelsPool[0]);

  // Khi realHotels load xong (async) → cập nhật currentHotel + mapQuery luôn
  useEffect(() => {
    if (realHotels.length > 0) {
      setCurrentHotel(prev => {
        // Chỉ reset nếu hotel hiện tại là mock (không có lat/lng thật)
        const isMock = !prev?.lat && !prev?.lng;
        if (isMock) {
          setMapQuery(`${realHotels[0].name} ${initialData.location}`);
          return realHotels[0];
        }
        return prev;
      });
    }
  }, [initialData.realHotels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let plans = [];
    if (initialData.itinerary && initialData.itinerary.length > 0) {
      // Đồng bộ lịch trình từ AI Backend
      plans = initialData.itinerary.map(dayObj => {
        const slots = dayObj.slots || [];
        const getSlotItem = (slotName, type) => {
          const slot = slots.find(s => s.slot === slotName);
          if (!slot) return null;
          const item = slot.items.find(i => i.item_type === type);
          return item ? normalizeActivity(item, type) : null;
        };

        const mFood = getSlotItem('🌅 Buổi sáng', 'food');
        const mTour = getSlotItem('🌅 Buổi sáng', 'tour');
        const aFood = getSlotItem('☀️ Buổi chiều', 'food');
        const aTour = getSlotItem('☀️ Buổi chiều', 'tour');
        const eFood = getSlotItem('🌙 Buổi tối', 'food');
        const eTour = getSlotItem('🌙 Buổi tối', 'tour');

        return {
          day: dayObj.day,
          morning: {
            food: mFood ? { ...mFood, timeLabel: '07:30 - 08:30' } : null,
            tour: mTour ? { ...mTour, timeLabel: '09:00 - 11:30' } : null
          },
          afternoon: {
            food: aFood ? { ...aFood, timeLabel: '12:00 - 13:30' } : null,
            tour: aTour ? { ...aTour, timeLabel: '14:00 - 16:30' } : null
          },
          evening: {
            food: eFood ? { ...eFood, timeLabel: '18:30 - 20:00' } : null,
            tour: eTour ? { ...eTour, timeLabel: '20:30 - 22:00' } : null
          }
        };
      });
    } else {
      // Fallback khi không có itinerary (e.g. mock data)
      for (let i = 0; i < numDays; i++) {
        plans.push({
          day: i + 1,
          morning:   { 
            food: { ...foodsPool[(i*3)   % foodsPool.length], timeLabel: '07:30 - 08:30' },
            tour: { ...toursPool[(i*3)   % toursPool.length], timeLabel: '09:00 - 11:30' }
          },
          afternoon: { 
            food: { ...foodsPool[(i*3+1) % foodsPool.length], timeLabel: '12:00 - 13:30' },
            tour: { ...toursPool[(i*3+1) % toursPool.length], timeLabel: '14:00 - 16:30' }
          },
          evening:   { 
            food: { ...foodsPool[(i*3+2) % foodsPool.length], timeLabel: '18:30 - 20:00' },
            tour: { ...toursPool[(i*3+2) % toursPool.length], timeLabel: '20:30 - 22:00' }
          },
        });
      }
    }
    setDailyPlans(plans);
    if (onPlanChange) onPlanChange(plans);
    setMapQuery(`${currentHotel.name} ${initialData.location}`);
  }, [initialData.location, numDays, initialData.itinerary]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dailyPlans.length) return;
    const coordMap = {};
    [...(initialData.realTours || []), ...(initialData.realFoods || [])].forEach(p => {
      if (p.lat && p.lng) coordMap[p.name] = { lat: p.lat, lng: p.lng };
    });
    if (!Object.keys(coordMap).length) return;
    setDailyPlans(prev => {
      const updated = prev.map(d => ({
        ...d,
        morning:   { tour: d.morning.tour ? { ...d.morning.tour,   ...(coordMap[d.morning.tour?.name]   || {}) } : null, food: d.morning.food ? { ...d.morning.food,   ...(coordMap[d.morning.food?.name]   || {}) } : null },
        afternoon: { tour: d.afternoon.tour ? { ...d.afternoon.tour, ...(coordMap[d.afternoon.tour?.name] || {}) } : null, food: d.afternoon.food ? { ...d.afternoon.food, ...(coordMap[d.afternoon.food?.name] || {}) } : null },
        evening:   { tour: d.evening.tour ? { ...d.evening.tour,   ...(coordMap[d.evening.tour?.name]   || {}) } : null, food: d.evening.food ? { ...d.evening.food,   ...(coordMap[d.evening.food?.name]   || {}) } : null },
      }));
      if (onPlanChange) onPlanChange(updated);
      return updated;
    });
  }, [initialData.realTours, initialData.realFoods]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lấy giá dự đoán từ AI cho các địa điểm chưa có giá
  const aiPriceFetched = useRef(false);
  useEffect(() => {
    if (!dailyPlans.length || aiPriceFetched.current) return;

    const missingPricePlaces = new Set();
    dailyPlans.forEach(d => {
      ['morning', 'afternoon', 'evening'].forEach(session => {
        ['food', 'tour'].forEach(type => {
          const item = d[session]?.[type];
          if (item && (item.price === "Giá tùy chọn" || item.price === "Giá tuỳ chọn" || item.price === "✨ Đang ước tính...")) {
            missingPricePlaces.add(item.name);
          }
        });
      });
    });

    if (missingPricePlaces.size === 0) return;
    aiPriceFetched.current = true;

    const names = Array.from(missingPricePlaces);
    const prompt = `Bạn là chuyên gia du lịch. Hãy ước tính chi phí trung bình 1 người (VND) khi đến các địa điểm sau ở ${initialData.location || 'Việt Nam'}. Đưa ra mức giá chi tiết, thực tế và không làm tròn quá chẵn (VD: 35.000đ, 120.000đ, 210.000đ thay vì 100k hay 150k). Với các điểm tham quan miễn phí (chùa, di tích công cộng...), hãy ghi "0đ". Trả về ĐÚNG định dạng JSON (VD: {"Tên địa điểm": "120.000đ"}). KHÔNG thêm text giải thích.\nDanh sách: ${names.join(', ')}`;

    fetch(`${BASE_URL}/api/chat-gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, location: initialData.location || 'Việt Nam' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        try {
          const jsonMatch = data.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const pricesMap = JSON.parse(jsonMatch[0]);
            setDailyPlans(prev => {
              const updated = prev.map(d => {
                const newD = { ...d };
                ['morning', 'afternoon', 'evening'].forEach(session => {
                  newD[session] = { ...d[session] };
                  ['food', 'tour'].forEach(type => {
                    const item = newD[session][type];
                    if (item && pricesMap[item.name]) {
                       let rawVal = String(pricesMap[item.name]).replace(/đ/gi, '').trim();
                       let finalPrice = (rawVal === '0' || rawVal.toLowerCase() === 'miễn phí') ? 'Miễn phí' : rawVal + 'đ/người';
                       newD[session][type] = { ...item, price: finalPrice };
                    }
                  });
                });
                return newD;
              });
              if (onPlanChange) onPlanChange(updated);
              return updated;
            });
          }
        } catch (e) {
          console.error("Lỗi parse JSON giá AI:", e);
        }
      }
    })
    .catch(err => {
      console.error("Lỗi API Gemini ước tính giá:", err);
    })
    .finally(() => {
      // Dọn dẹp: Nếu cái nào còn treo "✨ Đang ước tính..." thì fallback về 100k
      setDailyPlans(prev => {
        let changed = false;
        const updated = prev.map(d => {
          const newD = { ...d };
          ['morning', 'afternoon', 'evening'].forEach(session => {
            newD[session] = { ...d[session] };
            ['food', 'tour'].forEach(type => {
              const item = newD[session][type];
              if (item && item.price === "✨ Đang ước tính...") {
                let fallbackPrice = '100.000đ/người';
                if (type === 'tour') {
                  fallbackPrice = 'Miễn phí - 50.000đ/người';
                } else if (type === 'food') {
                  fallbackPrice = '30.000đ - 100.000đ/người';
                }
                newD[session][type] = { ...item, price: fallbackPrice };
                changed = true;
              }
            });
          });
          return newD;
        });
        if (changed && onPlanChange) onPlanChange(updated);
        return changed ? updated : prev;
      });
    });
  }, [dailyPlans.length, initialData.location]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShowMap = (query, placeName, placeId = '', lat = null, lng = null) => setMapModal({ show: true, query, placeName, placeId, lat, lng });

  const handleUpdate = (newVal) => {
    if (modal.type === 'Khách sạn') {
      setCurrentHotel(newVal);
      window.dispatchEvent(new CustomEvent('sTripHotelChanged', { detail: newVal }));
      setMapQuery(`${newVal.name} ${initialData.location}`);
    } else {
      setDailyPlans(prev => {
        const next = prev.map(d => d.day === modal.day
          ? { ...d, [modal.session]: { ...d[modal.session], [modal.subType]: newVal } }
          : d);
        if (onPlanChange) onPlanChange(next);
        return next;
      });
    }
    setModal({ show: false, type: '', day: null, session: '', subType: '' });
  };

  useEffect(() => {
    if (!addModal.show || !addModal.query.trim()) {
      setAddModal(prev => ({ ...prev, results: [], loading: false }));
      return;
    }
    const delay = setTimeout(async () => {
      setAddModal(prev => ({ ...prev, loading: true }));
      try {
        const data = await fetchAutocomplete(addModal.query);
        setAddModal(prev => ({ ...prev, results: data || [], loading: false }));
      } catch (e) {
        setAddModal(prev => ({ ...prev, results: [], loading: false }));
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [addModal.query, addModal.show]);

  useEffect(() => {
    if (addModal.show || modal.show) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [addModal.show, modal.show]);


  const handleSelectAddActivity = (placeName) => {
    if (!placeName.trim()) return;
    setAddModal(prev => ({ ...prev, selectedPlace: placeName }));
  };

  const recalculateSessionTimes = (sessionData, sessionType, minStartMins = null) => {
    const items = [];
    if (sessionData.food) items.push({ key: 'food', act: sessionData.food });
    if (sessionData.tour) items.push({ key: 'tour', act: sessionData.tour });
    if (sessionData.extras) sessionData.extras.forEach((ex, i) => items.push({ key: 'extras', index: i, act: ex }));

    if (items.length === 0) return sessionData;

    // Ensure all items have an _order property
    items.forEach((item, idx) => {
      if (typeof item.act._order !== 'number') item.act._order = idx;
    });

    // Sort by _order
    items.sort((a, b) => a.act._order - b.act._order);

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const parts = timeStr.split('-');
      if (parts.length !== 2) return null;
      const parseHHMM = (str) => {
        const [h, m] = str.trim().split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
      };
      const start = parseHHMM(parts[0]);
      const end = parseHHMM(parts[1]);
      if (start === null || end === null) return null;
      return { start, end, duration: end - start };
    };

    let sessionStartMins = Infinity;
    items.forEach(item => {
      const t = parseTime(item.act.time);
      if (t) {
        if (sessionType === 'morning' && t.start >= 7 * 60 && t.start <= 11 * 60) sessionStartMins = Math.min(sessionStartMins, t.start);
        if (sessionType === 'afternoon' && t.start >= 13 * 60 && t.start <= 17 * 60) sessionStartMins = Math.min(sessionStartMins, t.start);
        if (sessionType === 'evening' && t.start >= 18 * 60 && t.start <= 23 * 60) sessionStartMins = Math.min(sessionStartMins, t.start);
      }
      
      let duration = t && t.duration > 0 ? t.duration : 120;
      if (item.act.userDurationMins) {
        duration = item.act.userDurationMins;
      } else if (item.key === 'food' || item.act.type === 'food' || item.subType === 'food') {
        duration = 60; // Food is strictly 1 hour
      } else if (duration > 180) {
        duration = 120; // Cap corrupted durations
      }
      item.duration = duration;
    });

    // Enforce stricter default starts if it was messed up by bugs
    if (sessionStartMins === Infinity || sessionStartMins > 24 * 60) {
      if (sessionType === 'morning') sessionStartMins = 7 * 60 + 30; // 07:30
      else if (sessionType === 'afternoon') sessionStartMins = 13 * 60 + 30; // 13:30
      else sessionStartMins = 18 * 60 + 30; // 18:30
    }

    if (minStartMins !== null && minStartMins > sessionStartMins) {
      sessionStartMins = minStartMins;
    }

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    let currentStart = sessionStartMins;
    const applyTime = (item, isLast, isFirst) => {
      if (item.act.userStartTimeMins) {
        if (isFirst) currentStart = Math.max(sessionStartMins, item.act.userStartTimeMins);
        else currentStart = Math.max(currentStart, item.act.userStartTimeMins);
      }
      const startStr = formatTime(currentStart);
      currentStart += item.duration;
      const endStr = formatTime(currentStart);
      if (!isLast) currentStart += (items.length >= 3 ? 15 : 30); // Giảm thời gian di chuyển nếu có nhiều địa điểm
      return { ...item.act, timeLabel: `${startStr} - ${endStr}`, time: `${startStr} - ${endStr}` };
    };

    const newData = { ...sessionData, extras: sessionData.extras ? [...sessionData.extras] : [] };
    items.forEach((item, finalIndex) => {
      const isLast = finalIndex === items.length - 1;
      const isFirst = finalIndex === 0;
      const updatedAct = applyTime(item, isLast, isFirst);
      updatedAct._order = finalIndex; // Normalize order 0, 1, 2...
      if (item.key === 'food') newData.food = updatedAct;
      else if (item.key === 'tour') newData.tour = updatedAct;
      else newData.extras[item.index] = updatedAct;
    });

    return newData;
  };

  const getSessionEndMins = (sessionData) => {
    if (!sessionData) return null;
    const items = [];
    if (sessionData.food) items.push(sessionData.food);
    if (sessionData.tour) items.push(sessionData.tour);
    if (sessionData.extras) items.push(...sessionData.extras);
    if (items.length === 0) return null;
    
    let maxEnd = 0;
    items.forEach(act => {
      if (!act.time) return;
      const parts = act.time.split('-');
      if (parts.length === 2) {
        const [h, m] = parts[1].trim().split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) maxEnd = Math.max(maxEnd, h * 60 + m);
      }
    });
    return maxEnd;
  };

  const recalculateDay = (dayObj) => {
    const newDay = { ...dayObj };
    newDay.morning = recalculateSessionTimes(newDay.morning, 'morning', null);
    let end = getSessionEndMins(newDay.morning);
    newDay.afternoon = recalculateSessionTimes(newDay.afternoon, 'afternoon', end !== null ? end + 15 : null);
    end = getSessionEndMins(newDay.afternoon);
    newDay.evening = recalculateSessionTimes(newDay.evening, 'evening', end !== null ? end + 15 : null);
    return newDay;
  };

  const checkDuplicatePlace = (placeName) => {
    let duplicateInfo = null;
    dailyPlans.forEach(d => {
      ['morning', 'afternoon', 'evening'].forEach(sess => {
        const sd = d[sess];
        if (!sd) return;
        const check = (act) => act && act.name && act.name.toLowerCase() === placeName.toLowerCase();
        if (check(sd.food) || check(sd.tour) || (sd.extras && sd.extras.some(check))) {
          duplicateInfo = `Ngày ${d.day}, Buổi ${sess === 'morning' ? 'sáng' : sess === 'afternoon' ? 'chiều' : 'tối'}`;
        }
      });
    });
    return duplicateInfo;
  };

  useEffect(() => {
    const handleAIUpdate = async (e) => {
      const { day, session, place } = e.detail;
      
      const placeholderActivity = { name: place, desc: 'Đang tải thông tin từ AI...', price: 'Đang tải...', time: 'Tùy chọn' };
      
      setDailyPlans(prev => {
        const next = prev.map(d => {
          if (d.day === day) {
            const sessionData = { ...d[session] };
            if (sessionData.tour) {
               sessionData.tour = placeholderActivity;
            } else if (sessionData.food) {
               sessionData.food = placeholderActivity;
            } else {
               if (!sessionData.extras) sessionData.extras = [];
               sessionData.extras = [...sessionData.extras, placeholderActivity];
            }
            return recalculateDay({ ...d, [session]: sessionData });
          }
          return d;
        });
        if (onPlanChange) onPlanChange(next);
        return next;
      });

      try {
        const details = await fetchPlaceDetails(place, initialData.location);
        if (details) {
          setDailyPlans(prev => {
            const next = prev.map(d => {
              if (d.day === day) {
                const sessionData = { ...d[session] };
                if (sessionData.tour && sessionData.tour.name === place) {
                   sessionData.tour = details;
                } else if (sessionData.food && sessionData.food.name === place) {
                   sessionData.food = details;
                } else if (sessionData.extras) {
                   const idx = sessionData.extras.findIndex(x => x.name === place);
                   if (idx !== -1) sessionData.extras[idx] = details;
                }
                return recalculateDay({ ...d, [session]: sessionData });
              }
              return d;
            });
            if (onPlanChange) onPlanChange(next);
            return next;
          });
        } else {
          setDailyPlans(prev => {
            const next = prev.map(d => {
              if (d.day === day) {
                const sessionData = { ...d[session] };
                const fallbackActivity = { name: place, desc: 'Địa điểm được Trợ lý AI thêm vào', price: 'Tùy chọn', time: 'Tùy chọn' };
                if (sessionData.tour && sessionData.tour.name === place) {
                   sessionData.tour = fallbackActivity;
                } else if (sessionData.food && sessionData.food.name === place) {
                   sessionData.food = fallbackActivity;
                } else if (sessionData.extras) {
                   const idx = sessionData.extras.findIndex(x => x.name === place);
                   if (idx !== -1) sessionData.extras[idx] = fallbackActivity;
                }
                return recalculateDay({ ...d, [session]: sessionData });
              }
              return d;
            });
            if (onPlanChange) onPlanChange(next);
            return next;
          });
        }
      } catch (e) {
        console.error("AI fetch place error", e);
      }
    };
    window.addEventListener('AI_UPDATE_SCHEDULE', handleAIUpdate);
    return () => window.removeEventListener('AI_UPDATE_SCHEDULE', handleAIUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPlanChange, dailyPlans, initialData.location]);


  const handleConfirmAddActivity = async () => {
    const { day, session, selectedPlace, replaceTarget } = addModal;
    
    // Hiển thị trạng thái đang tải (dùng chung state loading của addModal)
    setAddModal(prev => ({ ...prev, loading: true }));
    
    let newActivity = null;
    try {
      // Gọi API lấy thông tin chi tiết địa điểm (ảnh, giá, lat, lng,...)
      const details = await fetchPlaceDetails(selectedPlace, initialData.location);
      if (details) {
         newActivity = details;
      } else {
         newActivity = { name: selectedPlace, desc: 'Địa điểm do bạn thêm vào', price: 'Tùy chọn', time: 'Tùy chọn' };
      }
    } catch (e) {
      newActivity = { name: selectedPlace, desc: 'Địa điểm do bạn thêm vào', price: 'Tùy chọn', time: 'Tùy chọn' };
    }

    setDailyPlans(prev => {
      const next = prev.map(d => {
        if (d.day === day) {
          const sessionData = { ...d[session] };
          
          if (replaceTarget === 'food') {
             sessionData.food = newActivity;
          } else if (replaceTarget === 'tour') {
             sessionData.tour = newActivity;
          } else {
             if (!sessionData.extras) sessionData.extras = [];
             sessionData.extras = [...sessionData.extras, newActivity];
          }
          return recalculateDay({ ...d, [session]: sessionData });
        }
        return d;
      });
      if (onPlanChange) onPlanChange(next);
      return next;
    });
    
    setAddModal(prev => ({ ...prev, loading: false }));
    closeAddModal();
  };

  const handleRemoveExtraActivity = (day, session, idx) => {
    setDailyPlans(prev => {
      const next = prev.map(d => {
        if (d.day === day) {
          const sessionData = { ...d[session] };
          if (sessionData.extras) {
            sessionData.extras = sessionData.extras.filter((_, i) => i !== idx);
          }
          return recalculateDay({ ...d, [session]: sessionData });
        }
        return d;
      });
      if (onPlanChange) onPlanChange(next);
      return next;
    });
  };


  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes expandDown {
          from { height: 0; opacity: 0; margin: 0; border-width: 0; }
          to { height: 110px; opacity: 1; margin: 0; border-width: 2px; }
        }
        @keyframes spinSlowly {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .mdigi-drum {
          position: absolute;
          top: -1040px; /* Tâm trống dịch lên đúng 40px bằng với padding của section để chia làm 2 mảnh hoàn hảo */
          left: 50%;
          width: 2000px;
          height: 2000px;
          background-image: url('${drumDataUrl || '/hoa-tiet-trong-dong.jpg'}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          /* Tinh chỉnh opacity cho Light mode (xám nhạt) và Dark mode */
          opacity: ${isDark ? 0.3 : 0.25};
          pointer-events: none;
          z-index: -1; /* Đưa trống đồng ra phía sau các thẻ nội dung */
          animation: spinSlowly 240s linear infinite;
          
          /* Nới rộng tâm mask để không bị cắt xén (40% rõ, 70% mờ dần) */
          mask-image: radial-gradient(circle at center, black 40%, transparent 70%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 70%);
          
          /* Lưu ý: mix-blend-mode và filter đã được gỡ bỏ vì ảnh đã được process thành PNG trong suốt bằng JS ở trên, giúp html2canvas chụp hoàn hảo! */
        }
        @keyframes spinSlowly {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .mdigi-drum { width: 1400px; height: 1400px; top: -740px; }
        }
        @media (max-width: 768px) {
          .mdigi-drum { width: 900px; height: 900px; top: -466px; opacity: ${isDark ? 0.15 : 0.03}; }
        }
      `}</style>

      {/* TRỐNG ĐỒNG XOAY 360 & MỜ DẦN (MDigi Style) */}
      
    <BudgetDashboard 
      initialData={initialData} 
      currentHotel={currentHotel} 
      dailyPlans={dailyPlans} 
      numDays={numDays} 
      isDark={isDark} 
    />
    
    {/* (Background họa tiết trống đồng mờ dần xoay vòng đã được thiết kế lại) */}
    
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', marginTop: isGlassMode ? '-40px' : '0', position: 'relative', zIndex: 2 }} className="ais-root">
      <style>{`
        /* Làm trong suốt nền của phần Destination để lộ mặt trống đồng */
        #featured-section > div {
          background-color: transparent !important;
        }
        /* ═══════════════════════════════════════
           📱 AiSchedule — Mobile responsive
        ═══════════════════════════════════════ */
        @media (max-width: 768px) {
          .ais-root { padding: 16px !important; }

          /* Header title */
          .ais-root h1 { font-size: 32px !important; }
          .ais-root > div > h1 { font-size: 32px !important; }

          /* Transport grid: auto-fit minmax(380px) → 1 col */
          .ais-transport-grid {
            grid-template-columns: 1fr !important;
          }

          /* Flight grid: 1fr 1fr → 1 col */
          .ais-flight-grid {
            grid-template-columns: 1fr !important;
          }

          /* Hotel section */
          .ais-hotel-wrap {
            padding: 16px !important;
            border-radius: 24px !important;
          }
          .ais-hotel-map {
            height: 260px !important;
            border-radius: 18px !important;
          }

          /* Session cards row → stack vertically */
          .ais-session-row {
            flex-direction: column !important;
            gap: 14px !important;
          }

          /* Day block */
          .ais-day-block {
            padding: 20px 16px !important;
            border-radius: 24px !important;
            margin-top: 20px !important;
          }

          /* Drink / specialty buttons row */
          .ais-panel-btns {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: stretch !important;
          }
          .ais-panel-btns button {
            max-width: 100% !important;
            font-size: 16px !important;
            padding: 16px 24px !important;
          }

          /* Big title */
          .ais-big-title { font-size: 24px !important; }

          /* Sub-title (phương tiện) */
          .ais-section-title { font-size: 22px !important; }

          /* ── Weather widget mobile ── */
          .weather-header {
            padding: 16px !important;
            gap: 10px !important;
            flex-wrap: nowrap !important;
          }
          .weather-icon-main { font-size: 36px !important; }
          .weather-temp { font-size: 26px !important; }
          .weather-label { font-size: 9px !important; }
          .weather-cond { font-size: 11px !important; }
          .weather-stats {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            flex: 0 0 auto !important;
            gap: 6px !important;
          }
          .weather-stats > div {
            padding: 6px 8px !important;
            min-width: unset !important;
            max-width: unset !important;
            border-radius: 10px !important;
          }
          .weather-stats > div > div:first-child { font-size: 9px !important; }
          .weather-stats > div > div:last-child { font-size: 12px !important; }
        }

        @media (max-width: 480px) {
          .ais-root { padding: 12px !important; }
          .ais-root h1 { font-size: 26px !important; }
          .ais-hotel-map { height: 200px !important; }

          /* Weather on very small screens */
          .weather-header { padding: 12px !important; gap: 6px !important; flex-wrap: nowrap !important; }
          .weather-icon-main { font-size: 28px !important; }
          .weather-temp { font-size: 20px !important; }
          .weather-stats { gap: 4px !important; }
          .weather-stats > div {
            padding: 4px 5px !important;
            min-width: unset !important;
          }
          .weather-stats > div > div:first-child { font-size: 8px !important; }
          .weather-stats > div > div:last-child { font-size: 11px !important; }
        }
      `}</style>

      {/* 🗺️ MAP MODAL */}
      {mapModal.show && (
        <MapModal placeName={mapModal.placeName} query={mapModal.query} placeId={mapModal.placeId} lat={mapModal.lat} lng={mapModal.lng} onClose={() => setMapModal({ show: false, query: '', placeName: '', placeId: '', lat: null, lng: null })} />
      )}

      {/* 🧋 DRINKS PANEL */}
      {drinksOpen && (
        <DrinksPanel
          location={initialData.location}
          isOpen={drinksOpen}
          onClose={() => setDrinksOpen(false)}
          isDark={isDark}
        />
      )}

      {/* 🍜 SPECIALTIES PANEL */}
      {specialtiesOpen && (
        <SpecialtiesPanel
          location={initialData.location}
          isOpen={specialtiesOpen}
          onClose={() => setSpecialtiesOpen(false)}
          isDark={isDark}
        />
      )}

      {/* MODAL THÊM ĐỊA ĐIỂM */}
      {addModal.show && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} onClick={closeAddModal}>
          <div
            style={{ backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: '35px', width: '550px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 30px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '900', color: isDark ? '#f8fafc' : '#111827' }}>
                📍 Thêm địa điểm vào {addModal.session === 'morning' ? 'Buổi sáng' : addModal.session === 'afternoon' ? 'Buổi chiều' : 'Buổi tối'}
              </div>
              <FontAwesomeIcon icon={faXmark} style={{ cursor: 'pointer', fontSize: '24px', color: '#9ca3af' }} onClick={closeAddModal} />
            </div>
            
            <div style={{ padding: '24px 30px', flex: 1, overflowY: 'auto' }}>
              {!addModal.selectedPlace ? (
                <>
                  <input
                    autoFocus
                    value={addModal.query}
                    onChange={e => setAddModal(prev => ({ ...prev, query: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSelectAddActivity(addModal.query);
                    }}
                    placeholder="Nhập tên địa điểm..."
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '16px', border: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
                      fontSize: '16px', outline: 'none', backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? 'white' : 'black', marginBottom: '16px'
                    }}
                  />
                  {addModal.loading && (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                      <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} /> Đang tìm kiếm...
                    </div>
                  )}
                  {!addModal.loading && addModal.results.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {addModal.results.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectAddActivity(r)}
                          style={{ padding: '14px 16px', borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', cursor: 'pointer', fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FontAwesomeIcon icon={faLocationArrow} style={{ marginRight: '10px', color: '#10b981' }} /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                  {!addModal.loading && addModal.query.trim() && addModal.results.length === 0 && (
                    <div
                      style={{ padding: '14px 16px', borderRadius: '12px', border: isDark ? '1px dashed #475569' : '1px dashed #cbd5e1', color: '#64748b', backgroundColor: isDark ? '#0f172a' : '#f8fafc', textAlign: 'center', fontSize: '15px' }}
                    >
                      Không tìm thấy địa điểm phù hợp
                    </div>
                  )}
                </>
              ) : (
                (() => {
                  const d = dailyPlans.find(p => p.day === addModal.day);
                  const sessionData = d ? d[addModal.session] : null;
                  const dupInfo = checkDuplicatePlace(addModal.selectedPlace);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {dupInfo && (
                        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FontAwesomeIcon icon={faTriangleExclamation} />
                          <span><b>Cảnh báo:</b> Địa điểm này đã có trong lịch trình ({dupInfo}). Bạn có chắc chắn muốn thêm?</span>
                        </div>
                      )}
                      <div style={{ fontSize: '16px', color: isDark ? '#f8fafc' : '#111827', fontWeight: '700' }}>
                        Bạn muốn thêm "{addModal.selectedPlace}" vào lịch trình như thế nào?
                      </div>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', border: addModal.replaceTarget === 'new' ? '2px solid #10b981' : (isDark ? '2px solid #334155' : '2px solid #e2e8f0'), backgroundColor: addModal.replaceTarget === 'new' ? (isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5') : 'transparent' }}>
                        <input type="radio" name="replaceTarget" value="new" checked={addModal.replaceTarget === 'new'} onChange={() => setAddModal(prev => ({ ...prev, replaceTarget: 'new' }))} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                        <span style={{ fontSize: '15px', color: isDark ? '#e2e8f0' : '#334155', fontWeight: '600' }}>Thêm thành hoạt động mới (Điểm đến thứ 3)</span>
                      </label>

                      {sessionData?.food && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', border: addModal.replaceTarget === 'food' ? '2px solid #f59e0b' : (isDark ? '2px solid #334155' : '2px solid #e2e8f0'), backgroundColor: addModal.replaceTarget === 'food' ? (isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb') : 'transparent' }}>
                          <input type="radio" name="replaceTarget" value="food" checked={addModal.replaceTarget === 'food'} onChange={() => setAddModal(prev => ({ ...prev, replaceTarget: 'food' }))} style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '15px', color: isDark ? '#e2e8f0' : '#334155', fontWeight: '600' }}>Thay thế Quán ăn</span>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Đang có: {sessionData.food.name}</span>
                          </div>
                        </label>
                      )}

                      {sessionData?.tour && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '12px', border: addModal.replaceTarget === 'tour' ? '2px solid #3b82f6' : (isDark ? '2px solid #334155' : '2px solid #e2e8f0'), backgroundColor: addModal.replaceTarget === 'tour' ? (isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff') : 'transparent' }}>
                          <input type="radio" name="replaceTarget" value="tour" checked={addModal.replaceTarget === 'tour'} onChange={() => setAddModal(prev => ({ ...prev, replaceTarget: 'tour' }))} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '15px', color: isDark ? '#e2e8f0' : '#334155', fontWeight: '600' }}>Thay thế Điểm tham quan</span>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Đang có: {sessionData.tour.name}</span>
                          </div>
                        </label>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                        <button disabled={addModal.loading} onClick={() => setAddModal(prev => ({ ...prev, selectedPlace: null, replaceTarget: 'new' }))} style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontWeight: '700', cursor: addModal.loading ? 'not-allowed' : 'pointer', opacity: addModal.loading ? 0.5 : 1 }}>Quay lại</button>
                        <button disabled={addModal.loading} onClick={handleConfirmAddActivity} style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: '800', cursor: addModal.loading ? 'not-allowed' : 'pointer', opacity: addModal.loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {addModal.loading && <FontAwesomeIcon icon={faSpinner} spin />}
                          {addModal.loading ? 'Đang thêm...' : 'Xác nhận Thêm'}
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ĐỔI LỰA CHỌN */}
      {modal.show && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} onClick={() => setModal({ show: false })}>
          <div
            style={{ backgroundColor: 'white', borderRadius: '35px', width: '550px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header cố định — không scroll */}
            <div style={{ padding: '28px 35px 20px', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0 }}>Chọn {modal.type} tại {initialData.location}</h2>
                <FontAwesomeIcon icon={faXmark} style={{ cursor: 'pointer', fontSize: '24px', color: '#9ca3af' }} onClick={() => setModal({ show: false })} />
              </div>
            </div>
            {/* Body scroll — thanh cuộn nằm trong modal */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 35px 28px' }}>
              {(modal.type === 'Khách sạn' ? hotelsPool : (modal.subType === 'tour' ? toursPool : foodsPool)).map((opt, i) => (
                <div key={i} onClick={() => handleUpdate(opt)} style={{ padding: '16px 18px', borderRadius: '20px', border: '2px solid #f1f5f9', marginBottom: '10px', cursor: 'pointer', display: 'flex', gap: '15px', alignItems: 'center', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <img src={proxyImage(opt.thumbnail) || "https://placehold.co/60x60?text=S-Trip"} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} alt="thumb" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/60x60?text=S-Trip"; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name} · <span style={{ color: '#eab308' }}>{opt.rating}⭐</span></div>
                    <div style={{ color: '#10b981', fontWeight: '700', fontSize: '13px', marginTop: 3 }}>{opt.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HEADER — bọc từ đây đến hết dailyPlans bằng contentRef để chụp ảnh */}
      <div ref={contentRef} id="itinerary-content" data-screenshot="itinerary" className={isGlassMode ? 'glass-mode-active' : ''} style={{ position: 'relative', zIndex: 1, paddingTop: '0.1px' }}>
        
        <div className="mdigi-drum" />
      
      <style>{`

      ${isGlassMode ? `
        /* --- GLASSMORPHISM MODE --- */
        .glass-mode-active {
          position: relative;
          z-index: 1;
          padding: 20px;
          border-radius: 40px;
        }
        /* Animated Gradient Background */
        /* Global Glassmorphism Background */
        body {
          background: ${isDark ? 'linear-gradient(135deg, #020617, #1e1b4b, #0f172a, #064e3b)' : 'linear-gradient(135deg, #fbcfe8, #bfdbfe, #e9d5ff, #a7f3d0)'} !important;
          background-size: 400% 400% !important;
          animation: glassGradient 4s ease infinite !important;
          background-attachment: fixed !important;
        }
        .theme-dark, .theme-light {
          background-color: transparent !important;
        }
          .fd-dest-card {
            background-color: ${isDark ? 'rgba(30, 41, 59, 0.25) !important' : 'rgba(255, 255, 255, 0.3) !important'};
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: ${isDark ? '1px solid rgba(255, 255, 255, 0.1) !important' : '1px solid rgba(255, 255, 255, 0.4) !important'};
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05) !important;
          }
          ` : ''}
          @keyframes glassGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .glass-mode-active .ais-day-block,
          .glass-mode-active .ais-place-card,
          .glass-mode-active .ais-transport-card,
          .glass-mode-active .ais-transport-leg,
          .glass-mode-active .ais-hotel-wrap {
            background-color: ${isDark ? 'rgba(30, 41, 59, 0.2) !important' : 'rgba(255, 255, 255, 0.25) !important'};
            background-image: none !important;
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: ${isDark ? '1px solid rgba(255, 255, 255, 0.1) !important' : '1px solid rgba(255, 255, 255, 0.4) !important'};
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05) !important;
          }
          .glass-mode-active .ais-place-card-img {
            background-color: transparent !important;
          }
          /* Adjust Text Colors for Glass */
          .glass-mode-active .ais-big-title,
          .glass-mode-active h1,
          .glass-mode-active h2,
          .glass-mode-active h3,
          .glass-mode-active .place-name {
            color: ${isDark ? '#ffffff !important' : '#0f172a !important'};
            text-shadow: ${isDark ? '0 2px 10px rgba(0,0,0,0.5)' : 'none'};
          }
          /* Fix spacing */
          .glass-mode-active .ais-day-block {
            margin-bottom: 50px !important;
          }
        `}</style>
      
      {/* Cảnh nền ánh sáng (Aura Edge Glows) bám sát rìa màn hình */}
      {!isGlassMode && isDark && (
        <div style={{
          position: 'absolute',
          top: -100, bottom: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '100vw',
          zIndex: -1,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 70% 30% at top, rgba(14, 165, 233, 0.12) 0%, transparent 100%),
            radial-gradient(ellipse 30% 50% at left 30%, rgba(16, 185, 129, 0.08) 0%, transparent 100%),
            radial-gradient(ellipse 30% 50% at right 70%, rgba(139, 92, 246, 0.08) 0%, transparent 100%)
          `
        }} />
      )}

      <div style={{ textAlign: 'center', marginBottom: '60px', position: 'relative' }}>
        <h1 style={{ fontSize: '80px', fontWeight: '900' }} className="ais-big-title">
          <FontAwesomeIcon icon={faMapLocationDot} style={{ color: '#10b981', marginRight: '18px' }} />
          Hành trình tại <span style={{ color: '#10b981' }}>{initialData.location}</span>
        </h1>
        <p style={{ fontSize: '28px', color: isDark ? '#94a3b8' : '#64748b' }}>Hành trình {numDays} ngày {numDays - 1} đêm của bạn sẵn sàng ✨</p>
        
        {/* Toggle Glassmorphism Button */}
        <button 
          onClick={() => setIsGlassMode(!isGlassMode)}
          style={{
            marginTop: '25px',
            padding: '12px 26px',
            borderRadius: '24px',
            background: isGlassMode ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : (isDark ? '#1e293b' : 'white'),
            color: isGlassMode ? 'white' : (isDark ? '#e2e8f0' : '#475569'),
            border: isGlassMode ? 'none' : (isDark ? '2px solid #334155' : '2px solid #e2e8f0'),
            fontSize: '16px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: isGlassMode ? '0 10px 25px rgba(59, 130, 246, 0.4)' : '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <FontAwesomeIcon icon={faStar} style={{ color: isGlassMode ? '#fbbf24' : '#94a3b8' }} />
          {isGlassMode ? 'Tắt chế độ Kính mờ (Glassmorphism)' : 'Bật chế độ Kính mờ (Glassmorphism)'}
        </button>
      </div>

      {/* 🌤️ THỜI TIẾT */}
      <WeatherWidget location={initialData.location} isDark={isDark} externalData={weatherData} departureDate={initialData.departure_date} />

      {/* 1. PHƯƠNG TIỆN & CHUYẾN BAY ĐỀ XUẤT */}
      {((initialData.transport && initialData.transport.options && initialData.transport.options.length > 0) || realFlights.length > 0) && (
        <div style={{ marginBottom: '55px' }}>
          
          {/* --- PHẦN A: DANH SÁCH PHƯƠNG TIỆN --- */}
          {initialData.transport && initialData.transport.options && initialData.transport.options.length > 0 && (
            <>
              <div style={{ fontSize: '36px', fontWeight: '900', color: isDark ? '#ffffff' : '#111827', marginBottom: '20px' }}>
                🛣️ Phương tiện từ <span style={{color: '#10b981'}}>{initialData.origin || 'Điểm đi'}</span> đến <span style={{color: '#10b981'}}>{initialData.location}</span>
              </div>
              
              {initialData.transport.note && (
                <div style={{ fontSize: '15px', color: isDark ? '#ccfbf1' : '#0f766e', marginBottom: '25px', padding: '14px 20px', background: isDark ? 'rgba(20, 184, 166, 0.15)' : '#ccfbf1', border: isDark ? '1px solid #0d9488' : '1px solid #99f6e4', borderRadius: '14px', display: 'inline-block', fontWeight: '600' }}>
                  💡 {initialData.transport.note}
                </div>
              )}


              

              <style>{`
                .ais-transport-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 25px;
                  margin-bottom: 30px;
                }
                @media (max-width: 768px) {
                  .ais-transport-grid {
                    grid-template-columns: 1fr;
                  }
                  .ais-place-card {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    padding: 0 !important;
                    gap: 0 !important;
                    overflow: hidden;
                  }
                  .ais-place-card-img {
                    width: 100% !important;
                    height: auto !important;
                    aspect-ratio: 4 / 3 !important;
                    border-radius: 0 !important;
                  }
                  .ais-place-card-content {
                    padding: 16px 20px 20px !important;
                  }
                  .ais-place-card-actions {
                    justify-content: flex-start !important;
                    margin-top: 14px !important;
                  }
                  .ais-place-card-actions button {
                    flex: 1;
                    justify-content: center;
                  }
                }
              `}</style>
              <div className="ais-transport-grid">
                {(() => {
                  let opts = [...(initialData.transport?.options || [])];
                  if (realFlights.length === 0) {
                    const flightIdx = opts.findIndex(o => o.recommended && /bay|flight/i.test(o.label || o.type || ''));
                    if (flightIdx !== -1) {
                      opts[flightIdx] = { ...opts[flightIdx], recommended: false };
                      const fallbackIdx = opts.findIndex(o => !(/bay|flight/i.test(o.label || o.type || '')));
                      if (fallbackIdx !== -1) {
                        opts[fallbackIdx] = { ...opts[fallbackIdx], recommended: true };
                      } else if (opts.length > 0) {
                        opts[0] = { ...opts[0], recommended: true };
                      }
                    }
                  }
                  return opts.map((opt, idx) => (
                    <TransportCard 
                      key={idx} 
                      opt={opt} 
                      isCombined={opt.type === 'combined'} 
                      isDark={isDark} 
                      noTickets={realFlights.length === 0} 
                    />
                  ));
                })()}
              </div>


            </>
          )}
          
          {/* --- PHẦN B: CHI TIẾT VÉ MÁY BAY --- */}
          {realFlights.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: isDark ? '#f8fafc' : '#1f2937', marginBottom: '16px' }}>
                ✈️ Chi tiết chuyến bay tham khảo
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: isDark ? '#cbd5e1' : '#475569', marginBottom: '15px' }}>
                🛫 Lựa chọn vé 1 chiều
              </div>
              <div className="ais-flight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                {realFlights.slice(0, 2).map((f, i) => (
                  <PlaceCard 
                    key={`ow-${i}`} 
                    type="Chuyến bay (1 chiều)" 
                    data={{ 
                      airline:       f.airline, 
                      price:         <>{f.price?.toLocaleString()}đ <span style={{fontSize: '11px', color: '#9ca3af', fontWeight: 'normal'}}>(chưa thuế phí)</span></>,
                      thumbnail:     f.thumbnail, 
                      desc:          `Hãng bay: ${f.airline} • Thời gian bay: ${f.duration || 'N/A'}`,
                      booking_token: f.booking_token || '',
                      ticket_class:  f.ticket_class,
                    }} 
                    locationName={initialData.location} 
                    onShowMap={handleShowMap} 
                    guestCount={passengers} 
                    isDark={isDark} 
                  />
                ))}
              </div>

              <div style={{ fontSize: '18px', fontWeight: '800', color: isDark ? '#cbd5e1' : '#475569', marginTop: '30px', marginBottom: '15px' }}>
                🔄 Lựa chọn vé khứ hồi
              </div>
              <div className="ais-flight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                {(realFlights.length > 2 ? realFlights.slice(2, 4) : realFlights.slice(0, 2)).map((f, i) => {
                  const rtPrice = realFlights.length > 2 ? f.price : f.price * 1.95; // Fake round-trip price if mocking
                  return (
                    <PlaceCard 
                      key={`rt-${i}`} 
                      type="Chuyến bay (Khứ hồi)" 
                      data={{ 
                        airline:       f.airline, 
                        price:         <>{rtPrice?.toLocaleString()}đ <span style={{fontSize: '11px', color: '#9ca3af', fontWeight: 'normal'}}>(chưa thuế phí)</span></>,
                        thumbnail:     f.thumbnail, 
                        desc:          `Hãng bay: ${f.airline} • Thời gian bay: ${f.duration || 'N/A'}`,
                        booking_token: f.booking_token || '',
                        ticket_class:  f.ticket_class,
                      }} 
                      locationName={initialData.location} 
                      onShowMap={handleShowMap} 
                      guestCount={passengers} 
                      isDark={isDark} 
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. KHÁCH SẠN */}
<div style={{ marginBottom: '60px' }}>
  <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px' }}>🛌 Chỗ ở </div>
  <div className="ais-hotel-wrap" style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: '30px', borderRadius: '40px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
    <PlaceCard type="Khách sạn" data={currentHotel} locationName={initialData.location} setMapQuery={setMapQuery} guestCount={passengers} onEdit={() => setModal({ show: true, type: 'Khách sạn' })} isDark={isDark} />
    
    <div className="ais-hotel-map" style={{ borderRadius: '25px', overflow: 'hidden', height: '450px', border: isDark ? 'none' : '1px solid #e2e8f0', position: 'relative' }}>
      {/* Fix 1: Dùng place_id để ghim chính xác ngay lần render đầu tiên.
                  Fallback về query-string nếu chưa có place_id */}
      <iframe
        title="map"
        width="100%" height="100%"
        style={{ border: 0, display: 'block' }}
        src={
          // Ưu tiên lat/lng → ghim chuẩn xác, không cần API key
          // Fallback: query-string tên khách sạn
          (currentHotel?.lat && currentHotel?.lng)
            ? `https://maps.google.com/maps?q=${currentHotel.lat},${currentHotel.lng}&z=16&output=embed`
            : `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
        }
      />
      {/* Overlay hiển thị khi chụp ảnh (iframe không chụp được) */}
      <div className="map-screenshot-overlay" style={{
        display: 'none',
        position: 'absolute', inset: 0,
        background: isDark ? 'linear-gradient(135deg,#0f2540,#064e3b)' : 'linear-gradient(135deg,#dbeafe,#dcfce7)',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
        borderRadius: '25px',
      }}>
        <span style={{ fontSize: 48 }}>📍</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#ffffff' : '#1e293b' }}>{mapQuery}</span>
        <span style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}>Xem trên Google Maps</span>
      </div>
    </div>
  </div>
</div>

      {/* 3. LỊCH TRÌNH */}
      <div style={{ marginBottom: '16px' }}>
        <div className="ais-panel-btns" style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'center', marginTop: '0px', marginBottom: '50px' }}>
          {/* 🧋 NÚT THAM KHẢO ĐỒ UỐNG */}
          <button
            onClick={() => setDrinksOpen(true)}
            style={{
              flex: 1, maxWidth: 360,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              padding: '20px 40px', borderRadius: 99,
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '2.5px solid #a7f3d0',
              color: '#059669',
              fontWeight: 800, fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.15)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.boxShadow = '0 18px 40px rgba(16,185,129,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)';
              e.currentTarget.style.color = '#059669';
              e.currentTarget.style.borderColor = '#a7f3d0';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.15)';
            }}
          >
            <FontAwesomeIcon icon={faMugHot} />
            Tham Khảo Đồ Uống
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11 }} />
          </button>

          {/* 🍜 NÚT THAM KHẢO ĐẶC SẢN */}
          <button
            onClick={() => setSpecialtiesOpen(true)}
            style={{
              flex: 1, maxWidth: 360,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '20px 40px', borderRadius: 99,
              border: '2.5px solid #f97316',
              background: 'white', color: '#ea580c',
              fontWeight: 800, fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(249,115,22,0.15)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.background = '#f97316';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 18px 40px rgba(249,115,22,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#ea580c';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(249,115,22,0.15)';
            }}
          >
            <FontAwesomeIcon icon={faUtensils} />
            Tham Khảo Đặc Sản
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11 }} />
          </button>
        </div>
        <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', marginBottom: '16px' }}>🧩 Kế hoạch chi tiết theo buổi</div>
      </div>

      {dailyPlans.map(d => {
        // Tính toán ngày thực tế từ departure_date
        let displayDateStr = '';
        if (initialData.departure_date) {
          const [yyyy, mm, dd] = initialData.departure_date.split('-');
          if (yyyy && mm && dd) {
            const dObj = new Date(yyyy, mm - 1, dd);
            dObj.setDate(dObj.getDate() + (d.day - 1));
            const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            displayDateStr = ` · ${daysOfWeek[dObj.getDay()]} ${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}`;
          }
        }
        
        // 🌤️ Lấy dự báo thời tiết cho ngày tương ứng (d.day bắt đầu từ 1 → index 0)
        let dayForecast = weatherData?.forecast?.[d.day - 1] || null;
        
        // Nếu API trả về thời tiết nhưng ngày bị sai lệch (do chọn ngày quá xa trong tương lai)
        if (dayForecast && displayDateStr && !displayDateStr.includes(dayForecast.date)) {
            dayForecast = null; // Ẩn badge thời tiết vì dự báo không áp dụng cho ngày này
        } else if (dayForecast && !displayDateStr) {
            displayDateStr = ` · ${dayForecast.day} ${dayForecast.date}`; // Fallback nếu không có departure_date
        }

        return (
        <div key={d.day} className="ais-day-block" style={{ marginBottom: '45px', padding: '35px', backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: '40px', marginTop: '40px' }}>
          {/* Header ngày + badge thời tiết */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '30px' }}>
            <div style={{ fontWeight: '900', color: '#10b981', fontSize: '26px' }}>
              <FontAwesomeIcon icon={faRegularCalendar} /> Ngày {d.day}{displayDateStr}
            </div>

            {/* 🌤️ Badge thời tiết ngày — chi tiết */}
            {dayForecast && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
                background: isDark ? 'rgba(15,36,64,0.85)' : 'rgba(219,234,254,0.7)',
                border: isDark ? '1px solid #1e3a5f' : '1px solid #bfdbfe',
                padding: '6px 14px', borderRadius: '16px',
                backdropFilter: 'blur(8px)',
              }}>
                {/* Icon + nhiệt độ */}
                <span style={{ fontSize: '20px' }}>{dayForecast.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: isDark ? '#f0f9ff' : '#1e40af' }}>
                  {dayForecast.high_c !== null ? `${dayForecast.high_c}°` : '--'}
                  <span style={{ fontWeight: 400, opacity: 0.6 }}> / </span>
                  {dayForecast.low_c !== null ? `${dayForecast.low_c}°` : '--'}
                </span>
                {/* Điều kiện */}
                <span style={{
                  fontSize: '12px', fontWeight: '700',
                  color: isDark ? '#93c5fd' : '#2563eb',
                  background: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(219,234,254,0.8)',
                  padding: '2px 8px', borderRadius: '8px',
                }}>
                  {dayForecast.condition}
                </span>
                {/* % mưa */}
                {dayForecast.rain_chance != null && dayForecast.rain_chance > 0 && (
                  <span style={{
                    fontSize: '12px', fontWeight: '800',
                    color: '#3b82f6',
                    background: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff',
                    padding: '2px 8px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    💧 {dayForecast.rain_chance}%
                  </span>
                )}
                {/* Giờ mưa — hiện nếu có */}
                {dayForecast.rain_hours && dayForecast.rain_hours.length > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: '700',
                    color: isDark ? '#7dd3fc' : '#0369a1',
                    background: isDark ? 'rgba(14,165,233,0.15)' : '#e0f2fe',
                    padding: '2px 8px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                    cursor: 'default',
                    title: dayForecast.rain_hours.join(', '),
                  }}
                    title={`Mưa dự kiến: ${dayForecast.rain_hours.join(', ')}`}
                  >
                    🕐 {dayForecast.rain_hours.slice(0, 2).join(' · ')}
                    {dayForecast.rain_hours.length > 2 && ` +${dayForecast.rain_hours.length - 2}`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* SÁNG */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '800', color: '#f59e0b', fontSize: '14px' }}><FontAwesomeIcon icon={faSun} /> BUỔI SÁNG</div>
                <button onClick={() => setAddModal({ show: true, day: d.day, session: 'morning', query: '', results: [], loading: false, selectedPlace: null, replaceTarget: 'new' })} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>+ Thêm hoạt động</button>
              </div>
              {(!d.morning.food && !d.morning.tour && (!d.morning.extras || d.morning.extras.length === 0)) && (
                <div style={{ fontSize: '13px', color: '#10b981', padding: '10px', background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', borderRadius: '10px' }}>
                  💡 Buổi sáng đang trống. Hãy kéo thả địa điểm vào đây hoặc thêm mới nhé!
                </div>
              )}
              {((d.morning.food ? 1 : 0) + (d.morning.tour ? 1 : 0) + (d.morning.extras ? d.morning.extras.length : 0)) >= 3 && (
                <div style={{ fontSize: '13px', color: '#f59e0b', padding: '10px', background: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', borderRadius: '10px' }}>
                  ⚠️ Cảnh báo: Lịch trình buổi sáng đang khá dày đặc, AI đã tự động rút ngắn thời gian tham quan mỗi điểm!
                </div>
              )}
              <div className="ais-session-row" 
                onDragOver={(e) => handleDragOver(e, d.day, 'morning')}
                onDrop={(e) => handleDrop(e, d.day, 'morning')}
                style={{ 
                  display: 'flex', gap: '25px', flexWrap: 'wrap', 
                  flexDirection: ((d.morning.food ? 1 : 0) + (d.morning.tour ? 1 : 0) + (d.morning.extras ? d.morning.extras.length : 0) + (dragOverSession?.day === d.day && dragOverSession?.session === 'morning' && draggedItem && (draggedItem.day !== d.day || draggedItem.session !== 'morning') ? 1 : 0)) >= 3 ? 'column' : 'row',
                  minHeight: '100px', padding: '10px', borderRadius: '24px',
                  border: '2px dashed transparent',
                  backgroundColor: 'transparent',
                  transition: 'all 0.2s'
                }}>
                {renderSessionCards(d, 'morning')}
                {dragOverSession?.day === d.day && dragOverSession?.session === 'morning' && draggedItem && (dragHoverItem?.day !== d.day || dragHoverItem?.session !== 'morning') && (
                  <div style={{
                    width: '100%',
                    borderRadius: '20px',
                    backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                    border: '2px dashed #3b82f6',
                    animation: 'expandDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    pointerEvents: 'none'
                  }} />
                )}
              </div>
            </div>
            
            {/* CHIỀU */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '800', color: '#3b82f6', fontSize: '14px' }}><FontAwesomeIcon icon={faCloudSun} /> BUỔI CHIỀU</div>
                <button onClick={() => setAddModal({ show: true, day: d.day, session: 'afternoon', query: '', results: [], loading: false, selectedPlace: null, replaceTarget: 'new' })} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>+ Thêm hoạt động</button>
              </div>
              {(!d.afternoon.food && !d.afternoon.tour && (!d.afternoon.extras || d.afternoon.extras.length === 0)) && (
                <div style={{ fontSize: '13px', color: '#10b981', padding: '10px', background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', borderRadius: '10px' }}>
                  💡 Buổi chiều đang trống. Hãy kéo thả địa điểm vào đây hoặc thêm mới nhé!
                </div>
              )}
              {((d.afternoon.food ? 1 : 0) + (d.afternoon.tour ? 1 : 0) + (d.afternoon.extras ? d.afternoon.extras.length : 0)) >= 3 && (
                <div style={{ fontSize: '13px', color: '#f59e0b', padding: '10px', background: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', borderRadius: '10px' }}>
                  ⚠️ Cảnh báo: Lịch trình buổi chiều đang khá dày đặc, AI đã tự động rút ngắn thời gian tham quan mỗi điểm!
                </div>
              )}
              <div className="ais-session-row" 
                onDragOver={(e) => handleDragOver(e, d.day, 'afternoon')}
                onDrop={(e) => handleDrop(e, d.day, 'afternoon')}
                style={{ 
                  display: 'flex', gap: '25px', flexWrap: 'wrap', 
                  flexDirection: ((d.afternoon.food ? 1 : 0) + (d.afternoon.tour ? 1 : 0) + (d.afternoon.extras ? d.afternoon.extras.length : 0) + (dragOverSession?.day === d.day && dragOverSession?.session === 'afternoon' && draggedItem && (draggedItem.day !== d.day || draggedItem.session !== 'afternoon') ? 1 : 0)) >= 3 ? 'column' : 'row',
                  minHeight: '100px', padding: '10px', borderRadius: '24px',
                  border: '2px dashed transparent',
                  backgroundColor: 'transparent',
                  transition: 'all 0.2s'
                }}>
                {renderSessionCards(d, 'afternoon')}
                {dragOverSession?.day === d.day && dragOverSession?.session === 'afternoon' && draggedItem && (dragHoverItem?.day !== d.day || dragHoverItem?.session !== 'afternoon') && (
                  <div style={{
                    width: '100%',
                    borderRadius: '20px',
                    backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                    border: '2px dashed #3b82f6',
                    animation: 'expandDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    pointerEvents: 'none'
                  }} />
                )}
              </div>
            </div>
            
            {/* TỐI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '800', color: '#8b5cf6', fontSize: '14px' }}><FontAwesomeIcon icon={faMoon} /> BUỔI TỐI</div>
                <button onClick={() => setAddModal({ show: true, day: d.day, session: 'evening', query: '', results: [], loading: false, selectedPlace: null, replaceTarget: 'new' })} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>+ Thêm hoạt động</button>
              </div>
              {(!d.evening.food && !d.evening.tour && (!d.evening.extras || d.evening.extras.length === 0)) && (
                <div style={{ fontSize: '13px', color: '#10b981', padding: '10px', background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', borderRadius: '10px' }}>
                  💡 Buổi tối đang trống. Hãy kéo thả địa điểm vào đây hoặc thêm mới nhé!
                </div>
              )}
              {((d.evening.food ? 1 : 0) + (d.evening.tour ? 1 : 0) + (d.evening.extras ? d.evening.extras.length : 0)) >= 3 && (
                <div style={{ fontSize: '13px', color: '#f59e0b', padding: '10px', background: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', borderRadius: '10px' }}>
                  ⚠️ Cảnh báo: Lịch trình buổi tối đang khá dày đặc, AI đã tự động rút ngắn thời gian tham quan mỗi điểm!
                </div>
              )}
              <div className="ais-session-row" 
                onDragOver={(e) => handleDragOver(e, d.day, 'evening')}
                onDrop={(e) => handleDrop(e, d.day, 'evening')}
                style={{ 
                  display: 'flex', gap: '25px', flexWrap: 'wrap', 
                  flexDirection: ((d.evening.food ? 1 : 0) + (d.evening.tour ? 1 : 0) + (d.evening.extras ? d.evening.extras.length : 0) + (dragOverSession?.day === d.day && dragOverSession?.session === 'evening' && draggedItem && (draggedItem.day !== d.day || draggedItem.session !== 'evening') ? 1 : 0)) >= 3 ? 'column' : 'row',
                  minHeight: '100px', padding: '10px', borderRadius: '24px',
                  border: '2px dashed transparent',
                  backgroundColor: 'transparent',
                  transition: 'all 0.2s'
                }}>
                {renderSessionCards(d, 'evening')}
                {dragOverSession?.day === d.day && dragOverSession?.session === 'evening' && draggedItem && (dragHoverItem?.day !== d.day || dragHoverItem?.session !== 'evening') && (
                  <div style={{
                    width: '100%',
                    borderRadius: '20px',
                    backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                    border: '2px dashed #3b82f6',
                    animation: 'expandDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    pointerEvents: 'none'
                  }} />
                )}
              </div>
            </div>

          </div>
        </div>
        );
      })}
      {/* GREETING & BRANDING FOOTER */}
      <div style={{
        textAlign: 'center',
        padding: '30px 20px 20px',
        color: isDark ? '#94a3b8' : '#64748b',
        fontSize: '48px',
        fontWeight: '900',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        opacity: 0.9,
        lineHeight: '1.2'
      }}>
        <div style={{ fontSize: '56px' }}>✨✈️✨</div>
        Chúc bạn có một chuyến đi thật tuyệt vời!
        
        <div 
          className="screenshot-watermark"
          style={{
          marginTop: '40px',
          padding: '16px 36px',
          background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
          border: isDark ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(16,185,129,0.4)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.2), 0 0 15px rgba(16,185,129,0.1)',
          borderRadius: '100px',
          fontSize: '24px',
          fontWeight: '800',
          color: isDark ? '#f8fafc' : '#1e293b',
          position: 'absolute',
          visibility: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textTransform: 'none',
          letterSpacing: '0'
        }}>
          Lịch trình được thiết kế thông minh bởi <strong style={{ color: '#10b981', marginRight: '4px' }}>S-Trip</strong>
          <img src="S.png" alt="S-Trip Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }} />
        </div>
      </div>

      </div>{/* end contentRef */}

      {/* ── ACTION SPEED DIAL ── */}
      <ActionSpeedDial
        isDark={isDark}
        handleSaveSchedule={handleSaveSchedule}
        scheduleSaveLoading={scheduleSaveLoading}
        scheduleSaved={scheduleSaved}
        dailyPlans={dailyPlans}
        initialData={initialData}
        currentHotel={currentHotel}
        contentRef={contentRef}
        plan={plan}
        isGlassMode={isGlassMode}
      />

    </div>

    {showBackTop && (
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          width: '44px', height: '44px', borderRadius: '50%',
          background: isDark ? 'rgba(30,41,59,0.75)' : 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(10px)',
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          color: isDark ? '#94a3b8' : '#64748b',
          cursor: 'pointer', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.85, transition: 'opacity 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateX(-50%) translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity='0.85'; e.currentTarget.style.transform='translateX(-50%) translateY(0)'; }}
        title="Lên đầu trang"
      >
        <FontAwesomeIcon icon={faArrowUp} style={{ fontSize: '15px' }} />
      </button>
    )}
      {/* MODAL EDIT DURATION */}
      {durationEdit && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} onClick={() => { setDurationEdit(null); setCustomDuration(''); setCustomStartTime(''); }}>
          <div
            style={{ backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: '25px', width: '380px', padding: '25px', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              .duration-btn {
                flex: 1 1 calc(50% - 4px);
                padding: 12px 0;
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                background-color: transparent;
                color: ${isDark ? '#f8fafc' : '#1e293b'};
              }
              .duration-btn:hover {
                background-color: ${isDark ? '#334155' : '#f1f5f9'};
                border-color: ${isDark ? '#475569' : '#cbd5e1'};
              }
              .duration-btn.active {
                border-color: #3b82f6;
                background-color: ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'};
                color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
              }
              .duration-input {
                flex: 1;
                padding: 10px 15px;
                border-radius: 10px;
                border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                background-color: ${isDark ? '#0f172a' : 'white'};
                color: ${isDark ? 'white' : 'black'};
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
              }
              .duration-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
              }
            `}</style>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: isDark ? 'white' : 'black' }}>Đổi Giờ & Thời Lượng</h2>
              <FontAwesomeIcon icon={faXmark} style={{ cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }} onClick={() => { setDurationEdit(null); setCustomDuration(''); setCustomStartTime(''); }} />
            </div>
            
            <div style={{ backgroundColor: isDark ? '#334155' : '#f8fafc', padding: '12px 15px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 4px 0' }}>Địa điểm đang chọn:</p>
              <strong style={{ fontSize: '15px', color: isDark ? 'white' : '#0f172a', display: 'block' }}>{durationEdit.act.name || durationEdit.act.airline}</strong>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: '6px' }}>Giờ bắt đầu</label>
                <input 
                  type="time" 
                  className="duration-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={customStartTime} 
                  onChange={(e) => setCustomStartTime(e.target.value)} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: '6px' }}>Kết thúc (tuỳ chỉnh)</label>
                <input 
                  type="number" 
                  min="5" 
                  step="5"
                  className="duration-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Vd: 75 phút" 
                  value={customDuration} 
                  onChange={(e) => setCustomDuration(e.target.value)} 
                />
              </div>
            </div>
            
            <label style={{ fontSize: '13px', fontWeight: '700', color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: '10px' }}>Hoặc chọn nhanh thời lượng:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {[30, 45, 60, 90, 120, 150, 180, 240].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleSaveDuration(mins, customStartTime)}
                  className={`duration-btn ${durationEdit.currentDuration === mins ? 'active' : ''}`}
                >
                  {mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? mins % 60 : ''}` : `${mins} phút`}
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                const val = parseInt(customDuration, 10);
                handleSaveDuration(val && val > 0 ? val : durationEdit.currentDuration, customStartTime);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Cập nhật thời gian
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// 🎨 NEW SLIM BUTTON VARIANTS (dùng trong ActionPanel)
// ─────────────────────────────────────────────────────────────
const ICalButtonNew = ({ dailyPlans, initialData, currentHotel }) => {
  const [status, setStatus] = React.useState('idle');
  const handleClick = () => {
    try {
      exportICalFile({ dailyPlans, initialData, currentHotel });
      setStatus('ok'); setTimeout(() => setStatus('idle'), 2500);
    } catch { setStatus('err'); setTimeout(() => setStatus('idle'), 2500); }
  };
  return (
    <button className="ap-card" onClick={handleClick} disabled={status !== 'idle'}
      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 8px 28px rgba(37,99,235,0.40)', opacity: status !== 'idle' ? 0.85 : 1 }}>
      <div className="ap-icon-ring" style={{ background: 'rgba(255,255,255,0.2)' }}>
        {status === 'ok' ? '✅' : status === 'err' ? '❌' : '📅'}
      </div>
      <div className="ap-label">{status === 'ok' ? 'Đã tải xuống!' : status === 'err' ? 'Có lỗi xảy ra' : 'Xuất lịch .ics'}</div>
      <div className="ap-sub">Google / Apple Calendar</div>
    </button>
  );
};

const ScreenshotButtonNew = ({ contentRef, location, isDark, isGlassMode }) => {
  const [status, setStatus] = React.useState('idle');
  const [prog, setProg]     = React.useState('');

  const handleClick = async () => {
    if (status !== 'idle') return;
    const el = contentRef?.current;
    if (!el) return;
    setStatus('loading');

    const toDataUrl = async (src) => {
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
      if (src.includes('placehold.co') || src.includes('placeholder')) return null;

      const blobToDataUrl = (blob) => new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });

      const fetchWithTimeout = (url, opts, ms = 7000) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
      };

      let rawUrl = src;
      if (src.includes('/api/proxy-image')) {
        const match = src.match(/[?&]url=([^&]+)/);
        if (match) rawUrl = decodeURIComponent(match[1]);
      }

      // --- TỐI ƯU NHẬN DIỆN THÔNG MINH ---
      // Nếu là ảnh từ các domain hay lỗi CORS, đi thẳng đến wsrv.nl siêu tốc
      const isProblematic = /serpapi|google|gstatic/i.test(rawUrl);
      
      if (!isProblematic) {
        // Thử 1: fetch trực tiếp cho ảnh bình thường
        try {
          const r = await fetchWithTimeout(rawUrl, { mode: 'cors', credentials: 'omit' }, 3000);
          if (r.ok) {
            const blob = await r.blob();
            if (blob.size > 100) return await blobToDataUrl(blob);
          }
        } catch (_) {}
      }

      // Thử 2: Dùng public CORS proxy
      if (!rawUrl.includes('localhost') && !rawUrl.startsWith('/')) {
        const proxyList = isProblematic
          ? ['https://wsrv.nl/?url=' + encodeURIComponent(rawUrl)] // Bỏ qua corsproxy.io để tránh 403, đi thẳng wsrv.nl
          : [
              'https://corsproxy.io/?' + encodeURIComponent(rawUrl),
              'https://api.allorigins.win/raw?url=' + encodeURIComponent(rawUrl),
              'https://wsrv.nl/?url=' + encodeURIComponent(rawUrl)
            ];

        for (const proxyUrl of proxyList) {
          try {
            const r = await fetchWithTimeout(proxyUrl, { credentials: 'omit' }, 5000);
            if (r.ok) {
              const blob = await r.blob();
              if (blob.size > 100) return await blobToDataUrl(blob);
            }
          } catch (_) {}
        }
      }

      return null;
    };

    try {
      const html2canvas = (await import('html2canvas-pro')).default;

      // ── BƯỚC 1: Đánh index vào từng <img> trong DOM thật ──────────────────
      // Dùng data-ss-idx thay vì dựa vào thứ tự querySelectorAll để tránh lệch index
      // giữa DOM thật và cloned DOM.
      setProg('Đang tải ảnh...');
      const imgEls = [...el.querySelectorAll('img')];
      imgEls.forEach((img, i) => img.setAttribute('data-ss-idx', i));

      const dataUrls = await Promise.all(imgEls.map(img => toDataUrl(img.src)));

      // ── BƯỚC 2: Chụp canvas ────────────────────────────────────────────────
      setProg('Đang chụp...');
      const canvas = await html2canvas(el, {
        scale: window.devicePixelRatio > 1 ? 1.5 : 1, // Tối ưu scale để tăng tốc
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        logging: false,
        imageTimeout: 10000, // Giảm timeout để không bị treo
        ignoreElements: (node) => node.tagName === 'IFRAME' || (node.classList && (node.classList.contains('sd-fab') || node.classList.contains('sd-overlay') || node.classList.contains('ap-card'))),
        onclone: (_doc, cloneEl) => {
          // Swap ảnh bằng data-ss-idx → không bị lệch dù DOM clone có thêm phần tử
          cloneEl.querySelectorAll('img[data-ss-idx]').forEach((img) => {
            const idx = parseInt(img.getAttribute('data-ss-idx'), 10);
            const dataUrl = dataUrls[idx];
            if (dataUrl && dataUrl.startsWith('data:')) {
              img.src = dataUrl;
              img.crossOrigin = 'anonymous';
            }
          });
          // Ẩn iframe bản đồ (không render được), hiện placeholder
          _doc.querySelectorAll('iframe').forEach(f => { f.style.display = 'none'; });
          _doc.querySelectorAll('.map-screenshot-overlay').forEach(d => { d.style.display = 'flex'; });
          
          // Hiện watermark ẩn
          cloneEl.querySelectorAll('.screenshot-watermark').forEach(d => { 
            d.style.position = 'static';
            d.style.visibility = 'visible';
            d.style.display = 'flex';
          });
          // Bỏ transform hover để layout không bị lệch
          _doc.querySelectorAll('button, [style*="transform"]').forEach(b => {
            b.style.transform = 'none';
            b.style.boxShadow = 'none';
          });
          // Ẩn nút Speed Dial / FAB khỏi ảnh chụp
          _doc.querySelectorAll('.sd-fab, .sd-bubble, .sd-overlay, [class*="ap-card"]').forEach(el => {
            el.style.display = 'none';
          });

          // Sửa lỗi nền trong suốt khi xuất ảnh ở chế độ Kính mờ
          if (isGlassMode) {
            cloneEl.style.background = isDark 
              ? 'linear-gradient(135deg, #020617, #1e1b4b, #0f172a, #064e3b)' 
              : 'linear-gradient(135deg, #fbcfe8, #bfdbfe, #e9d5ff, #a7f3d0)';
            cloneEl.style.backgroundSize = '400% 400%';
            cloneEl.style.backgroundRepeat = 'no-repeat';
            
            // Tăng độ đục của các thẻ lên vì html2canvas KHÔNG hỗ trợ backdrop-filter (blur)
            _doc.querySelectorAll('.ais-day-block, .ais-place-card, .ais-transport-card, .ais-transport-leg, .ais-hotel-wrap').forEach(c => {
               c.style.setProperty('background-color', isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.85)', 'important');
            });
          }
        },
      });

      // ── BƯỚC 3: Dọn dẹp data-ss-idx ──────────────────────────────────────
      imgEls.forEach(img => img.removeAttribute('data-ss-idx'));

      // ── BƯỚC 4: Download ảnh PNG ───────────────────────────────────────────
      setProg('Đang lưu...');
      const loc = (location || 's-trip').toLowerCase().replace(/\s+/g, '-');
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(); return; }
          const url = URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url, download: `strip-${loc}.png`,
          });
          document.body.appendChild(a); a.click();
          document.body.removeChild(a); URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      });

      setStatus('ok');
    } catch (e) {
      console.error('[Screenshot]', e);
      // Dọn dẹp index nếu có lỗi giữa chừng
      try { [...(contentRef?.current?.querySelectorAll('img[data-ss-idx]') || [])].forEach(img => img.removeAttribute('data-ss-idx')); } catch (_) {}
      setStatus('err');
    } finally {
      setProg('');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const labels = {
    idle:    '📸 Xuất ảnh lịch trình',
    loading: prog || 'Đang chụp...',
    ok:      '✅ Đã tải xong!',
    err:     '❌ Thử lại',
  };
  return (
    <button className="ap-card" onClick={handleClick} disabled={status === 'loading'}
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 8px 28px rgba(124,58,237,0.40)', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.85 : 1 }}>
      <div className="ap-icon-ring" style={{ background: 'rgba(255,255,255,0.2)' }}>
        {status === 'ok' ? '✅' : status === 'err' ? '❌' : '📸'}
      </div>
      <div className="ap-label">{labels[status]}</div>
      <div className="ap-sub">Tải về ảnh PNG chất lượng cao</div>
    </button>
  );
};

const ShareButtonNew = ({ dailyPlans, initialData, currentHotel, plan, isDark }) => {
  const [status,   setStatus]   = React.useState('idle');
  const [shareUrl, setShareUrl] = React.useState('');
  const [copied,   setCopied]   = React.useState(false);
  const [open,     setOpen]     = React.useState(false);

  const handleShare = async () => {
    if (status === 'loading') return;
    if (shareUrl) { setOpen(true); return; }
    setStatus('loading');
    try {
      const body = { plan: plan || {}, dailyPlans: dailyPlans || [],
        meta: { location: initialData.location, days: parseInt(String(initialData.days||'3').split(' ')[0]),
                origin: initialData.origin||initialData.from||'', startDate: initialData.startDate||initialData.departure_date||'' } };
      const res  = await fetch(`${BASE_URL}/api/trip/save`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error||'Lỗi server');
      setShareUrl(data.share_url); setStatus('ok'); setOpen(true);
    } catch { setStatus('err'); setTimeout(() => setStatus('idle'), 2500); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const encodedUrl  = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`Xem lịch trình ${initialData.location} trên S-Trip! `);

  return (
    <>
      <button className="ap-card" onClick={handleShare} disabled={status === 'loading'}
        style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 8px 28px rgba(14,165,233,0.40)', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.85 : 1 }}>
        <div className="ap-icon-ring" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {status === 'loading' ? '⏳' : status === 'err' ? '❌' : '🔗'}
        </div>
        <div className="ap-label">{status === 'loading' ? 'Đang tạo link...' : status === 'err' ? 'Có lỗi — thử lại' : 'Chia sẻ lịch trình'}</div>
        <div className="ap-sub">Gửi link qua Zalo / Messenger</div>
      </button>

      {/* Share panel popup */}
      {open && shareUrl && ReactDOM.createPortal(
        <>
          <style>{`@keyframes spUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div onClick={() => setOpen(false)} style={{ position:'fixed',inset:0,zIndex:9999999,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background: isDark?'#1e293b':'white', borderRadius:24, padding:'28px 28px 24px', width:'min(480px,95vw)', boxShadow:'0 32px 80px rgba(0,0,0,0.4)', animation:'spUp 0.25s ease', border: isDark?'1px solid #334155':'1px solid #e2e8f0' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                <div style={{ fontSize:17,fontWeight:900,color:isDark?'#f8fafc':'#111827' }}>🔗 Chia sẻ lịch trình</div>
                <button onClick={()=>setOpen(false)} style={{ width:34,height:34,borderRadius:'50%',border:'none',background:isDark?'#334155':'#f1f5f9',color:isDark?'#94a3b8':'#64748b',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
              </div>
              {/* URL box */}
              <div style={{ display:'flex',gap:8,marginBottom:18 }}>
                <input readOnly value={shareUrl} style={{ flex:1,padding:'10px 14px',borderRadius:12,border:isDark?'1px solid #475569':'1px solid #e2e8f0',background:isDark?'#0f172a':'#f8fafc',color:isDark?'#f8fafc':'#1e293b',fontSize:13,fontWeight:600,outline:'none' }} />
                <button onClick={handleCopy} style={{ padding:'10px 18px',borderRadius:12,border:'none',background:copied?'#059669':'#10b981',color:'white',fontWeight:800,fontSize:13,cursor:'pointer',whiteSpace:'nowrap',transition:'0.2s' }}>
                  {copied ? '✅ Đã copy' : '📋 Copy'}
                </button>
              </div>
              {/* Social buttons */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                {[
                  { label:'Zalo',     bg:'#0068ff', logo:'https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg',      href:`https://zalo.me/share/url?url=${encodedUrl}&title=${encodedText}` },
                  { label:'Messenger',bg:'#0084ff', logo:'https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg', href:`https://m.me/share?link=${encodedUrl}` },
                  { label:'X (Twitter)',bg:'#000000',logo:'https://upload.wikimedia.org/wikipedia/commons/5/53/X_logo_2023_original.svg', href:`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
                  { label:'Copy link', bg:'#64748b', logo:null, href:null, onClick: handleCopy },
                ].map(s => {
                  const inner = (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      {s.logo
                        ? <img src={s.logo} alt={s.label} style={{ width:20, height:20, objectFit:'contain', flexShrink:0 }} />
                        : <span>📋</span>}
                      <span>{s.label}</span>
                    </div>
                  );
                  return s.href
                    ? <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                        style={{ padding:'12px 14px',borderRadius:12,background:s.bg,color:'white',fontWeight:800,fontSize:13,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center' }}>
                        {inner}
                      </a>
                    : <button key={s.label} onClick={s.onClick}
                        style={{ padding:'12px 14px',borderRadius:12,background:s.bg,color:'white',fontWeight:800,fontSize:13,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',width:'100%' }}>
                        {inner}
                      </button>;
                })}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};


// ─────────────────────────────────────────────────────────────
// ✨ ACTION SPEED DIAL — 1 nút FAB bung ra 4 nút bong bóng
// ─────────────────────────────────────────────────────────────
const ActionSpeedDial = ({
  isDark, handleSaveSchedule, scheduleSaveLoading, scheduleSaved,
  dailyPlans, initialData, currentHotel, contentRef, plan, isGlassMode
}) => {
  const [open, setOpen] = React.useState(false);

  // 4 items: icon, label, sub, màu, handler
  const items = [
    {
      id: 'save',
      emoji: scheduleSaveLoading ? '⏳' : scheduleSaved ? '✅' : '💾',
      label: scheduleSaveLoading ? 'Đang lưu...' : scheduleSaved ? 'Đã lưu!' : 'Lưu Dashboard',
      sub: scheduleSaved ? 'Đã lưu rồi' : 'Truy cập lại bất kỳ lúc nào',
      bg: 'linear-gradient(135deg,#10b981,#059669)',
      shadow: 'rgba(16,185,129,0.5)',
      onClick: handleSaveSchedule,
      disabled: scheduleSaveLoading || scheduleSaved,
    },
    {
      id: 'ical',
      emoji: '📅',
      label: 'Xuất lịch .ics',
      sub: 'Google / Apple Calendar',
      bg: 'linear-gradient(135deg,#3b82f6,#2563eb)',
      shadow: 'rgba(59,130,246,0.5)',
      renderCustom: (key) => <ICalButtonNew key={key} asSpeedDialItem dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} />,
    },
    {
      id: 'screenshot',
      emoji: '📸',
      label: 'Xuất ảnh lịch trình',
      sub: 'Tải về ảnh PNG chất lượng cao',
      bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
      shadow: 'rgba(124,58,237,0.5)',
      renderCustom: (key) => <ScreenshotButtonNew key={key} asSpeedDialItem contentRef={contentRef} location={initialData.location} isDark={isDark} isGlassMode={isGlassMode} />,
    },
    {
      id: 'share',
      emoji: '🔗',
      label: 'Chia sẻ lịch trình',
      sub: 'Gửi link qua Zalo / Messenger',
      bg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
      shadow: 'rgba(14,165,233,0.5)',
      renderCustom: (key) => <ShareButtonNew key={key} asSpeedDialItem dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} plan={plan} isDark={isDark} />,
    },
  ];

  // FAB 72×72, anchor top:0 left:0. Bubble 160×90px
  // FAB center = x:36. Để FAB nằm giữa 4 ô:
  // ô1+ô2 tổng width = 160+8+160=328 → bắt đầu từ 36-164=-128
  // ô3 cách trái FAB, ô4 cách phải FAB đối xứng qua tâm FAB (x=36)
  const positions = [
    { x: -128, y: -160 }, // ô1 trên-trái
    { x:   40, y: -160 }, // ô2 trên-phải
    { x: -188, y:  -65 }, // ô3 dưới-trái  (tách trái)
    { x:  116, y:  -65 }, // ô4 dưới-phải  (tách phải)
  ];

  const [wasOpen, setWasOpen] = React.useState(false);
  // Track nếu đã từng mở để chạy close animation
  React.useEffect(() => { if (open) setWasOpen(true); }, [open]);

  return (
    <>
      <style>{`
        @keyframes sdPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
          50%      { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
        }
        @keyframes sdBubblePop {
          0%   { transform: translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; }
          60%  { transform: translate(var(--tx), var(--ty)) scale(1.1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
        }
        @keyframes sdBubbleOut {
          0%   { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.3); opacity: 0; }
        }
        .sd-bubble {
          position: absolute;
          top: 0; left: 0;
          width: 160px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          text-align: left;
          pointer-events: none;
          opacity: 0;
          transition: box-shadow 0.2s;
        }
        .sd-bubble.sd-open {
          pointer-events: auto;
          animation: sdBubblePop 0.38s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        .sd-bubble.sd-close {
          pointer-events: none;
          animation: sdBubbleOut 0.22s ease forwards;
        }
        .sd-bubble:hover { filter: brightness(1.08); transform: translate(var(--tx), var(--ty)) translateY(-3px) scale(1.04) !important; }
        .sd-fab {
          width: 72px; height: 72px; border-radius: 50%;
          border: none; cursor: pointer;
          background: linear-gradient(135deg,#10b981,#059669);
          color: white; font-size: 28px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 28px rgba(16,185,129,0.5);
          transition: transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
          position: relative; z-index: 10;
          animation: sdPulse 2.4s ease-in-out infinite;
        }
        .sd-fab:hover { transform: scale(1.12); }
        .sd-fab.sd-fab-open {
          transform: rotate(45deg) scale(1.05);
          animation: none;
          background: linear-gradient(135deg,#ef4444,#dc2626);
          box-shadow: 0 8px 28px rgba(239,68,68,0.5);
        }
        .sd-overlay {
          position: fixed; inset: 0; z-index: 99;
        }
        .sd-bubble-label { font-size: 13px; font-weight: 900; color: white; line-height: 1.2; }
        .sd-bubble-sub   { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.75); }
        .sd-bubble-icon  { font-size: 20px; margin-bottom: 4px; }
      `}</style>

      {/* Backdrop để close khi click ra ngoài */}
      {open && (
        <div className="sd-overlay" onClick={() => setOpen(false)} />
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '20px',
        marginBottom: '0px',
      }}>
        {/* Container relative để bubble có thể absolute */}
        <div style={{ position: 'relative', width: 72, height: 72, zIndex: 100 }}>

          {/* 4 bubble buttons — chỉ render khi open hoặc đang close animation */}
          {(open || wasOpen) && items.map((item, i) => {
            const { x, y } = positions[i];
            const delay = open ? i * 55 : (items.length - 1 - i) * 40;
            const animClass = open ? 'sd-open' : 'sd-close';

            const bubbleStyle = {
              '--tx': `${x}px`,
              '--ty': `${y}px`,
              animationDelay: `${delay}ms`,
              background: item.bg,
              boxShadow: `0 8px 24px ${item.shadow}`,
              zIndex: 101,
            };

            // Các nút có hidden trigger: click bubble → click hidden button thật
            const hiddenIds = { ical: 'sd-ical-hidden', screenshot: 'sd-screenshot-hidden', share: 'sd-share-hidden' };

            return (
              <button
                key={item.id}
                className={`sd-bubble ${animClass}`}
                style={bubbleStyle}
                onAnimationEnd={(!open && i === items.length - 1) ? () => setWasOpen(false) : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.disabled) return;
                  if (item.onClick) {
                    item.onClick();
                    setOpen(false);
                  } else if (hiddenIds[item.id]) {
                    // Trigger hidden button bên trong div ẩn
                    const container = document.getElementById(hiddenIds[item.id]);
                    if (container) {
                      const btn = container.querySelector('button');
                      if (btn) { container.style.pointerEvents = 'auto'; btn.click(); container.style.pointerEvents = 'none'; }
                    }
                    if (item.id !== 'share') setOpen(false);
                  }
                }}
                disabled={item.disabled}
              >
                <div className="sd-bubble-icon">{item.emoji}</div>
                <div className="sd-bubble-label">{item.label}</div>
                <div className="sd-bubble-sub">{item.sub}</div>
              </button>
            );
          })}

          {/* Hidden trigger wrappers cho các nút có nội bộ state */}
          <ICalTrigger dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} />
          <ScreenshotTrigger contentRef={contentRef} location={initialData.location} isDark={isDark} isGlassMode={isGlassMode} />
          <ShareTrigger dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} plan={plan} isDark={isDark} />

          {/* FAB chính */}
          <button
            className={`sd-fab${open ? ' sd-fab-open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            title="Lưu & Chia sẻ lịch trình"
          >
            {open ? '✕' : '✨'}
          </button>
        </div>

        {/* Label dưới FAB */}
        {!open && (
          <div style={{
            position: 'absolute',
            marginTop: 88,
            fontSize: 12, fontWeight: 700,
            color: isDark ? '#94a3b8' : '#64748b',
            letterSpacing: '0.02em',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            Lưu & Chia sẻ
          </div>
        )}
      </div>
    </>
  );
};

// ── Thin wrapper components: render nút thật nhưng ẩn, expose triggerRef ──
// ICalButton, ScreenshotButton, ShareButton vẫn dùng nguyên để giữ logic
// Speed dial bubble chỉ là UI proxy — khi click bubble tương ứng sẽ click hidden button

const ICalTrigger = ({ dailyPlans, initialData, currentHotel }) => {
  // ICalButtonNew tự render, wrap trong div ẩn để tránh layout
  return (
    <div style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0, overflow:'hidden' }} id="sd-ical-hidden">
      <ICalButtonNew dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} />
    </div>
  );
};

const ScreenshotTrigger = ({ contentRef, location, isDark, isGlassMode }) => (
  <div style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0, overflow:'hidden' }} id="sd-screenshot-hidden">
    <ScreenshotButtonNew contentRef={contentRef} location={location} isDark={isDark} isGlassMode={isGlassMode} />
  </div>
);

const ShareTrigger = ({ dailyPlans, initialData, currentHotel, plan, isDark }) => (
  <div style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0, overflow:'hidden' }} id="sd-share-hidden">
    <ShareButtonNew dailyPlans={dailyPlans} initialData={initialData} currentHotel={currentHotel} plan={plan} isDark={isDark} />
  </div>
);

export default AiSchedule;