"use client";
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Carousel({ images, alt, autoPlay = false, switchTime, hideControls = false }: { images: string[], alt: string, autoPlay?: boolean, switchTime?: number, hideControls?: boolean }) {
  const [index, setIndex] = useState(0);
  const isVideo = (url: string) => /\.(mp4|webm)(?:$|[?#])/i.test(url);

  const prev = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex(i => i === 0 ? images.length - 1 : i - 1); }
  const next = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex(i => i === images.length - 1 ? 0 : i + 1); }

  useEffect(() => {
    if (autoPlay && images.length > 1 && switchTime) {
      const ms = switchTime * 1000;
      const timer = setInterval(() => {
        setIndex(i => (i === images.length - 1 ? 0 : i + 1));
      }, ms);
      return () => clearInterval(timer);
    }
  }, [autoPlay, images.length, switchTime]);

  if (!images || images.length === 0) return null;
  if (images.length === 1) {
    return isVideo(images[0]) ? <video src={images[0]} autoPlay loop muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f3f4ee' }} className="banner-video"/> : <img src={images[0]} alt={alt} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/cushion.png'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f3f4ee' }} className="banner-video"/>;
  }


  return (
    <div className="product-carousel-wrapper" style={{height: '100%'}}>
      {isVideo(images[index]) ? <video key={images[index]} src={images[index]} autoPlay loop muted playsInline preload="metadata" style={{height: '100%', width: '100%', objectFit: 'cover'}} className="banner-video"/> : <img src={images[index]} alt={`${alt} - Image ${index + 1}`} loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/cushion.png'; }} style={{height: '100%', width: '100%', objectFit: 'cover'}} className="banner-video"/>}
      {!hideControls && (
        <>
          <button onClick={prev} className="carousel-btn prev-btn" aria-label="Previous image"><ChevronLeft size={28} /></button>
          <button onClick={next} className="carousel-btn next-btn" aria-label="Next image"><ChevronRight size={28} /></button>
          <div className="carousel-dots">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIndex(i); }} className={`carousel-dot ${i === index ? 'active' : ''}`} aria-label={`Go to image ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
