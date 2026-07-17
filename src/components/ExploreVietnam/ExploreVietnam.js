import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars, Float, ContactShadows } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Map3D from './Map3D';
import './ExploreVietnam.css';

export default function ExploreVietnam({ isEmbedded, mode = 'full' }) {
  const [selectedProvince, setSelectedProvince] = useState(null);
  const navigate = useNavigate();

  const isHero = mode === 'hero';

  // Global click listener to allow deselecting by clicking anywhere outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setSelectedProvince(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div 
      className="explore-container" 
      onClick={(e) => {
        // Stop propagation so clicking inside the container doesn't trigger the global listener immediately.
        // The Canvas onPointerMissed handles clicks inside the canvas background.
        e.stopPropagation();
      }}
      style={isHero ? { background: 'transparent', width: '100%', height: '100%', minHeight: '500px', pointerEvents: 'auto' } : {}}
    >
      {/* UI Overlay */}
      {/* Left Sidebar */}


      {!isEmbedded && !isHero && (
        <button className="explore-back-btn" onClick={() => navigate('/')} style={{ position: 'absolute', top: 40, right: 40, zIndex: 30 }}>
          <ArrowLeft size={20} /> Về Trang Chủ
        </button>
      )}

      {/* Info Panel */}
      <div className={`explore-info-panel ${selectedProvince ? 'visible' : ''}`} style={isHero ? { left: 'auto', right: '20px', top: '15%', bottom: 'auto', width: '320px', transform: 'none', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)' } : {}}>
        {selectedProvince && (
          <>
            <h2 className="info-province-name" style={isHero ? { fontSize: '20px', color: '#0284c7', textShadow: 'none' } : {}}>{selectedProvince.displayName || selectedProvince.name}</h2>
            
            <div className="info-fact" style={isHero ? { background: 'rgba(0, 0, 0, 0.03)', borderLeftColor: '#d97706' } : {}}>
              <div className="info-fact-title" style={isHero ? { fontSize: '12px', color: '#d97706' } : {}}>💡 Giới thiệu ngắn</div>
              <div className="info-fact-content" style={isHero ? { fontSize: '12px', color: '#475569' } : {}}>{selectedProvince.fact}</div>
            </div>

            <div className="info-stat" style={isHero ? { marginTop: '10px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' } : { marginTop: '10px' }}>
              <span className="info-stat-label" style={isHero ? { fontSize: '12px', color: '#64748b' } : {}}>👥 Dân số</span>
              <span className="info-stat-value" style={isHero ? { fontSize: '12px', color: '#0f172a' } : {}}>{selectedProvince.population}</span>
            </div>
            <div className="info-stat" style={isHero ? { borderBottom: 'none' } : {}}>
              <span className="info-stat-label" style={isHero ? { fontSize: '12px', color: '#64748b' } : {}}>📏 Diện tích</span>
              <span className="info-stat-value" style={isHero ? { fontSize: '12px', color: '#0f172a' } : {}}>{selectedProvince.area}</span>
            </div>
          </>
        )}
      </div>

      <div className="canvas-wrapper">
        <Canvas 
          camera={{ position: [0, 0, 42], fov: 45 }} 
          style={{ width: '100%', height: '100%' }}
          onPointerMissed={() => setSelectedProvince(null)}
          gl={{ alpha: true }}
          dpr={[1, 1.5]}
        >
          {!isHero && <color attach="background" args={['#0f0f1a']} />}
          <ambientLight intensity={isHero ? 0.8 : 0.4} />
          <directionalLight position={[10, 10, 10]} intensity={isHero ? 2.5 : 1.5} color={isHero ? "#ffffff" : "#00f2fe"} />
          <directionalLight position={[-10, -10, -10]} intensity={isHero ? 1.0 : 0.5} color="#f6d365" />
          
          <Suspense fallback={null}>
            {!isHero && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
            
            {isHero ? (
              <Map3D 
                onSelectProvince={setSelectedProvince} 
                selectedProvince={selectedProvince} 
                position={[-1.5, 0, 0]}
                scale={[1, 1, 1]}
                isHero={true}
              />
            ) : (
              <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
                <Map3D 
                  onSelectProvince={setSelectedProvince} 
                  selectedProvince={selectedProvince} 
                  position={[-1, 1, 0]}
                  scale={[1, 1, 1]}
                  isHero={false}
                />
              </Float>
            )}

            <ContactShadows position={[0, -5, 0]} opacity={0.4} scale={50} blur={2} far={10} />
            <Environment preset="city" />
          </Suspense>
          
          <OrbitControls 
            enablePan={!isHero}
            enableZoom={!isHero}
            enableRotate={!isHero}
            minPolarAngle={isHero ? Math.PI / 2 : 0}
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={40}
            target={[0, 0, 0]}
          />
            minDistance={5}
            maxDistance={40}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}
