'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Repeat, Shuffle, Volume2, X } from 'lucide-react';
import type { UserPlaylist } from '@/services/api';

type YTPlayer = {
  destroy(): void; loadPlaylist(options: { list: string; listType: 'playlist'; index?: number }): void; cuePlaylist(options: { list: string; listType: 'playlist'; index?: number }): void; playVideo(): void; pauseVideo(): void; stopVideo(): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void; cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  nextVideo(): void; previousVideo(): void; setShuffle(value: boolean): void; setLoop(value: boolean): void; setVolume(value: number): void;
  getVolume(): number; getPlaylistIndex(): number; getPlayerState(): number;
};
type YTApi = { Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number } };
declare global { interface Window { YT?: YTApi; onYouTubeIframeAPIReady?: () => void } }

export default function MiniPlayer() {
  const hostRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const [currentTitle, setCurrentTitle] = useState('Choose a YouTube video');
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);
  const [volume, setVolume] = useState(70);
  const [playError, setPlayError] = useState('');
  const [playErrorUrl, setPlayErrorUrl] = useState('');
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const loopRef = useRef(false);
  const shuffleRef = useRef(false);
  const volumeRef = useRef(volume);
  const pendingPlaylist = useRef<UserPlaylist[] | null>(null);
  const queueRef = useRef<UserPlaylist[]>([]);
  const queueIndexRef = useRef(0);
  const nextErrorTimer = useRef<number | null>(null);
  const visibleRef = useRef(false);
  loopRef.current = loop;
  shuffleRef.current = shuffle;
  volumeRef.current = volume;
  visibleRef.current = visible;

  useEffect(() => {
    const startPlaylist = (event: Event) => {
      const playlist = (event as CustomEvent<UserPlaylist>).detail;
      if (!playlist) return;
      startQueue([playlist]);
    };
    const startAll = (event: Event) => { const items = (event as CustomEvent<UserPlaylist[]>).detail; if (items?.length) startQueue(items); };
    const startQueue = (items: UserPlaylist[]) => {
      if (nextErrorTimer.current) clearTimeout(nextErrorTimer.current);
      queueRef.current = items; queueIndexRef.current = 0;
      setVisible(true); setCollapsed(false); setPlayError(''); setPlayErrorUrl('');
      if (!readyRef.current || !playerRef.current) { pendingPlaylist.current = items; setPlayError('Loading the YouTube player…'); return; }
      playItem(items[0]);
    };
    const playItem = (item?: UserPlaylist) => {
      if (!item || !playerRef.current) return;
      setCurrentTitle(item.title); setPlayError(''); setPlayErrorUrl('');
      if (item.kind === 'video' || item.youtubeVideoId) playerRef.current.loadVideoById({ videoId: item.youtubeVideoId!, startSeconds: item.startSeconds ?? 0 });
      else if (item.youtubePlaylistId) { playerRef.current.loadPlaylist({ list: item.youtubePlaylistId, listType: 'playlist', index: 0 }); playerRef.current.setShuffle(shuffleRef.current); playerRef.current.setLoop(loopRef.current); }
    };
    window.addEventListener('memosphere:play-playlist', startPlaylist);
    window.addEventListener('memosphere:play-queue', startAll);
    return () => { window.removeEventListener('memosphere:play-playlist', startPlaylist); window.removeEventListener('memosphere:play-queue', startAll); };
  }, []);

  useEffect(() => {
    const createPlayer = () => {
      if (!hostRef.current || !window.YT || playerRef.current) return;
      hostRef.current.src = `https://www.youtube-nocookie.com/embed?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
      playerRef.current = new window.YT.Player('memosphere-youtube-iframe', {
        playerVars: { origin: window.location.origin, playsinline: 1, controls: 1, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true; playerRef.current?.setVolume(volumeRef.current); playerRef.current?.setLoop(loopRef.current);
            if (pendingPlaylist.current?.length) {
              const item = pendingPlaylist.current[0]!;
              pendingPlaylist.current = null;
              if (item.kind === 'video' || item.youtubeVideoId) playerRef.current?.loadVideoById({ videoId: item.youtubeVideoId!, startSeconds: item.startSeconds ?? 0 });
              else if (item.youtubePlaylistId) { playerRef.current?.loadPlaylist({ list: item.youtubePlaylistId, listType: 'playlist', index: 0 }); playerRef.current?.setShuffle(shuffleRef.current); playerRef.current?.setLoop(loopRef.current); }
            }
          },
          onStateChange: (event: { data: number }) => {
            const api = window.YT;
            if (!api) return;
            setPlaying(event.data === api.PlayerState.PLAYING);
            if (event.data === api.PlayerState.PLAYING) { setPlayError(''); setPlayErrorUrl(''); }
          },
          onError: () => {
            setPlayError("This video can't be played here");
            const failedItem = queueRef.current[queueIndexRef.current];
            setPlayErrorUrl(failedItem?.youtubeVideoId ? `https://www.youtube.com/watch?v=${failedItem.youtubeVideoId}` : failedItem?.youtubePlaylistId ? `https://www.youtube.com/playlist?list=${failedItem.youtubePlaylistId}` : 'https://www.youtube.com/');
            if (nextErrorTimer.current) clearTimeout(nextErrorTimer.current);
            nextErrorTimer.current = window.setTimeout(() => { nextErrorTimer.current = null; if (!visibleRef.current) return; queueIndexRef.current += 1; const next = queueRef.current[queueIndexRef.current]; if (next) { setPlayError(''); setCurrentTitle(next.title); if (next.kind === 'video' || next.youtubeVideoId) playerRef.current?.loadVideoById({ videoId: next.youtubeVideoId!, startSeconds: next.startSeconds ?? 0 }); else if (next.youtubePlaylistId) playerRef.current?.loadPlaylist({ list: next.youtubePlaylistId, listType: 'playlist', index: 0 }); } else playerRef.current?.nextVideo(); }, 350);
          },
        },
      });
    };
    if (window.YT) createPlayer();
    else {
      const oldReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { oldReady?.(); createPlayer(); };
      let script = document.getElementById('youtube-iframe-api') as HTMLScriptElement | null;
      if (!script) { script = document.createElement('script'); script.id = 'youtube-iframe-api'; script.src = 'https://www.youtube.com/iframe_api'; script.async = true; document.head.appendChild(script); }
    }
    return () => { if (nextErrorTimer.current) clearTimeout(nextErrorTimer.current); playerRef.current?.destroy(); playerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!position) return;
    const move = (event: PointerEvent) => setPosition((current) => current ? { left: Math.max(8, Math.min(window.innerWidth - 290, event.clientX - 135)), top: Math.max(8, Math.min(window.innerHeight - 100, event.clientY - 24)) } : current);
    const stop = () => window.removeEventListener('pointermove', move);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
  }, [position]);

  const close = () => { if (nextErrorTimer.current) clearTimeout(nextErrorTimer.current); nextErrorTimer.current = null; playerRef.current?.stopVideo(); setPlaying(false); setVisible(false); setPosition(null); };
  const dragStart = (event: React.PointerEvent<HTMLDivElement>) => { if ((event.target as HTMLElement).closest('button')) return; event.preventDefault(); setPosition(position ?? { left: 20, top: Math.max(8, window.innerHeight - 230) }); };

  const advance = (direction: -1 | 1) => { const nextIndex = queueIndexRef.current + direction; if (nextIndex >= 0 && nextIndex < queueRef.current.length) { queueIndexRef.current = nextIndex; const item = queueRef.current[nextIndex]!; setCurrentTitle(item.title); if (item.youtubeVideoId) playerRef.current?.loadVideoById({ videoId: item.youtubeVideoId, startSeconds: item.startSeconds ?? 0 }); else if (item.youtubePlaylistId) playerRef.current?.loadPlaylist({ list: item.youtubePlaylistId, listType: 'playlist', index: 0 }); } else if (direction > 0) playerRef.current?.nextVideo(); else playerRef.current?.previousVideo(); };
  return <section className={`mini-player${collapsed ? ' is-collapsed' : ''}${visible ? '' : ' is-hidden'}`} style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined} aria-label="YouTube player" aria-hidden={!visible}>
      <div className="mini-player-heading" onPointerDown={dragStart}><span className="mini-player-grip" aria-hidden="true">⋮⋮</span><strong title={currentTitle}>{currentTitle}</strong>
        <button type="button" aria-label={collapsed ? 'Expand player' : 'Collapse player'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
        <button type="button" aria-label="Close player and stop playback" onClick={close}><X size={17} /></button>
      </div>
      <div className="mini-player-video-space" aria-label="YouTube video playback" aria-hidden={collapsed}><iframe id="memosphere-youtube-iframe" ref={hostRef} title="YouTube player" src="https://www.youtube-nocookie.com/embed?enablejsapi=1" allow="autoplay; encrypted-media; picture-in-picture" /></div>
      {!collapsed && <>
        {playError && <p className="mini-player-error" role="status">{playError}{playErrorUrl && <a href={playErrorUrl} target="_blank" rel="noopener noreferrer">Open on YouTube</a>}</p>}
        <div className="mini-player-controls" role="group" aria-label="Playlist controls">
          <button type="button" aria-label="Previous video" onClick={() => advance(-1)}><ChevronLeft size={19} /></button>
          <button type="button" aria-label={playing ? 'Pause playlist' : 'Resume playlist'} onClick={() => { setPlayError(''); if (playing) playerRef.current?.pauseVideo(); else playerRef.current?.playVideo(); }}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <button type="button" aria-label="Next video" onClick={() => { setPlayError(''); advance(1); }}><ChevronRight size={19} /></button>
          <button type="button" className={shuffle ? 'is-active' : ''} aria-pressed={shuffle} aria-label="Shuffle playlist" onClick={() => { const next = !shuffle; shuffleRef.current = next; setShuffle(next); playerRef.current?.setShuffle(next); }}><Shuffle size={16} /></button>
          <button type="button" className={loop ? 'is-active' : ''} aria-pressed={loop} aria-label="Loop playlist" onClick={() => { const next = !loop; loopRef.current = next; setLoop(next); playerRef.current?.setLoop(next); }}><Repeat size={16} /></button>
        </div>
        <label className="mini-player-volume"><Volume2 size={16} /><span className="sr-only">Volume</span><input type="range" min="0" max="100" value={volume} aria-label="Volume" onChange={(event) => { const next = Number(event.target.value); setVolume(next); playerRef.current?.setVolume(next); }} /></label>
        <small>Playback is provided by YouTube.</small>
      </>}
    </section>;
}
