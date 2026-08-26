'use client';

import { useCallback, useEffect, useState } from 'react';

type GalleryImage = {
  sourceUrl: string;
  altText: string;
};

export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const previous = useCallback(
    () => setSelected((current) => (current - 1 + images.length) % Math.max(images.length, 1)),
    [images.length],
  );
  const next = useCallback(
    () => setSelected((current) => (current + 1) % Math.max(images.length, 1)),
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, next, previous]);

  if (!images.length) {
    return <div className="df-product-empty-image">Image not supplied</div>;
  }

  const active = images[selected] ?? images[0]!;
  return (
    <div className="df-gallery-experience">
      <div className="df-gallery-stage">
        <button
          aria-label={`Open full-screen image ${selected + 1}`}
          className="df-gallery-zoom"
          onClick={() => setLightboxOpen(true)}
          type="button"
        >
          <img alt={active.altText} src={active.sourceUrl} />
        </button>
        <button
          aria-label="Previous image"
          className="df-gallery-arrow is-previous"
          disabled={images.length < 2}
          onClick={previous}
          type="button"
        >
          ←
        </button>
        <button
          aria-label="Next image"
          className="df-gallery-arrow is-next"
          disabled={images.length < 2}
          onClick={next}
          type="button"
        >
          →
        </button>
        <span className="df-gallery-count">
          {selected + 1} / {images.length}
        </span>
      </div>
      {images.length > 1 ? (
        <div className="df-gallery-thumbnails" aria-label={`${title} image gallery`}>
          {images.map((image, index) => (
            <button
              aria-label={`Show image ${index + 1}`}
              aria-pressed={selected === index}
              key={`${image.sourceUrl}-${index}`}
              onClick={() => setSelected(index)}
              type="button"
            >
              <img alt="" src={image.sourceUrl} />
            </button>
          ))}
        </div>
      ) : null}
      {lightboxOpen ? (
        <div
          aria-label={`${title} full-screen gallery`}
          aria-modal="true"
          className="df-gallery-lightbox"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
          role="dialog"
        >
          <button
            aria-label="Close gallery"
            className="df-gallery-close"
            onClick={() => setLightboxOpen(false)}
            type="button"
          >
            ×
          </button>
          <button
            aria-label="Previous image"
            className="df-gallery-arrow is-previous"
            onClick={previous}
            type="button"
          >
            ←
          </button>
          <img alt={active.altText} src={active.sourceUrl} />
          <button
            aria-label="Next image"
            className="df-gallery-arrow is-next"
            onClick={next}
            type="button"
          >
            →
          </button>
          <span className="df-gallery-count">
            {selected + 1} / {images.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}
