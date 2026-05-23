"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Props = {
  href: string;
  nombre: string;
  imagenUrl: string | null;
  videoUrl: string | null;
  grupos: string[];
};

export function TarjetaEjercicio({
  href,
  nombre,
  imagenUrl,
  videoUrl,
  grupos,
}: Props) {
  const [hover, setHover] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onEnter = () => {
    setHover(true);
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {});
    }
  };

  const onLeave = () => {
    setHover(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <Link
      href={href}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="group block bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition"
    >
      <div className="aspect-[4/3] bg-neutral-900 relative">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt=""
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-200 " +
              (hover && videoUrl ? "opacity-0" : "opacity-100")
            }
          />
        ) : !videoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-700 text-xs">
            Sin imagen
          </div>
        ) : null}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-200 " +
              (hover ? "opacity-100" : "opacity-0")
            }
          />
        )}
        {videoUrl && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
            ▶ Vídeo
          </div>
        )}
      </div>
      <div className="p-3">
        <div
          className="text-sm font-medium line-clamp-2 mb-1.5 group-hover:text-brand-500 transition"
          title={nombre}
        >
          {nombre}
        </div>
        <div className="flex flex-wrap gap-1">
          {grupos.slice(0, 3).map((g) => (
            <span
              key={g}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400"
            >
              {g}
            </span>
          ))}
          {grupos.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 text-neutral-500">
              +{grupos.length - 3}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
