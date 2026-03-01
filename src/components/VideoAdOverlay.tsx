import { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Info } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { RecommendedApps } from './RecommendedApps';
import { useTheme } from '@/hooks/useTheme';
import { App, Category } from '@/types/app';
import { Link, useNavigate } from 'react-router-dom';

interface AdData {
  id: string;
  video_url: string;
  title: string | null;
  description: string | null;
  skip_after_seconds: number;
  duration_seconds: number | null;
  app: App & { category?: Category };
}

interface VideoAdOverlayProps {
  ad: AdData;
  onClose: () => void;
  onNavigate?: () => void;
}

export function VideoAdOverlay({ ad, onClose, onNavigate }: VideoAdOverlayProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const appId = (ad as any)?.app?.id ?? (ad as any)?.app_id;
  const buildDetailUrl = (id: string) => `/app/${id}?refresh=${Date.now()}`;
  // Always use 15 seconds for skip timer
  const [countdown, setCountdown] = useState(15);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const appWebsiteUrl = (ad as any)?.app?.website_url as string | undefined;
  const screenshots = (ad.app?.screenshots || [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order);

  const getBadgeSrc = (app?: { name?: string | null; is_verified?: boolean | null; verified_until?: string | null } | null) => {
    const key = (app?.name || '').toLowerCase();
    const badgeMap: Record<string, { light: string; dark: string }> = {
      'openapp': { light: 'https://i.ibb.co/BVQYVbyb/verified.png', dark: 'https://i.ibb.co/BVQYVbyb/verified.png' },
      'flappy pi': { light: 'https://i.ibb.co/BVQYVbyb/verified.png', dark: 'https://i.ibb.co/BVQYVbyb/verified.png' },
      'dropshare': { light: 'https://i.ibb.co/BVQYVbyb/verified.png', dark: 'https://i.ibb.co/BVQYVbyb/verified.png' },
      'drop share': { light: 'https://i.ibb.co/BVQYVbyb/verified.png', dark: 'https://i.ibb.co/BVQYVbyb/verified.png' },
      'droplink': { light: 'https://i.ibb.co/BVQYVbyb/verified.png', dark: 'https://i.ibb.co/BVQYVbyb/verified.png' },
      'mrwain hub': { light: 'https://i.ibb.co/p6HtQ2c5/verify-3.png', dark: 'https://i.ibb.co/p6HtQ2c5/verify-3.png' },
    };
    const badge = badgeMap[key];
    const isSubscriptionVerified = !!app?.is_verified && !!app?.verified_until && new Date(app.verified_until).getTime() > Date.now();
    if (!badge && !isSubscriptionVerified) return '';
    if (!badge) return 'https://i.ibb.co/BVQYVbyb/verified.png';
    return theme === 'dark' ? badge.dark : badge.light;
  };

  const normalizeUrl = (url?: string | null) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  };

  const openAdLink = () => {
    const externalUrl = normalizeUrl(appWebsiteUrl);
    if (externalUrl) {
      window.location.assign(externalUrl);
      return;
    }
    if (appId) {
      navigate(buildDetailUrl(appId));
    }
  };

  useEffect(() => {
    if (countdown <= 0) {
      setCanSkip(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('openapp_ad_disclaimer_seen');
    if (!hasSeen) {
      setShowDisclaimer(true);
      localStorage.setItem('openapp_ad_disclaimer_seen', 'true');
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Video area */}
      <div
        className="flex-1 relative"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (onNavigate) onNavigate(); else onClose();
          openAdLink();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onNavigate) onNavigate(); else onClose();
            openAdLink();
          }
        }}
      >
        <video
          ref={videoRef}
          src={ad.video_url}
          autoPlay
          playsInline
          muted={isMuted}
          loop
          className="h-full w-full object-contain"
          onEnded={onClose}
        />

        {/* Skip / Countdown - top right */}
        <div className="absolute top-4 right-4">
          {canSkip ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-4 py-2 text-white text-sm font-medium hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
              Skip Ad
            </button>
          ) : (
            <div className="rounded-full bg-black/60 backdrop-blur px-4 py-2 text-white text-sm font-medium">
              Skip in {countdown}s
            </div>
          )}
        </div>

        {/* Ad label - top left */}
        <div className="absolute top-4 left-4">
          <span className="rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-black uppercase">Ad</span>
        </div>
      </div>

      {/* FOOTER app card - positioned at the bottom like App Store */}
      <div className="w-full z-[110] bg-black/90 backdrop-blur-xl border-t border-white/10 px-3 py-3 sm:px-6 md:px-8">
        <div
          className="max-w-3xl mx-auto flex items-center gap-3"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigate) onNavigate(); else onClose();
            openAdLink();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onNavigate) onNavigate(); else onClose();
              openAdLink();
            }
          }}
        >
          <span className="flex-shrink-0">
            <AppIcon src={ad.app.logo_url} name={ad.app.name} size="sm" />
          </span>
          <span className="flex-1 min-w-0">
            <p className="text-xs text-white/60">OpenApp &middot; Sponsored</p>
            <h4 className="text-white font-medium text-sm truncate flex items-center gap-2">
              {ad.app.name}
              {getBadgeSrc(ad.app) && (
                <img src={getBadgeSrc(ad.app)} alt="Verified" className="h-4 w-4" />
              )}
            </h4>
            <p className="text-xs text-white/60 truncate">{ad.app.category?.name || 'App'}</p>
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMuted((prev) => !prev); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/15"
              aria-label={isMuted ? 'Unmute ad' : 'Mute ad'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDisclaimer(true); }}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/15 whitespace-nowrap"
            >
              <Info className="h-3.5 w-3.5" />
              About
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
              className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/15 whitespace-nowrap"
            >
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) onNavigate(); else onClose();
                openAdLink();
              }}
              className="rounded-full bg-blue-500 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              Get
            </button>
          </div>
        </div>
      </div>

      {/* Slide-up app details */}
      <div
        className={`absolute inset-0 z-[115] transition-opacity ${showDetails ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowDetails(false)}
        aria-hidden={!showDetails}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div
          className={`absolute left-0 right-0 bottom-0 h-[85vh] rounded-t-3xl bg-background border-t border-border transition-transform ${showDetails ? 'translate-y-0' : 'translate-y-full'}`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="px-5 pt-4">
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
              <div className="flex items-start gap-4">
                <AppIcon src={ad.app.logo_url} name={ad.app.name} size="md" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
                    {ad.app.name}
                    {getBadgeSrc(ad.app) && <img src={getBadgeSrc(ad.app)} alt="Verified" className="h-5 w-5" />}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{ad.app.tagline || ad.app.category?.name || 'App'}</p>
                  <p className="mt-2 text-sm text-foreground/90 line-clamp-3">{ad.description || ad.title || 'Sponsored app'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-5 pb-24">
              <div className="space-y-4 text-sm text-foreground/90">
                {screenshots.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Screenshots</h4>
                    <div className="mt-2 flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5">
                      {screenshots.map((shot, idx) => (
                        <button key={shot.id} type="button" onClick={() => { setPreviewIndex(idx); setPreviewOpen(true); }} className="flex-shrink-0">
                          <img src={shot.image_url} alt={`${ad.app.name} screenshot`} className="h-40 w-auto rounded-xl object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {ad.app.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">About</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ad.app.description}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Category</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{ad.app.category?.name || 'App'}</p>
                </div>
                {ad.app.age_rating && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Age Rating</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{ad.app.age_rating}</p>
                  </div>
                )}
                {ad.app.languages?.length ? (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Languages</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{ad.app.languages.join(', ')}</p>
                  </div>
                ) : null}
                {ad.app.developer_name && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Developer</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{ad.app.developer_name}</p>
                  </div>
                )}
              </div>

              {appId && (
                <div className="pt-2">
                  <RecommendedApps currentAppId={appId} categoryId={ad.app.category_id ?? null} />
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDetails(false)} className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground">
                  Close
                </button>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate(); else onClose();
                    if (appId) navigate(buildDetailUrl(appId));
                  }}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  View App
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDisclaimer && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-white/10 bg-background p-6 text-left shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Third-Party Applications</h3>
              <button onClick={() => setShowDisclaimer(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Close disclaimer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>All applications listed on OpenApp are third-party applications developed and maintained by independent developers. These apps are not owned, operated, or endorsed by OpenApp or the mrwain organization.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Each app is owned and operated by its respective developer.</li>
                <li>App functionality, security, and privacy policies are managed by individual developers.</li>
                <li>Always review each app&apos;s terms of service and privacy policy before use.</li>
              </ul>
              <p>Learn more on the <Link to="/about" className="text-primary hover:underline">About OpenApp</Link> page.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setShowDisclaimer(false)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Got it</button>
            </div>
          </div>
        </div>
      )}

      <ImagePreviewDialog
        images={screenshots}
        initialIndex={previewIndex}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
