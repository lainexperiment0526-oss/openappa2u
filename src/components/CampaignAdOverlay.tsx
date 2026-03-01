import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { AdCampaign } from '@/hooks/useAdCampaigns';

interface CampaignAdOverlayProps {
  ad: AdCampaign;
  onClose: () => void;
}

export function CampaignAdOverlay({ ad, onClose }: CampaignAdOverlayProps) {
  // Always 15 seconds skip timer
  const [countdown, setCountdown] = useState(15);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const normalizeUrl = useCallback((url?: string | null) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }, []);

  const openDestination = useCallback(() => {
    const url = normalizeUrl(ad.destination_url);
    if (url) {
      window.location.assign(url);
    }
  }, [ad.destination_url, normalizeUrl]);

  useEffect(() => {
    if (countdown <= 0) { setCanSkip(true); return; }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { setCanSkip(true); clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div
        className="flex-1 relative"
        role="button"
        tabIndex={0}
        onClick={openDestination}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDestination(); } }}
      >
        {ad.media_type === 'video' ? (
          <video ref={videoRef} src={ad.media_url} autoPlay playsInline muted={isMuted} loop className="h-full w-full object-contain" onEnded={onClose} />
        ) : (
          <img src={ad.media_url} alt={ad.title || ad.name} className="h-full w-full object-contain" />
        )}

        <div className="absolute top-4 right-4">
          {canSkip ? (
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-4 py-2 text-white text-sm font-medium hover:bg-black/80 transition-colors">
              <X className="h-4 w-4" /> Skip Ad
            </button>
          ) : (
            <div className="rounded-full bg-black/60 backdrop-blur px-4 py-2 text-white text-sm font-medium">Skip in {countdown}s</div>
          )}
        </div>

        <div className="absolute top-4 left-4">
          <span className="rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-black uppercase">Ad</span>
        </div>
      </div>

      {/* FOOTER card like App Store */}
      <div className="w-full z-[110] bg-black/90 backdrop-blur-xl border-t border-white/10 px-3 py-3 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="flex-1 min-w-0">
            <p className="text-xs text-white/60">OpenApp &middot; Sponsored</p>
            <h4 className="text-white font-medium text-sm truncate">{ad.title || ad.name}</h4>
            <p className="text-xs text-white/60 truncate">{ad.description || ad.destination_url}</p>
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ad.media_type === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted((prev) => !prev); }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/15"
                aria-label={isMuted ? 'Unmute ad' : 'Mute ad'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); openDestination(); }}
              className="rounded-full bg-blue-500 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              Get
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
