import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faUtensils, faMapLocationDot,
  faSun, faCloudSun, faMoon, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { enrichPlacesWithCoords, getProvinceBounds, inBounds } from '../services/geocodeUtils';
import { BASE_URL } from '../config';
const proxyImg = (url) => {
  if (!url) return null;
  // Tránh double proxy nếu backend đã proxy sẵn
  if (url.includes('/api/proxy-image')) {
    return url.startsWith('http') ? url : BASE_URL + url;
  }
  if (url.includes('placehold.co') || url.includes('placeholder')) return url;
  const googleDomains = ['googleusercontent.com','ggpht.com','googleapis.com','googleapi'];
  if (googleDomains.some(d => url.includes(d))) {
    let u = url.includes('=') ? url.replace(/=.*$/, '=w300-h300-k-no') : url + '=w300-h300-k-no';
    return BASE_URL + '/api/proxy-image?url=' + encodeURIComponent(u);
  }
  return url;
};

// ── Mock fallback ─────────────────────────────────────────────
const mockTours = [
  { name: "Địa điểm tham quan 1", thumbnail: null },
  { name: "Địa điểm tham quan 2", thumbnail: null },
  { name: "Địa điểm tham quan 3", thumbnail: null },
];
const mockFoods = [
  { name: "Nhà hàng địa phương 1", thumbnail: null },
  { name: "Quán ăn ngon 2",        thumbnail: null },
  { name: "Quán ăn ngon 3",        thumbnail: null },
];

const SESSION_META = [
  { key: 'morning',   label: 'Sáng',  icon: faSun,      color: '#f59e0b' },
  { key: 'afternoon', label: 'Chiều', icon: faCloudSun,  color: '#3b82f6' },
  { key: 'evening',   label: 'Tối',   icon: faMoon,      color: '#8b5cf6' },
];

function buildDayPlaces(data) {
  const numDays = parseInt(data.days?.toString().split(' ')[0]) || 3;

  // ── Ưu tiên đọc itinerary từ backend (đã chia sẵn theo ngày/buổi) ──
  if (data.itinerary?.length > 0) {
    const SLOT_MAP = {
      '🌅 Buổi sáng': SESSION_META[0],
      '☀️ Buổi chiều': SESSION_META[1],
      '🌙 Buổi tối': SESSION_META[2],
    };
    
    return data.itinerary.slice(0, numDays).map(dayObj => {
      const places = [];
      (dayObj.slots || []).forEach(slotObj => {
        const sMeta = SLOT_MAP[slotObj.slot];
        if (!sMeta) return;
        
        (slotObj.items || []).forEach(item => {
          places.push({
            session: sMeta.label,
            sessionColor: sMeta.color,
            sessionIcon: sMeta.icon,
            type: item.item_type || 'tour',
            name: item.name || '',
            thumbnail: item.thumbnail || null,
            lat: item.lat || item.latitude || null,
            lng: item.lng || item.longitude || null,
          });
        });
      });
      return places;
    });
  }

  // ── Fallback: phân bổ từ realTours/realFoods theo thứ tự tuyến tính ──
  // Không dùng modulo để tránh lặp địa điểm sai chỗ
  const toursPool = data.realTours?.length > 0 ? data.realTours : mockTours;
  const foodsPool = data.realFoods?.length > 0 ? data.realFoods : mockFoods;
  const days = [];
  let tourCursor = 0, foodCursor = 0;
  for (let i = 0; i < numDays; i++) {
    const places = [];
    for (let s of SESSION_META) {
      const tour = toursPool[tourCursor] || mockTours[0];
      const food = foodsPool[foodCursor] || mockFoods[0];
      tourCursor++;
      foodCursor++;
      places.push({
        session: s.label, sessionColor: s.color, sessionIcon: s.icon, type: 'food',
        name: food.name, thumbnail: food.thumbnail || null,
        lat: food.lat || food.latitude || null,
        lng: food.lng || food.longitude || null,
      });
      places.push({
        session: s.label, sessionColor: s.color, sessionIcon: s.icon, type: 'tour',
        name: tour.name, thumbnail: tour.thumbnail || null,
        lat: tour.lat || tour.latitude || null,
        lng: tour.lng || tour.longitude || null,
      });
    }
    days.push(places);
  }
  return days;
}

// ── Lấy tọa độ: hotel (điểm O) + địa điểm trong ngày ────────
async function resolveMarkers(hotel, places, location) {
  let hotelMarker = null;

  // Lấy bounds tỉnh 1 lần — dùng cho cả hotel lẫn places
  const b = await getProvinceBounds(location).catch(() => null);

  if (hotel) {
    const existLat = hotel.lat || hotel.latitude;
    const existLng = hotel.lng || hotel.longitude;
    const coordsExist = existLat && existLng;
    // ✅ FIX: chỉ dùng tọa độ sẵn có nếu nằm trong bounds tỉnh
    const coordsValid = coordsExist && inBounds(parseFloat(existLat), parseFloat(existLng), b);

    if (coordsValid) {
      hotelMarker = { ...hotel, type: 'hotel', lat: parseFloat(existLat), lng: parseFloat(existLng) };
    } else {
      // Tọa độ không có hoặc nằm ngoài tỉnh → geocode lại theo tên + location
      if (coordsExist && !coordsValid) {
        console.warn(`[MapBubble] Hotel "${hotel.name}" có tọa độ ngoài bounds "${location}" → geocode lại.`);
      }
      try {
        const { tours: [enrichedHotel] } = await enrichPlacesWithCoords(
          location,
          [{ name: hotel.name, type: 'hotel', place_id: hotel.place_id || '' }],
          []
        );
        if (enrichedHotel?.lat) hotelMarker = { ...hotel, type: 'hotel', lat: enrichedHotel.lat, lng: enrichedHotel.lng };
      } catch {}
    }
  }

  let dayMarkers = [];
  // ✅ FIX: loại địa điểm có tọa độ sẵn nhưng nằm ngoài bounds (dữ liệu lạc)
  const validPlaces  = places.filter(p => p.lat && p.lng && inBounds(+p.lat, +p.lng, b));
  const invalidPlaces = places.filter(p => !p.lat || !p.lng || !inBounds(+(p.lat||0), +(p.lng||0), b));

  const allReady = invalidPlaces.length === 0 && validPlaces.length === places.length;
  if (allReady) {
    dayMarkers = validPlaces;
  } else {
    // Geocode lại các điểm chưa có hoặc sai tọa độ
    const toGeocode = invalidPlaces;
    const tours = toGeocode.filter(p => p.type === 'tour');
    const foods  = toGeocode.filter(p => p.type === 'food');
    try {
      const { tours: eTours, foods: eFoods } = await enrichPlacesWithCoords(location, tours, foods);
      const enrichedMap = {};
      [...eTours, ...eFoods].forEach(p => { enrichedMap[p.name + p.type] = p; });
      const reGeocodedValid = toGeocode
        .map(p => enrichedMap[p.name + p.type] || p)
        .filter(p => p.lat && p.lng);
      dayMarkers = [...validPlaces, ...reGeocodedValid];
    } catch {
      dayMarkers = validPlaces;
    }
  }

  return hotelMarker ? [hotelMarker, ...dayMarkers] : dayMarkers;
}

// ── Tạo HTML Leaflet + OSRM routing ──────────────────────────
function buildLeafletHtml(markers, isDark) {
  const markersJson = JSON.stringify(markers);
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
    /* ✅ CSS Dark Mode cho Popup */
    .leaflet-popup-content-wrapper, .leaflet-popup-tip { 
      background: ${isDark ? '#1e293b' : 'white'} !important; 
      color: ${isDark ? 'white' : '#111827'} !important; 
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
  (async function() {
    const markers = ${markersJson};
    if (!markers.length) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-family:sans-serif;flex-direction:column;gap:8px"><div style="font-size:32px">🗺️</div><div>Không tìm được tọa độ địa điểm</div></div>';
      return;
    }

    const map = L.map('map', { zoomControl: true });
    
    // ✅ BƯỚC 2: Bơm cái link đã xử lý xong vào đây
    L.tileLayer('${tileUrl}', {
      attribution: '© CARTO © OpenStreetMap', subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    // Màu tươi sáng trên nền Carto Voyager
    const pathColors  = ['#00c9a7','#38bdf8','#fb923c','#c084fc','#f87171','#facc15','#f472b6','#818cf8'];
    const typeColors  = { tour: '#8b5cf6', food: '#f97316', hotel: '#10b981' };
    const latlngs     = markers.map(m => [m.lat, m.lng]);
    const legLayers   = []; // { sh, gl, mn }
    let   activeLeg   = -1;

    // ── Reset ────────────────────────────────────────────────
    function resetRoutes() {
      activeLeg = -1;
      legLayers.forEach(({ sh, gl, mn }) => {
        sh.setStyle({ opacity: 0.10 });
        gl.setStyle({ opacity: 0 });
        mn.setStyle({ opacity: 0.95, weight: 5 });
      });
      // Thông báo React: không có leg nào active
      if (window._onHighlightChange) window._onHighlightChange(-1);
    }

    // ── Highlight 1 leg + thông báo React ────────────────────
    function highlightLeg(legIdx) {
      if (activeLeg === legIdx) { resetRoutes(); return; }
      activeLeg = legIdx;
      legLayers.forEach(({ sh, gl, mn }) => {
        sh.setStyle({ opacity: 0.04 });
        gl.setStyle({ opacity: 0 });
        mn.setStyle({ opacity: 0.22, weight: 4 });
      });
      const leg = legLayers[legIdx];
      if (!leg) return;
      leg.sh.setStyle({ opacity: 0.18 });
      leg.gl.setStyle({ opacity: 0.45, weight: 16 });
      leg.mn.setStyle({ opacity: 1, weight: 7 });
      leg.gl.bringToFront();
      leg.mn.bringToFront();
      // Thông báo React: legIdx đang active → highlight 2 đầu mút
      if (window._onHighlightChange) window._onHighlightChange(legIdx);
    }

    // ── Click marker → leg ĐI RA; điểm CUỐI → leg ĐI VÀO ───
    function highlightMarker(markerIdx) {
      const legIdx = markerIdx === 0 ? 0 : markerIdx - 1;
      if (legIdx < 0) return;
      highlightLeg(legIdx);
    }

    // Expose ra window để React gọi được
    window.highlightLeg = highlightLeg;
    window.resetRoutes  = resetRoutes;

    // Click nền map → reset + đồng bộ React
    map.on('click', resetRoutes);

    // ── Vẽ routes trước (dưới marker) ───────────────────────
    try {
      const coordStr = markers.map(m => m.lng+','+m.lat).join(';');
      const res  = await fetch(
        'https://router.project-osrm.org/route/v1/driving/'+coordStr
        +'?overview=false&geometries=geojson&steps=true'
      );
      const data = await res.json();

      if (data.code === 'Ok' && data.routes?.[0]?.legs) {
        data.routes[0].legs.forEach((leg, i) => {
          const color = pathColors[i % pathColors.length];
          // Gom tọa độ từ steps của leg
          const coords = [];
          (leg.steps || []).forEach(step => {
            (step.geometry?.coordinates || []).forEach(c => {
              const pt = [c[1], c[0]];
              const last = coords[coords.length - 1];
              if (!last || last[0] !== pt[0] || last[1] !== pt[1]) coords.push(pt);
            });
          });
          if (coords.length < 2) { legLayers.push({ sh:L.polyline([]),gl:L.polyline([]),mn:L.polyline([]) }); return; }

          const sh = L.polyline(coords, { color:'#000', weight:10, opacity:0.10, lineJoin:'round', lineCap:'round' }).addTo(map);
          const gl = L.polyline(coords, { color,        weight:16, opacity:0,    lineJoin:'round', lineCap:'round' }).addTo(map);
          const mn = L.polyline(coords, { color,        weight:5,  opacity:0.95, lineJoin:'round', lineCap:'round' }).addTo(map);
          const li = legLayers.length;
          mn.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
          gl.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
          legLayers.push({ sh, gl, mn });
        });
      } else {
        markers.forEach((m, i) => {
          if (!i) return;
          const prev  = markers[i-1];
          const color = pathColors[(i-1) % pathColors.length];
          const coords = [[prev.lat,prev.lng],[m.lat,m.lng]];
          const sh = L.polyline(coords, { color:'#000', weight:10, opacity:0.10, dashArray:'8 5' }).addTo(map);
          const gl = L.polyline(coords, { color,        weight:16, opacity:0 }).addTo(map);
          const mn = L.polyline(coords, { color,        weight:5,  opacity:0.95, dashArray:'8 5' }).addTo(map);
          const li = legLayers.length;
          mn.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
          gl.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
          legLayers.push({ sh, gl, mn });
        });
      }
    } catch {
      markers.forEach((m, i) => {
        if (!i) return;
        const prev  = markers[i-1];
        const color = pathColors[(i-1) % pathColors.length];
        const coords = [[prev.lat,prev.lng],[m.lat,m.lng]];
        const sh = L.polyline(coords, { color:'#000', weight:10, opacity:0.10, dashArray:'8 5' }).addTo(map);
        const gl = L.polyline(coords, { color,        weight:16, opacity:0 }).addTo(map);
        const mn = L.polyline(coords, { color,        weight:5,  opacity:0.95, dashArray:'8 5' }).addTo(map);
        const li = legLayers.length;
        mn.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
        gl.on('click', (e) => { L.DomEvent.stopPropagation(e); highlightLeg(li); });
        legLayers.push({ sh, gl, mn });
      });
    }

    // ── Vẽ markers (trên route) ──────────────────────────────
    let dayIdx = 0;
    markers.forEach((m, i) => {
      const isHotel = m.type === 'hotel';
      const color   = typeColors[m.type] || '#10b981';
      if (!isHotel) dayIdx++;

      let html;
      if (isHotel) {
        html = \`<div style="position:relative;width:42px;height:50px">
          <svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50">
            <ellipse cx="21" cy="48" rx="6" ry="2.5" fill="rgba(0,0,0,0.25)"/>
            <path d="M21 1C12.2 1 5 8.2 5 17c0 11 16 31 16 31s16-20 16-31C37 8.2 29.8 1 21 1z" fill="#10b981" stroke="white" stroke-width="2"/>
            <circle cx="21" cy="17" r="10" fill="white"/>
            <polygon points="21,9 13,16 29,16" fill="#10b981"/>
            <rect x="16" y="16" width="10" height="8" fill="#10b981"/>
            <rect x="19" y="19" width="4" height="5" fill="white"/>
          </svg>
          <div style="position:absolute;top:-6px;right:-4px;background:#10b981;color:white;font-size:8px;font-weight:900;padding:2px 4px;border-radius:6px;border:1.5px solid white;font-family:sans-serif">KS</div>
        </div>\`;
      } else {
        html = \`<div style="position:relative;width:36px;height:44px">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
            <ellipse cx="18" cy="42" rx="5" ry="2" fill="rgba(0,0,0,0.25)"/>
            <path d="M18 1C10.3 1 4 7.3 4 15c0 9.6 14 27 14 27s14-17.4 14-27C32 7.3 25.7 1 18 1z" fill="\${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="18" cy="15" r="8" fill="white"/>
            <text x="18" y="19" text-anchor="middle" font-size="10" font-weight="900" fill="\${color}" font-family="sans-serif">\${dayIdx}</text>
          </svg>
        </div>\`;
      }

      const icon = L.divIcon({ html, iconSize:isHotel?[42,50]:[36,44], iconAnchor:isHotel?[21,50]:[18,44], popupAnchor:[0,-50], className:'' });
      const sessionLabel = m.session || '';
      const emoji  = isHotel ? '🏨' : (m.type==='tour' ? '📍' : '🍜');
      const label  = isHotel ? 'Điểm xuất phát' : (m.type==='tour' ? 'Tham quan' : 'Ăn uống');

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.bindPopup(\`<div style="font-family:sans-serif;min-width:160px;padding:4px 0">
        <div style="font-size:10px;font-weight:800;color:\${color};text-transform:uppercase;margin-bottom:4px">\${emoji} \${label}\${sessionLabel?' · Buổi '+sessionLabel:''}</div>
        <div style="font-size:14px;font-weight:900;color:${isDark ? '#f1f5f9' : '#111'}">\${m.name}</div>
        \${m.thumbnail?'<img src="'+m.thumbnail+'" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:8px"/>':''}
      </div>\`, { maxWidth: 220 });

      // Click marker → highlight đường vào + ra
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        highlightMarker(i);
      });
    });

    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
  })();
  </script>
</body>
</html>`;
}

// ── Tính khoảng cách Haversine (không cần network) ──────────
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat  = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcDirectionsLocal(fromLat, fromLng, toLat, toLng) {
  const dist    = haversineMeters(fromLat, fromLng, toLat, toLng) * 1.3; // hệ số đường thực tế
  const fmt  = (s) => { const h = Math.floor(s/3600), m = Math.max(1, Math.floor((s%3600)/60)); return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`; };
  const fmtD = (m) => m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const drive = dist / 9;   // ~32 km/h đô thị
  return [
    { icon:'🚗', label:'Ô tô',    speed:'32 km/h', duration:fmt(drive),        distance:fmtD(dist), estimated:true },
    { icon:'🏍️', label:'Xe máy', speed:'35 km/h', duration:fmt(drive * 0.95), distance:fmtD(dist), estimated:true },
    { icon:'🚲', label:'Xe đạp', speed:'15 km/h', duration:fmt(dist / 4.2),   distance:fmtD(dist), estimated:true },
    { icon:'🚶', label:'Đi bộ',  speed:'5 km/h',  duration:fmt(dist / 1.35),  distance:fmtD(dist), estimated:true },
    { icon:'🚌', label:'Xe buýt',speed:'22 km/h', duration:fmt(drive * 1.45), distance:fmtD(dist), estimated:true },
  ];
}

// ── OSRM (chính xác) → fallback Haversine (luôn có) ─────────
async function getDirectionsOSRM(fromLat, fromLng, toLat, toLng) {
  try {
    const res  = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return calcDirectionsLocal(fromLat, fromLng, toLat, toLng);
    const { distance, duration } = data.routes[0];
    const fmt  = (s) => { const h = Math.floor(s/3600), m = Math.max(1, Math.floor((s%3600)/60)); return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`; };
    const fmtD = (m) => m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
    const fmtSpd = (mps) => `${Math.round(mps * 3.6)} km/h`;
    const carSpd = distance / duration; // m/s thực tế từ OSRM
    return [
      { icon:'🚗', label:'Ô tô',    speed:fmtSpd(carSpd),         duration:fmt(duration),          distance:fmtD(distance) },
      { icon:'🏍️', label:'Xe máy', speed:fmtSpd(carSpd * 1.05),  duration:fmt(duration * 0.95),   distance:fmtD(distance), estimated:true },
      { icon:'🚲', label:'Xe đạp', speed:'15 km/h',               duration:fmt(distance / 4.2),    distance:fmtD(distance) },
      { icon:'🚶', label:'Đi bộ',  speed:'5 km/h',                duration:fmt(distance / 1.35),   distance:fmtD(distance) },
      { icon:'🚌', label:'Xe buýt',speed:fmtSpd(carSpd * 0.65),  duration:fmt(duration * 1.45),   distance:fmtD(distance), estimated:true },
    ];
  } catch {
    // OSRM timeout/lỗi → Haversine (luôn hoạt động)
    return calcDirectionsLocal(fromLat, fromLng, toLat, toLng);
  }
}

// ── Map Panel ─────────────────────────────────────────────────
const MapPanel = ({ data, editedPlans, currentHotel, onClose, isDark }) => {
  const numDays = parseInt(data.days?.toString().split(' ')[0]) || 3;
  const allDays = (editedPlans && editedPlans.length > 0)
    ? editedPlans.map(d => {
        const dayItems = [];
        const processSession = (sessionData, sessionName, color, icon) => {
          if (!sessionData) return;
          const items = [];
          if (sessionData.food) items.push({ ...sessionData.food, type: 'food', session: sessionName, sessionColor: color, sessionIcon: icon });
          if (sessionData.tour) items.push({ ...sessionData.tour, type: 'tour', session: sessionName, sessionColor: color, sessionIcon: icon });
          if (sessionData.extras) {
            sessionData.extras.forEach(ex => {
              items.push({ ...ex, type: 'tour', session: sessionName, sessionColor: color, sessionIcon: icon });
            });
          }
          items.sort((a, b) => (a._order || 0) - (b._order || 0));
          dayItems.push(...items);
        };
        processSession(d.morning, 'Sáng', '#f59e0b', SESSION_META[0].icon);
        processSession(d.afternoon, 'Chiều', '#3b82f6', SESSION_META[1].icon);
        processSession(d.evening, 'Tối', '#8b5cf6', SESSION_META[2].icon);
        return dayItems.filter(item => item && (item.name || item.airline));
      })
    : buildDayPlaces(data);
  const [selectedDay, setSelectedDay] = useState(0);
  const [mapHtml,     setMapHtml]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingMsg,  setLoadingMsg]  = useState('');
  const [panelWidth,  setPanelWidth]  = useState(50);
  const [activeLeg,   setActiveLeg]   = useState(-1);
  const [resolvedMarkers, setResolvedMarkers] = useState([]); // markers đã có lat/lng
  const [directions,  setDirections]  = useState(null);
  const [loadingDir,  setLoadingDir]  = useState(false);
  const iframeRef  = React.useRef(null);
  const isDragging  = React.useRef(false);
  const modeScrollRef = React.useRef(null);

  // Gắn callback vào iframe sau khi load — nhận thông báo từ Leaflet
  const onIframeLoad = React.useCallback(() => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      // Leaflet gọi callback này mỗi khi highlight/reset thay đổi
      win._onHighlightChange = (legIdx) => setActiveLeg(legIdx);
    } catch {}
  }, []);

  // Sidebar gọi highlight → đồng bộ cả iframe lẫn activeLeg
  const callHighlight = React.useCallback((legIdx) => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win?.highlightLeg) return;
      if (activeLeg === legIdx) {
        win.resetRoutes(); // toggle off → Leaflet sẽ gọi _onHighlightChange(-1)
      } else {
        win.highlightLeg(legIdx); // Leaflet sẽ gọi _onHighlightChange(legIdx)
      }
    } catch {}
  }, [activeLeg]);

  // Fetch khoảng cách/thời gian khi activeLeg thay đổi
  // Dùng resolvedMarkers (đã có lat/lng) → getDirectionsOSRM (OSRM + Haversine fallback)
  useEffect(() => {
    if (activeLeg < 0 || resolvedMarkers.length < 2) { setDirections(null); return; }
    const from = resolvedMarkers[activeLeg];
    const to   = resolvedMarkers[activeLeg + 1];
    if (!from?.lat || !to?.lat) { setDirections(null); return; }
    setLoadingDir(true);
    getDirectionsOSRM(from.lat, from.lng, to.lat, to.lng).then(modes => {
      setDirections({ from, to, modes: modes || [] });
      setLoadingDir(false);
    }).catch(() => { setDirections(null); setLoadingDir(false); });
  }, [activeLeg, resolvedMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính markerIdx và legIdx cho 1 place trong dayPlaces
  // markers[] = [hotel(0), place0(1), place1(2), ..., placeN(N+1)]
  // leg[i] nối markers[i] → markers[i+1]
  // → place tại globalIdx trong dayPlaces có markerIdx = globalIdx+1
  // → leg đi ra = markerIdx (= globalIdx+1); leg đi vào = markerIdx-1 (= globalIdx)
  // → điểm cuối (markerIdx = markers.length-1) chỉ có leg vào = markerIdx-1
  //
  // Với leg[L]: đầu mút gồm markerIdx=L (từ) và markerIdx=L+1 (đến)
  // → place có globalIdx = L-1 (nếu L>0) và globalIdx = L (nếu L < dayPlaces.length)
  // → hotel (markerIdx=0) là đầu mút của leg[0]
  //
  // isMarkerActive(markerIdx): marker này thuộc đầu mút của activeLeg không?
  const isMarkerActive = (markerIdx) =>
    activeLeg >= 0 && (markerIdx === activeLeg || markerIdx === activeLeg + 1);

  const onDragStart = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'none';
    }
    const onMove = (ev) => {
      if (!isDragging.current) return;
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const pct = ((window.innerWidth - clientX) / window.innerWidth) * 100;
      setPanelWidth(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'auto';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  };
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
      window.removeEventListener('keydown', onKey); 
    };
  }, [onClose]);

  // ✅ ĐÃ SỬA: Ưu tiên lấy khách sạn mới (currentHotel) thay vì mặc định
  const hotelRaw = currentHotel || data.realHotels?.[0] || null;
  const hotelInfo = hotelRaw ? {
    name:      hotelRaw.name,
    lat:       hotelRaw.lat || hotelRaw.latitude || null,
    lng:       hotelRaw.lng || hotelRaw.longitude || null,
    thumbnail: hotelRaw.thumbnail || null,
    place_id:  hotelRaw.place_id || null,
  } : null;

  const dayPlacesForEffect = allDays[selectedDay] || [];
  const coordFingerprint = dayPlacesForEffect
    .filter(p => p.lat && p.lng)
    .map(p => `${p.name}:${p.lat},${p.lng}`)
    .join('|');
    
  // Dùng place_id (nếu có) làm định danh chính → tránh nhầm khi 2 ksạn trùng tên
  const hotelFingerprint = hotelInfo
    ? `${hotelInfo.place_id || hotelInfo.name}:${hotelInfo.lat},${hotelInfo.lng}`
    : 'no-hotel';

  useEffect(() => {
    let cancelled = false;
    const dayPlaces = allDays[selectedDay] || [];
    setLoading(true);
    setMapHtml('');
    setActiveLeg(-1);

    // ── Fast path: địa điểm đã có lat/lng từ backend → render ngay, xử lý hotel riêng ──
    const allHaveCoords = dayPlaces.length > 0 && dayPlaces.every(p => p.lat && p.lng);

    if (allHaveCoords) {
      const dayMarkers = dayPlaces.map(p => ({ ...p, lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));

      // Hotel đã có tọa độ → dùng luôn
      const hotelHasCoords = hotelInfo?.lat && hotelInfo?.lng;
      if (hotelHasCoords) {
        const hotelMarker = { ...hotelInfo, type: 'hotel', lat: parseFloat(hotelInfo.lat), lng: parseFloat(hotelInfo.lng) };
        const results = [hotelMarker, ...dayMarkers];
        if (!cancelled) {
          setResolvedMarkers(results);
          setMapHtml(buildLeafletHtml(results, isDark));
          setLoading(false);
        }
        return () => { cancelled = true; };
      }

      // Hotel thiếu tọa độ → render địa điểm trước, geocode hotel song song
      if (!cancelled) {
        setResolvedMarkers(dayMarkers);
        setMapHtml(buildLeafletHtml(dayMarkers, isDark));
        setLoading(false);
      }

      // Geocode hotel bất đồng bộ — khi xong thì prepend vào markers
      if (hotelInfo) {
        setLoadingMsg('Đang xác định vị trí khách sạn...');
        resolveMarkers(hotelInfo, [], data.location).then(resolved => {
          if (cancelled) return;
          const hotelMarker = resolved.find(m => m.type === 'hotel');
          if (hotelMarker) {
            const results = [hotelMarker, ...dayMarkers];
            setResolvedMarkers(results);
            setMapHtml(buildLeafletHtml(results, isDark));
          }
          setLoadingMsg('');
        });
      }

      return () => { cancelled = true; };
    }

    // ── Slow path: địa điểm thiếu tọa độ → geocode toàn bộ như cũ ──
    setLoadingMsg('Đang tìm tọa độ địa điểm...');
    resolveMarkers(hotelInfo, dayPlaces, data.location).then(results => {
      if (cancelled) return;
      if (results.length > 0) setLoadingMsg('');
      setResolvedMarkers(results);
      setMapHtml(buildLeafletHtml(results, isDark));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedDay, data.location, coordFingerprint, hotelFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const dayPlaces = allDays[selectedDay] || [];
  const typeColor = (t) => t === 'tour' ? '#8b5cf6' : '#f97316';
  const typeIcon  = (t) => t === 'tour' ? faMapLocationDot : faUtensils;

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes mbFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes mbSlideIn { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes mbSpin    { to{transform:rotate(360deg)} }
        .mb-panel   { animation: mbSlideIn 0.3s cubic-bezier(.22,1,.36,1) forwards; }
        .mb-overlay { animation: mbFadeIn  0.2s ease forwards; }
        .mb-daytab:hover   { background: ${isDark ? '#064e3b' : '#f0fdf4'} !important; }
        .mb-close:hover    { background: ${isDark ? '#7f1d1d' : '#fee2e2'} !important; color: ${isDark ? '#fca5a5' : '#ef4444'} !important; }
        .mb-placerow:hover { background: ${isDark ? '#1e293b' : '#f8fafc'} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mb-spin { animation: mbSpin 1s linear infinite; display:inline-block; }
        .mb-drag:hover .mb-drag-bar { background: linear-gradient(to bottom, transparent, #10b981, transparent) !important; }
        .mb-drag:hover .mb-grip     { border-color: #10b981 !important; }
        .mb-drag:hover .mb-dot      { background-color: #10b981 !important; }
        .mb-scroll-x { scrollbar-width: none; }
        .mb-scroll-x::-webkit-scrollbar { display: none; }

        /* ═══════════════════════════════════════
           📱 MapBubble — Mobile responsive
        ═══════════════════════════════════════ */
        @media (max-width: 768px) {
          /* Panel → centered modal */
          .mb-panel {
            top: 50% !important;
            right: auto !important;
            left: 50% !important;
            bottom: auto !important;
            transform: translate(-50%, -50%) !important;
            width: 85% !important;
            height: 85dvh !important;
            border-radius: 24px !important;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important;
          }
          /* Drag handle → hidden on centered modal */
          .mb-drag { display: none !important; }
          .mb-drag-bar {
            width: 40px !important;
            height: 4px !important;
            border-radius: 2px !important;
            background: #cbd5e1 !important;
          }
          .mb-grip { display: none !important; }
        }
        @media (max-width: 480px) {
          .mb-panel {
            height: 80dvh !important;
          }
        }
      `}</style>

      <div className="mb-overlay" onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', zIndex:999998 }} />

      <div className="mb-panel" style={{ position:'fixed', top:0, right:0, bottom:0, width:`${panelWidth}vw`, minWidth:280, backgroundColor: isDark ? '#0f172a' : 'white', zIndex:999999, display:'flex', flexDirection:'column', boxShadow:'-20px 0 60px rgba(0,0,0,0.25)' }}>
        
        {/* ── Thanh kéo resize ── */}
        <div className="mb-drag" onMouseDown={onDragStart} onTouchStart={onDragStart} title={`Kéo để thay đổi độ rộng (${panelWidth}%)`} style={{ position:"absolute", left:-8, top:0, bottom:0, width:20, cursor:"col-resize", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className="mb-drag-bar" style={{ width:4, height:"100%", background:`linear-gradient(to bottom, transparent 0%, ${isDark ? '#334155' : '#e2e8f0'} 20%, ${isDark ? '#334155' : '#e2e8f0'} 80%, transparent 100%)`, transition:"background 0.15s" }} />
          <div className="mb-grip" style={{ position:"absolute", top:"50%", transform:"translateY(-50%)", width:22, height:52, borderRadius:11, backgroundColor: isDark ? '#1e293b' : 'white', border:`1.5px solid ${isDark ? '#334155' : '#d1d5db'}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", transition:"border-color 0.15s" }}>
            <div className="mb-dot" style={{ width:3, height:3, borderRadius:"50%", backgroundColor: isDark ? '#475569' : '#9ca3af', transition:"background 0.15s" }} />
            <div className="mb-dot" style={{ width:3, height:3, borderRadius:"50%", backgroundColor: isDark ? '#475569' : '#9ca3af', transition:"background 0.15s" }} />
            <div className="mb-dot" style={{ width:3, height:3, borderRadius:"50%", backgroundColor: isDark ? '#475569' : '#9ca3af', transition:"background 0.15s" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:14, background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(16,185,129,0.4)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.95"/>
                <circle cx="12" cy="9" r="2.5" fill="#10b981"/>
                <path d="M3 19h18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
                <path d="M6 16l3-2 4 2 3-2 2 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color: isDark ? '#f1f5f9' : '#111827' }}>Bản đồ hành trình · {data.location}</div>
              <div style={{ fontSize:12, color: isDark ? '#64748b' : '#9ca3af' }}>{numDays} ngày · {dayPlaces.length} địa điểm hôm nay</div>
            </div>
          </div>
          <button className="mb-close" onClick={onClose} style={{ width:38, height:38, borderRadius:'50%', border:'none', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'0.15s', fontSize:16, color: isDark ? '#94a3b8' : '#374151' }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Tab ngày */}
        <div style={{ display:'flex', gap:8, padding:'14px 24px', borderBottom:`1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, flexShrink:0, overflowX:'auto' }}>
          {Array.from({ length: numDays }, (_, i) => (
            <button key={i} className="mb-daytab" onClick={() => setSelectedDay(i)} style={{ padding:'8px 20px', borderRadius:99, border:'1.5px solid #10b981', background: selectedDay===i ? '#10b981' : isDark ? '#0f172a' : 'white', color: selectedDay===i ? 'white':'#10b981', fontWeight:800, fontSize:14, cursor:'pointer', whiteSpace:'nowrap', transition:'0.15s' }}>
              Ngày {i + 1}
            </button>
          ))}
        </div>

        {/* Map + List */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {/* Bản đồ */}
          <div style={{ flex:'0 0 55%', borderRight:`1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, position:'relative', background: isDark ? '#0f172a' : '#f8fafc' }}>
            {loading && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color: isDark ? '#64748b' : '#9ca3af', zIndex:10 }}>
                <FontAwesomeIcon icon={faSpinner} className="mb-spin" style={{ fontSize:28, color:'#10b981' }} />
                <div style={{ fontSize:13, fontWeight:600, color: isDark ? '#94a3b8' : undefined }}>{loadingMsg}</div>
                <div style={{ fontSize:11, color: isDark ? '#475569' : '#d1d5db' }}>Đang geocode {dayPlaces.length} địa điểm...</div>
              </div>
            )}
            {!loading && mapHtml && (
              <iframe
                ref={iframeRef}
                onLoad={onIframeLoad}
                key={selectedDay + coordFingerprint + hotelFingerprint}
                title="leaflet-map"
                width="100%" height="100%"
                style={{ border:0, display:'block' }}
                srcDoc={mapHtml}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>

          {/* Danh sách + Directions panel */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>

            {/* Khách sạn — markerIdx=0, là đầu mút của leg[0] */}
            {hotelInfo && (() => {
              const markerIdx = 0;
              const legIdx    = 0; // leg ra từ KS
              const isActive  = isMarkerActive(markerIdx);
              return (
                <div style={{ marginBottom:4 }}>
                  <div style={{ padding:'8px 20px', display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:800, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.5px', position:'sticky', top:0, background: isDark ? '#0f172a' : 'white', zIndex:1, borderBottom:`1px solid ${isDark ? '#1e293b' : '#f8fafc'}` }}>
                    🏨 Điểm xuất phát
                  </div>
                  <div style={{ padding:'8px 20px' }}>
                    <div
                      className="mb-placerow"
                      onClick={() => callHighlight(legIdx)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 8px', borderRadius:12, cursor:'pointer', transition:'0.15s', background: isActive ? '#10b98118' : 'transparent', outline: isActive ? '2px solid #10b98150' : 'none' }}
                    >
                      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background: isActive ? '#059669' : '#10b981', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', border:'2px solid white', transition:'0.15s' }}>
                        {hotelInfo.thumbnail
                          ? <img src={proxyImg(hotelInfo.thumbnail)} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} onError={e => { e.target.onerror=null; e.target.style.display='none'; }} />
                          : <span style={{ fontSize:14 }}>🏨</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:16, fontWeight:800, color: isDark ? '#f1f5f9' : '#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{hotelInfo.name}</div>
                        <div style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>
                          Khách sạn · Điểm O
                          {isActive && <span style={{ marginLeft:6, fontSize:10, opacity:0.8 }}>↗ highlight</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {SESSION_META.map((session) => {
              const sp = dayPlaces.filter(p => p.session === session.label);
              return (
                <div key={session.key} style={{ marginBottom:4 }}>
                  <div style={{ padding:'8px 20px', display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:800, color:session.color, textTransform:'uppercase', letterSpacing:'0.5px', position:'sticky', top:0, background: isDark ? '#0f172a' : 'white', zIndex:1, borderBottom:`1px solid ${isDark ? '#1e293b' : '#f8fafc'}` }}>
                    <FontAwesomeIcon icon={session.icon} /> Buổi {session.label}
                  </div>
                  <div style={{ padding:'4px 20px', position:'relative' }}>
                    {sp.length > 1 && <div style={{ position:'absolute', left:36, top:24, bottom:24, width:2, backgroundColor: isDark ? '#1e293b' : '#e2e8f0', zIndex:0 }} />}
                    {sp.map((place, pi) => {
                      const globalIdx = dayPlaces.indexOf(place);
                      const markerIdx = globalIdx + 1; // +1 vì hotel ở index 0
                      const clickLeg  = markerIdx - 1;
                      // Row sáng nếu marker này là đầu hoặc cuối của activeLeg
                      const isActive  = isMarkerActive(markerIdx);
                      return (
                        <div
                          key={pi}
                          className="mb-placerow"
                          onClick={() => callHighlight(clickLeg)}
                          style={{
                            display:'flex', alignItems:'center', gap:12, padding:'10px 8px',
                            borderRadius:12, cursor:'pointer', transition:'0.15s',
                            position:'relative', zIndex:1, marginBottom:2,
                            background: isActive ? `${session.color}18` : 'transparent',
                            outline: isActive ? `2px solid ${session.color}50` : 'none',
                          }}
                        >
                          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background: isActive ? session.color : typeColor(place.type), display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', border:'2px solid white', transition:'0.15s' }}>
                            {place.thumbnail
                              ? <img src={proxyImg(place.thumbnail)} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} onError={e => { e.target.onerror=null; e.target.style.display='none'; }} />
                              : <FontAwesomeIcon icon={typeIcon(place.type)} style={{ color:'white', fontSize:13 }} />}
                          </div>
                          <div style={{ position:'absolute', left:34, top:8, width:14, height:14, borderRadius:'50%', backgroundColor: isDark ? '#0f172a' : 'white', border:`1.5px solid ${isActive ? session.color : typeColor(place.type)}`, fontSize:8, fontWeight:900, color: isActive ? session.color : typeColor(place.type), display:'flex', alignItems:'center', justifyContent:'center', zIndex:2, transition:'0.15s' }}>
                            {globalIdx + 1}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:16, fontWeight:isActive?900:800, color: isDark ? '#f1f5f9' : '#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{place.name}</div>
                            <div style={{ fontSize:12, color: isActive ? session.color : typeColor(place.type), fontWeight:700 }}>
                              {place.type === 'tour' ? '📍 Tham quan' : '🍜 Ăn uống'}
                              {isActive && <span style={{ marginLeft:6, fontSize:10, opacity:0.8 }}>↗ highlight</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

            {/* Panel khoảng cách & thời gian khi highlight */}
            <div style={{
              flexShrink:0,
              borderTop: activeLeg >= 0 ? '1.5px solid #d1fae5' : `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
              background: activeLeg >= 0 ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#0f172a' : '#fafafa'),
              transition:'background 0.25s',
              padding: activeLeg >= 0 ? '12px 14px 14px' : '9px 14px',
              display:'flex', flexDirection:'column', gap:10,
            }}>

              {/* Trạng thái rỗng */}
              {activeLeg < 0 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color: isDark ? '#475569' : '#9ca3af', fontSize:12 }}>
                  <span>👆</span> Click vào đường hoặc địa điểm để xem khoảng cách
                </div>
              )}

              {activeLeg >= 0 && (
                <>
                  {/* ── Header: lộ trình + khoảng cách ── */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#059669)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 6px rgba(16,185,129,0.35)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="white"/>
                      </svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, color: isDark ? '#64748b' : '#6b7280', fontWeight:700, letterSpacing:'0.3px', textTransform:'uppercase' }}>Lộ trình</div>
                      <div style={{ fontSize:12, fontWeight:800, color: isDark ? '#34d399' : '#065f46', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        {directions
                          ? <>{directions.from?.name}<span style={{ color:'#10b981', margin:'0 4px', fontWeight:900 }}>→</span>{directions.to?.name}</>
                          : 'Đang tải...'}
                      </div>
                    </div>
                    {!loadingDir && directions?.modes?.[0] && (
                      <div style={{
                        flexShrink:0, background:'linear-gradient(135deg,#10b981,#059669)',
                        borderRadius:20, padding:'4px 12px',
                        fontSize:12, fontWeight:900, color:'white',
                        whiteSpace:'nowrap', boxShadow:'0 2px 6px rgba(16,185,129,0.3)',
                        letterSpacing:'0.2px',
                      }}>
                        {directions.modes[0].distance}{directions.modes[0].estimated ? ' ~' : ''}
                      </div>
                    )}
                  </div>

                  {/* ── Loading ── */}
                  {loadingDir && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, color: isDark ? '#64748b' : '#6b7280', fontSize:12, padding:'8px 0' }}>
                      <FontAwesomeIcon icon={faSpinner} style={{ animation:'mbSpin 1s linear infinite', color:'#10b981', fontSize:14 }} />
                      Đang tính thời gian di chuyển...
                    </div>
                  )}

                  {/* ── Scroll ngang các phương tiện — Glassmorphism ── */}
                  {!loadingDir && directions?.modes?.length > 0 && (() => {
                    const styleMap = {
                      '🚗':  { from:'#3b82f6', to:'#06b6d4' },
                      '🏍️': { from:'#f97316', to:'#fbbf24' },
                      '🚲':  { from:'#22c55e', to:'#10b981' },
                      '🚶':  { from:'#a855f7', to:'#ec4899' },
                      '🚌':  { from:'#f43f5e', to:'#f97316' },
                    };
                    const scroll = (dir) => {
                      if (modeScrollRef.current) modeScrollRef.current.scrollBy({ left: dir * 100, behavior:'smooth' });
                    };
                    return (
                      <div style={{ position:'relative', overflow:'hidden', padding:'0 2px' }}>
                        {/* Nút trái */}
                        <button onClick={() => scroll(-1)} style={{
                          position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)',
                          zIndex:2, width:26, height:26, borderRadius:'50%',
                          border:`1.5px solid ${isDark ? '#334155' : '#d1d5db'}`, background: isDark ? '#1e293b' : 'white',
                          boxShadow:'0 2px 6px rgba(0,0,0,0.15)',
                          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, color: isDark ? '#94a3b8' : '#374151', padding:0,
                        }}>‹</button>

                        {/* Cards */}
                        <div ref={modeScrollRef} className="mb-scroll-x" style={{
                          display:'flex', gap:8,
                          overflowX:'auto',
                          paddingBottom:6,
                          paddingLeft:22, paddingRight:22,
                          scrollbarWidth:'none',
                          msOverflowStyle:'none',
                        }}>
                          {directions.modes.map((m, i) => {
                            const s = styleMap[m.icon] || { from:'#64748b', to:'#94a3b8' };
                            return (
                              <div key={i} style={{
                                flexShrink:0, width:82,
                                borderRadius:20,
                                background:`linear-gradient(145deg, ${s.from}, ${s.to})`,
                                padding:'12px 8px 10px',
                                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                                boxShadow:`0 8px 20px ${s.from}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
                                border:'1px solid rgba(255,255,255,0.3)',
                                backdropFilter:'blur(10px)',
                                position:'relative', overflow:'hidden',
                              }}>
                                {/* Glare highlight */}
                                <div style={{
                                  position:'absolute', top:-18, left:-18,
                                  width:60, height:60, borderRadius:'50%',
                                  background:'rgba(255,255,255,0.18)',
                                  pointerEvents:'none',
                                }}/>
                                <span style={{ fontSize:24, lineHeight:1, filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>
                                  {m.icon}
                                </span>
                                <div style={{ fontSize:13, fontWeight:900, color:'white', letterSpacing:'-0.3px', textShadow:'0 1px 4px rgba(0,0,0,0.2)' }}>
                                  {m.duration}
                                </div>
                                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.85)' }}>
                                  {m.label}
                                </div>
                                {/* Speed pill */}
                                <div style={{
                                  background:'rgba(255,255,255,0.22)',
                                  border:'1px solid rgba(255,255,255,0.4)',
                                  borderRadius:99, padding:'2px 8px',
                                  fontSize:10, fontWeight:800, color:'white',
                                  backdropFilter:'blur(4px)',
                                  letterSpacing:'0.2px',
                                }}>
                                  {m.speed}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Nút phải */}
                        <button onClick={() => scroll(1)} style={{
                          position:'absolute', right:-8, top:'50%', transform:'translateY(-50%)',
                          zIndex:2, width:26, height:26, borderRadius:'50%',
                          border:`1.5px solid ${isDark ? '#334155' : '#d1d5db'}`, background: isDark ? '#1e293b' : 'white',
                          boxShadow:'0 2px 6px rgba(0,0,0,0.15)',
                          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, color: isDark ? '#94a3b8' : '#374151', padding:0,
                        }}>›</button>
                      </div>
                    );
                  })()}

                  {!loadingDir && (!directions?.modes || directions.modes.length === 0) && (
                    <div style={{ fontSize:12, color: isDark ? '#475569' : '#9ca3af', textAlign:'center', padding:'6px 0' }}>Không lấy được dữ liệu di chuyển</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </>,
    document.body
  );
};

// ── Nút tròn gốc ─────────────────────────────────────────────
const MapBubble = ({ targetOffset = 450, data, editedPlans, isDark }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [open,      setOpen]      = useState(false);
  const [pulse,     setPulse]     = useState(false);
  
  // ✅ ĐÃ SỬA: Quản lý riêng khách sạn để cập nhật mượt mà
  const [currentHotel, setCurrentHotel] = useState(null);

  useEffect(() => {
    if (data?.realHotels?.[0]) setCurrentHotel(data.realHotels[0]);
  }, [data]);

  // Lắng nghe sự kiện khi đổi khách sạn ở màn Lịch trình
  useEffect(() => {
    const handleHotelChange = (e) => {
      const incoming = e.detail;
      if (!incoming) return;
      // Nếu hotel mới chưa có tọa độ, thử tìm trong realHotels theo place_id hoặc tên
      const hasCoord = incoming.lat || incoming.latitude || incoming.lng || incoming.longitude;
      if (!hasCoord && data?.realHotels?.length) {
        const match = data.realHotels.find(h =>
          (incoming.place_id && h.place_id && h.place_id === incoming.place_id) ||
          h.name === incoming.name
        );
        if (match) { setCurrentHotel({ ...incoming, lat: match.lat, lng: match.lng, place_id: match.place_id }); return; }
      }
      setCurrentHotel(incoming);
    };
    window.addEventListener('sTripHotelChanged', handleHotelChange);
    return () => window.removeEventListener('sTripHotelChanged', handleHotelChange);
  }, [data]);

  useEffect(() => {
    if (data) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(t);
    }
  }, [data]);

  return (
    <>
      <style>{`
        @keyframes mbPulse {
          0%,100% { box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 0 0 0   rgba(16,185,129,0.6); }
          50%      { box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 0 0 16px rgba(16,185,129,0); }
        }
        @media (max-width: 768px) {
          .mb-bubble-btn {
            width: 60px !important;
            height: 60px !important;
            right: 20px !important;
            bottom: 100px !important;
            border: 2.5px solid white !important;
          }
        }
        @media (max-width: 480px) {
          .mb-bubble-btn {
            right: 16px !important;
            bottom: 96px !important;
          }
        }
      `}</style>
      <div
        onClick={() => { if (data) setOpen(true); else window.scrollTo({ top: targetOffset, behavior: 'smooth' }); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="mb-bubble-btn"
        style={{
          position:'fixed', right:'50px', bottom:'150px',
          width:'80px', height:'80px', borderRadius:'50%',
          cursor:'pointer', zIndex:1999, border:'3px solid white',
          display:'flex', justifyContent:'center', alignItems:'center', overflow:'hidden',
          boxShadow: isHovered ? '0 15px 35px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.3)',
          transition:'0.3s all cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isHovered ? 'scale(1.1) rotate(10deg)' : 'scale(1) rotate(0deg)',
          backgroundImage:`url('/map.jpg')`, backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat',
          filter: isHovered ? 'brightness(1.1)' : 'brightness(1.2)',
          animation: pulse && data ? 'mbPulse 1s ease 3' : 'none',
        }}
        title={data ? 'Xem bản đồ hành trình' : 'Cuộn đến bản đồ'}
      >
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundColor: isHovered ? 'rgba(255,255,255,0.1)':'rgba(255,255,255,0)', transition:'0.3s' }} />
      </div>
      
      {open && data && <MapPanel data={data} editedPlans={editedPlans} currentHotel={currentHotel} onClose={() => setOpen(false)} isDark={isDark} />}
    </>
  );
};

export default MapBubble;