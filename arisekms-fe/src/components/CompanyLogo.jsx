import { useEffect, useRef, useState } from 'react';

import defaultLogoUrl from '../arise-ph_logo.png';

const STORAGE_KEY = 'kms-company-logo';

// Company logo slot (reestly pattern): shows the workspace logo, falls back to
// the ARISE mark. Click to upload a custom logo (persisted to localStorage),
// double-click to reset to the default.
export function CompanyLogo({ size = 40 }) {
  const [custom, setCustom] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      setCustom(localStorage.getItem(STORAGE_KEY));
    } catch {
      setCustom(null);
    }
  }, []);

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(STORAGE_KEY, reader.result);
      } catch {
        // Storage full or unavailable — keep the in-memory logo only.
      }
      setCustom(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — clear the in-memory logo only.
    }
    setCustom(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDoubleClick={reset}
        title="Click to upload your company logo, double-click to reset"
        className="grid shrink-0 place-items-center overflow-hidden rounded-sm bg-white transition-colors"
        style={{ width: size, height: size }}
      >
        <img
          src={custom ?? defaultLogoUrl}
          alt="Company logo"
          className="size-full object-contain"
        />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </>
  );
}
