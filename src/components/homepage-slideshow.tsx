"use client";

import { useEffect, useState } from "react";

type Slide = { imageUrl?: string; videoUrl?: string; imageAlt?: string; eyebrow?: string; title?: string; body?: string; ctaLabel?: string; ctaHref?: string };

export function HomepageSlideshow({ title, slides }: { title: string; slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const timer = window.setInterval(() => setActive(current => (current + 1) % slides.length), 6500); return () => window.clearInterval(timer); }, [slides.length, paused]);
  if (!slides.length) return null;
  const safeActiveIndex = Math.min(active, slides.length - 1);
  const slide = slides[safeActiveIndex];
  return <section className="storefront-slideshow" aria-label={title}>
    <div className="storefront-slideshow__media">{slide.videoUrl ? <video key={slide.videoUrl} className="storefront-slideshow__video" src={slide.videoUrl} poster={slide.imageUrl || undefined} autoPlay muted loop playsInline aria-label={slide.imageAlt || slide.title || title} /> : slide.imageUrl ? <div className="storefront-slideshow__image" role="img" aria-label={slide.imageAlt || slide.title || title} style={{ backgroundImage: 'url("' + slide.imageUrl + '")' }} /> : null}</div>
    <div className="storefront-slideshow__shade" /><div className="storefront-slideshow__content">{slide.eyebrow && <p className="editorial-eyebrow"><span />{slide.eyebrow}</p>}{slide.title && <h2>{slide.title}</h2>}{slide.body && <p>{slide.body}</p>}{slide.ctaLabel && slide.ctaHref && <a className="editorial-cta" href={slide.ctaHref}>{slide.ctaLabel}</a>}</div>
    {slides.length > 1 && <div className="storefront-slideshow__controls" aria-label="Choose featured slide"><button type="button" className="storefront-slideshow__pause" aria-pressed={paused} aria-label={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused(value => !value)}>{paused ? "PLAY" : "PAUSE"}</button>{slides.map((item,index)=><button key={index} type="button" aria-label={"Show slide "+(index+1)} aria-current={index===safeActiveIndex ? "true" : undefined} onClick={()=>setActive(index)}><span /></button>)}</div>}
  </section>;
}