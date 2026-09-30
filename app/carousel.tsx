"use client";
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Carousel({ images, alt, autoPlay = true, switchTime = 3, hideControls = false }: { images: string[], alt: string, autoPlay?: boolean, switchTime?: number, hideControls?: boolean }) {
  const [index, setIndex] = useState(0);
  const slides = images.map((image) => image.trim()).filter(Boolean);
  const activeIndex = Math.min(index, Math.max(slides.length - 1, 0));
  const isVideo = (url: string) => /\.(mp4|webm)(?:$|[?#])/i.test(url);

  const prev = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex(i => i === 0 ? slides.length - 1 : i - 1); }
  const next = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex(i => i === slides.length - 1 ? 0 : i + 1); }

  useEffect(() => {
    if (!slides.length) return;
    setIndex((i) => Math.min(i, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    if (
      autoPlay &&
      slides.length > 1 &&
      switchTime > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const ms = switchTime * 1000;
      const timer = setInterval(() => {
        setIndex(i => (i === slides.length - 1 ? 0 : i + 1));
      }, ms);
      return () => clearInterval(timer);
    }
  }, [autoPlay, slides.length, switchTime]);

  if (!slides.length) return null;
  if (slides.length === 1) {
    return isVideo(slides[0]) ? <video src={slides[0]} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f3f4ee' }} className="banner-video"/> : <img src={slides[0]} alt={alt} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/cushion.png'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f3f4ee' }} className="banner-video"/>;
  }


  return (
    <div className="product-carousel-wrapper" style={{height: '100%'}}>
      {isVideo(slides[activeIndex]) ? <video key={slides[activeIndex]} src={slides[activeIndex]} autoPlay loop muted playsInline preload="metadata" style={{height: '100%', width: '100%', objectFit: 'cover'}} className="banner-video"/> : <img src={slides[activeIndex]} alt={`${alt} - Image ${activeIndex + 1}`} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/cushion.png'; }} style={{height: '100%', width: '100%', objectFit: 'cover'}} className="banner-video"/>}
      {!hideControls && (
        <>
          <button onClick={prev} className="carousel-btn prev-btn" aria-label="Previous image"><ChevronLeft size={28} /></button>
          <button onClick={next} className="carousel-btn next-btn" aria-label="Next image"><ChevronRight size={28} /></button>
          <div className="carousel-dots">
            {slides.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIndex(i); }} className={`carousel-dot ${i === activeIndex ? 'active' : ''}`} aria-label={`Go to image ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
