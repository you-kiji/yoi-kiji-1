"use client";

type Slide = { type: "IMAGE" | "VIDEO"; url: string; alt?: string; assetId?: string };

export function HomepageIntroMedia({ slides }: { slides: Slide[] }) {
  if (!slides.length) return null;
  return (
    <section className="homepage-intro-media" aria-label="Introduction">
      <div className="homepage-intro-media__track">
        {slides.map((slide, index) => (
          <div className="homepage-intro-media__item" key={slide.assetId || slide.url || index}>
            {slide.type === "VIDEO" ? (
              <video src={slide.url} autoPlay muted loop playsInline preload={index === 0 ? "auto" : "metadata"} aria-label={slide.alt || ""} />
            ) : (
              <img src={slide.url} alt={slide.alt || ""} loading={index === 0 ? "eager" : "lazy"} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
