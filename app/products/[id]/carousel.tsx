"use client";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Carousel({ images, alt }: { images: string[], alt: string }) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;
  if (images.length === 1) {
    return <img src={images[0]} alt={alt} decoding="async" style={{ width: '100%', maxHeight: '650px', objectFit: 'contain', background: '#f3f4ee' }} />;
  }

  const prev = () => setIndex(i => i === 0 ? images.length - 1 : i - 1);
  const next = () => setIndex(i => i === images.length - 1 ? 0 : i + 1);

  return (
    <div className="product-carousel-wrapper">
      <img src={images[index]} alt={`${alt} - Image ${index + 1}`} decoding="async" />
      <button onClick={prev} className="carousel-btn prev-btn" aria-label="Previous image"><ChevronLeft size={28} /></button>
      <button onClick={next} className="carousel-btn next-btn" aria-label="Next image"><ChevronRight size={28} /></button>
      <div className="carousel-dots">
        {images.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`carousel-dot ${i === index ? 'active' : ''}`} aria-label={`Go to image ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
