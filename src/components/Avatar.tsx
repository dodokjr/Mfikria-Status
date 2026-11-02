'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Foto profil GitHub; bila gagal dimuat atau tidak ada, tampilkan inisial. */
export function Avatar({ name, login, src, size = 36 }: { name: string; login?: string; src?: string; size?: number }) {
  const url = src ?? (login && LOGIN_RE.test(login) ? `https://github.com/${login}.png?size=${size * 2}` : null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImg = !!url && failedUrl !== url;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white ring-1 ring-slate-700"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      aria-hidden="true"
    >
      {showImg ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}