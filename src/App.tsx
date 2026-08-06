import React, { useState, useEffect, useRef, useMemo, useCallback, FormEvent, ChangeEvent, Fragment } from "react";
import {
  Plus, X, ExternalLink, Copy, Check, Terminal, Wifi, WifiOff,
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat,
  ChevronDown, ChevronUp, Music, AlertCircle, RefreshCw, Trash2,
  MoreHorizontal, MoreVertical, Menu, Download, FileDown, GripVertical,
  Info, Flag, Mic
} from "lucide-react";

const WORKER_URL = "https://proxy.jayden-gass10.workers.dev";

import { api } from './config.ts';
import "@uimaxbai/am-lyrics/am-lyrics.js";

const workerPost = async (body: any) => {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Worker error: " + res.status);
  return res.json();
};

interface Track {
  num: number;
  title: string;
  date: string;
  audioUrl?: string;
  format?: string;
}

interface ProjectMetadata {
  title: string;
  artist: string;
  tracksCount: number;
  duration: string;
  artworkUrl: string;
  tracks: Track[];
  streamUrl?: string;
  lastRefreshed?: number;
}

interface StreamProject {
  id: string;
  url: string;
  linkType?: 'UNTITLED';
  metadata?: ProjectMetadata;
  isLoadingMetadata?: boolean;
  metadataError?: string;
}

const explicitRegex = /[\[\(]\s*E\s*[\]\)]|[\[\(]\s*Explicit\s*[\]\)]|🔞/i;

const renderExplicitTitle = (title: string | undefined | null): React.ReactNode => {
  if (!title) return '';
  const parts = title.split(explicitRegex);
  const matches = title.match(explicitRegex);
  
  if (!matches || matches.length === 0) {
    return title;
  }
  
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) result.push(part);
    if (i < matches.length) {
      result.push(<span key={`e-${i}`} className="explicit-badge">{matches[i]}</span>);
    }
  });
  
  return result;
};

const TRACKERHUB_COVER_MAP: Record<string, string> = {
  "808s & Heartbreak": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/808s%20%26%20Heartbreak.jpg",
  "BULLY": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/BULLY%20%5BV1%5D.jpg",
  "BULLY [V1]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/BULLY%20%5BV1%5D.jpg",
  "BULLY [V2]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/BULLY%20%5BV2%5D.jpg",
  "Bad Bitch Playbook": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Bad%20Bitch%20Playbook.jpg",
  "Before The College Dropout": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Before%20The%20College%20Dropout.jpg",
  "be": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Be.jpg",
  "CUCK": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/CUCK.jpg",
  "Cruel Summer": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Cruel%20Summer.png",
  "Cruel Winter": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Cruel%20Winter%20%5BV1%5D.png",
  "Cruel Winter [V1]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Cruel%20Winter%20%5BV1%5D.png",
  "Cruel Winter [V2]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Cruel%20Winter%20%5BV2%5D.jpg",
  "DAYTONA": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/DAYTONA.jpg",
  "DONDA 2 (2025)": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/DONDA%202%20(2025).jpg",
  "DONDA": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/DONDA%20%5BV1%5D.jpg",
  "DONDA [V1]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/DONDA%20%5BV1%5D.jpg",
  "DONDA [V2]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/DONDA%20%5BV2%5D.png",
  "Donda 2": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Donda%202.png",
  "Donda [V3]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Donda%20%5BV3%5D.png",
  "God's Country": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/God's%20Country.png",
  "Good Ass Job": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Good%20Ass%20Job.jpg",
  "Good Ass Job (2018)": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Good%20Ass%20Job%20(2018).png",
  "Graduation": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Graduation.jpg",
  "IN A PERFECT WORLD": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/IN%20A%20PERFECT%20WORLD.png",
  "JESUS IS KING": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/JESUS%20IS%20KING.jpg",
  "JESUS IS KING The Dr. Dre Version": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/JESUS%20IS%20KING%20The%20Dr.%20Dre%20Version.jpg",
  "K.T.S.E.": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/K.T.S.E..jpg",
  "KIDS SEE GHOSTS": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/KIDS%20SEE%20GHOSTS.jpg",
  "LOVE EVERYONE": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/LOVE%20EVERYONE.png",
  "Late Registration": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Late%20Registation.jpg",
  "My Beautiful Dark Twisted Fantasy": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/My%20Beautiful%20Dark%20Twisted%20Fantasy.jpg",
  "NASIR": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/NASIR.jpg",
  "NEVER STOP": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/NEVER%20STOP.png",
  "Ongoing": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Ongoing.png",
  "SWISH": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/SWISH.png",
  "So Help Me God": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/So%20Help%20Me%20God.png",
  "Thank God For Drugs": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Thank%20God%20For%20Drugs.png",
  "The College Dropout": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/The%20College%20Dropout.jpg",
  "The Elementary School Dropout": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/The%20Elementry%20School%20Dropout.jpg",
  "The Life Of Pablo": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/The%20Life%20Of%20Pablo.png",
  "Turbo Grafx 16": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Turbo%20Grafx%2016.png",
  "VULTURES 1": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/VULTURES%201.jpg",
  "VULTURES 2": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/VULTURES%202.jpg",
  "VULTURES 3": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/VULTURES%203.jpg",
  "WAR": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/WAR.png",
  "Watch The Throne": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Watch%20The%20Throne.jpg",
  "YEBU": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/YEBU.png",
  "Yandhi": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Yandhi%20%5BV1%5D.jpg",
  "Yandhi [V1]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Yandhi%20%5BV1%5D.jpg",
  "Yandhi [V2]": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Yandhi%20%5BV2%5D.jpg",
  "Yeezus": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Yeezus.jpg",
  "Yeezus 2": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/Yeezus%202.jpg",
  "ye": "https://raw.githubusercontent.com/jaydengass/Artistgrid-Images/main/ye.jpg",
};

const getTrackerHubCover = (era: any) => {
  const name = era?.name?.trim();
  if (!name) return era?.cover_art || "";
  if (TRACKERHUB_COVER_MAP[name]) return TRACKERHUB_COVER_MAP[name];
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const target = normalize(name);
  for (const [key, url] of Object.entries(TRACKERHUB_COVER_MAP)) {
    if (normalize(key) === target) return url;
  }
  return era?.cover_art || "";
};

export default function App() {
  const [remoteProjects, setRemoteProjects] = useState<StreamProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [proxyStatus, setProxyStatus] = useState<"synced" | "offline">("offline");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("yeleaks_dark_mode");
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [newUrl, setNewUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportProjectId, setReportProjectId] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');
  const [reportSubmitting, setReportSubmitting] = useState<boolean>(false);
  const closeInfoModal = () => {
    localStorage.setItem('yeleaks_info_seen', 'true');
    setShowInfoModal(false);
  };
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
  };
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('Unreleased');
  const [showLyricsPanel, setShowLyricsPanel] = useState<boolean>(false);
  const [lyricsLoading, setLyricsLoading] = useState<boolean>(false);
  const amLyricsRef = useRef<any>(null);
  const [activeSection, setActiveSection] = useState<'yeleaks' | 'trackerhub'>('yeleaks');
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationData, setNotificationData] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number, failed: number} | null>(null);
  const [kanyeData, setKanyeData] = useState<any | null>(null);
  const [kanyeLoading, setKanyeLoading] = useState(false);
  const trackerCacheRef = useRef<any | null>(null);
  const trackerHubTempProjectRef = useRef<any | null>(null);
  const trackerTabErasRef = useRef<Record<string, any[]>>({});
  const filteredTrackerEras = useMemo(() => {
    if (!kanyeData?.eras) return [];
    const query = debouncedSearchQuery.trim().toLowerCase();
    
    const tabSorts: Record<string, string> = {
      'Unreleased': 'Unreleased',
      'Released': 'Released',
      'Recent': 'Recent',
      'Best Of': 'Best Of',
      'Worst Of': 'Worst Of',
      'Special': 'Special',
      'Grails/Wanted': 'Grails/Wanted',
    };
    const targetTab = tabSorts[sortOption];
    
    let sourceEras = kanyeData.eras;
    
    if (targetTab && trackerTabErasRef.current[targetTab]) {
      sourceEras = trackerTabErasRef.current[targetTab];
    }
    
    let eras = !query ? sourceEras : sourceEras.filter((era: any) => {
      const tracks = era.tracks || [];
      if (tracks.length === 0) return false;
      return tracks.some((track: any) => {
        const trackTitle = (track.name?.title || '').toLowerCase();
        const trackAlt = (track.name?.raw || '').toLowerCase();
        return trackTitle.includes(query) || trackAlt.includes(query);
      });
    });
    
    if (eras.length > 0 && !targetTab) {
      eras = eras.map((era: any) => {
        const tracks = [...(era.tracks || [])];
        if (sortOption === 'Recent' || sortOption === 'AI') {
          tracks.sort((a: any, b: any) => {
            const aDate = a.file_date || a.leak_date || '';
            const bDate = b.file_date || b.leak_date || '';
            return bDate.localeCompare(aDate);
          });
        } else if (sortOption === 'Best Of') {
          tracks.sort((a: any, b: any) => (b.quality || '').localeCompare(a.quality || ''));
        } else if (sortOption === 'Worst Of') {
          tracks.sort((a: any, b: any) => (a.quality || '').localeCompare(b.quality || ''));
        } else if (sortOption === 'Special') {
          tracks.sort((a: any, b: any) => (a.name?.title || a.name?.raw || '').toLowerCase().localeCompare((b.name?.title || b.name?.raw || '').toLowerCase()));
        } else if (sortOption === 'Grails/Wanted') {
          tracks.sort((a: any, b: any) => (a.available_length || '').localeCompare(b.available_length || ''));
        } else if (sortOption === 'Unwanted') {
          tracks.sort((a: any, b: any) => (b.available_length || '').localeCompare(a.available_length || ''));
        }
        return { ...era, tracks };
      });
    }
    
    return eras;
  }, [kanyeData, debouncedSearchQuery, sortOption]);
  const [expandedEras, setExpandedEras] = useState<Set<string>>(new Set());
  const [selectedTrackerTrackIds, setSelectedTrackerTrackIds] = useState<Set<string>>(new Set());
  const [hoveredTrackerTrack, setHoveredTrackerTrack] = useState<{eraKey: string, track: any, eraIndex: number, trackIndex: number, rect: DOMRect} | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
  const barrelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const DRAG_LIMIT = 80;

  const updateBarrelPosition = (translate: number) => {
    if (!barrelRef.current) return;
    const progress = Math.min(Math.abs(translate) / DRAG_LIMIT, 1);
    const title1 = barrelRef.current.querySelector('#barrel-title-1') as HTMLElement | null;
    const title2 = barrelRef.current.querySelector('#barrel-title-2') as HTMLElement | null;
    if (title1) {
      title1.style.transform = `translateX(${-progress * 40}px)`;
      title1.style.opacity = String(1 - progress);
    }
    if (title2) {
      title2.style.transform = `translateX(${(1 - progress) * 40}px)`;
      title2.style.opacity = String(progress);
    }
  };

  const animateBarrelSnap = (targetSection: 'yeleaks' | 'trackerhub') => {
    if (!barrelRef.current) return;
    const transition = 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
    barrelRef.current.style.transition = transition;
    const title1 = barrelRef.current.querySelector('#barrel-title-1') as HTMLElement | null;
    const title2 = barrelRef.current.querySelector('#barrel-title-2') as HTMLElement | null;
    if (title1) title1.style.transition = transition;
    if (title2) title2.style.transition = transition;

    if (targetSection === 'trackerhub') {
      currentTranslateRef.current = -DRAG_LIMIT;
      if (title1) { title1.style.transform = `translateX(${-DRAG_LIMIT}px)`; title1.style.opacity = '0'; }
      if (title2) { title2.style.transform = `translateX(0px)`; title2.style.opacity = '1'; }
    } else {
      currentTranslateRef.current = 0;
      if (title1) { title1.style.transform = `translateX(0px)`; title1.style.opacity = '1'; }
      if (title2) { title2.style.transform = `translateX(${DRAG_LIMIT}px)`; title2.style.opacity = '0'; }
    }

    setTimeout(() => {
      if (!barrelRef.current) return;
      barrelRef.current.style.transition = 'none';
      const t1 = barrelRef.current.querySelector('#barrel-title-1') as HTMLElement | null;
      const t2 = barrelRef.current.querySelector('#barrel-title-2') as HTMLElement | null;
      if (t1) t1.style.transition = 'none';
      if (t2) t2.style.transition = 'none';
    }, 350);
  };

  const handleBarrelPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    currentTranslateRef.current = activeSection === 'trackerhub' ? -DRAG_LIMIT : 0;
    dragDistanceRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleBarrelPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !barrelRef.current) return;
    const diff = e.clientX - startXRef.current;
    dragDistanceRef.current = Math.abs(diff);
    let translate = (activeSection === 'trackerhub' ? -DRAG_LIMIT : 0) + diff;
    translate = Math.max(-DRAG_LIMIT, Math.min(0, translate));
    currentTranslateRef.current = translate;
    updateBarrelPosition(translate);
  };

  const handleBarrelPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const movedBy = currentTranslateRef.current - (activeSection === 'trackerhub' ? -DRAG_LIMIT : 0);
    const threshold = DRAG_LIMIT / 3;

    if (dragDistanceRef.current < 5) {
      setIsDarkMode(prev => !prev);
    } else if (movedBy < -threshold) {
      setActiveSection('trackerhub');
      animateBarrelSnap('trackerhub');
    } else if (movedBy > threshold) {
      setActiveSection('yeleaks');
      animateBarrelSnap('yeleaks');
    } else {
      animateBarrelSnap(activeSection);
    }
  };

  useEffect(() => {
    if (!barrelRef.current) return;
    barrelRef.current.style.transition = 'none';
    const title1 = barrelRef.current.querySelector('#barrel-title-1') as HTMLElement | null;
    const title2 = barrelRef.current.querySelector('#barrel-title-2') as HTMLElement | null;
    if (activeSection === 'trackerhub') {
      currentTranslateRef.current = -DRAG_LIMIT;
      if (title1) { title1.style.transform = `translateX(${-DRAG_LIMIT}px)`; title1.style.opacity = '0'; }
      if (title2) { title2.style.transform = `translateX(0px)`; title2.style.opacity = '1'; }
    } else {
      currentTranslateRef.current = 0;
      if (title1) { title1.style.transform = `translateX(0px)`; title1.style.opacity = '1'; }
      if (title2) { title2.style.transform = `translateX(${DRAG_LIMIT}px)`; title2.style.opacity = '0'; }
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'trackerhub') return;
    let cancelled = false;
    const loadKanye = async () => {
      if (trackerCacheRef.current) {
        setKanyeData(trackerCacheRef.current);
        setKanyeLoading(false);
        return;
      }
      setKanyeLoading(true);
      try {
        const baseUrl = api('/api/proxy?url=' + encodeURIComponent('https://trackerapi.artistgrid.cx/sh/12nGHPPh5dVTfLuBLVQYzC3QgPxKfvp-jgCoNccvEasM/'));
        const res = await fetch(baseUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch tracker data');
        const json: any = await res.json();
        
        const tabsList = json?.tabs || [];
        const currentTab = json?.tab?.name || json?.current_tab || '';
        const gids: Record<string, string> = {};
        for (const t of tabsList) {
          gids[t.name] = t.gid;
        }
        
        const allErasMap: Record<string, any> = {};
        const rawTabErasMap: Record<string, any[]> = {};
        
        const mergeEra = (era: any, sourceTab: string) => {
          const rawName = era.name || 'Unknown';
          const name = rawName.trim().toLowerCase();
          const existing = allErasMap[name];
          if (!existing) {
            allErasMap[name] = { ...era, _sourceTab: sourceTab };
          } else {
            const newTracks = era.tracks || [];
            const existingTracks = existing.tracks || [];
            const existingKeys = new Set(existingTracks.map((t: any) => JSON.stringify(t)));
            const uniqueNewTracks = newTracks.filter((t: any) => !existingKeys.has(JSON.stringify(t)));
            existing.tracks = [...existingTracks, ...uniqueNewTracks];
          }
        };
        
        const pushTabEras = (era: any, sourceTab: string) => {
          if (!rawTabErasMap[sourceTab]) rawTabErasMap[sourceTab] = [];
          rawTabErasMap[sourceTab].push(era);
          const eraName = (era.name || '').trim().toLowerCase();
          if (eraName === 'recent') {
            if (!rawTabErasMap['Recent']) rawTabErasMap['Recent'] = [];
            rawTabErasMap['Recent'].push(era);
          }
        };
        
        if (json?.eras && Array.isArray(json.eras)) {
          for (const era of json.eras) {
            mergeEra(era, currentTab || 'Main');
            pushTabEras(era, currentTab || 'Main');
          }
        }
        
        if (json?.tracks && Array.isArray(json.tracks)) {
          mergeEra({ name: currentTab || 'All Tracks', tracks: json.tracks }, currentTab || 'Flat');
          pushTabEras({ name: currentTab || 'All Tracks', tracks: json.tracks }, currentTab || 'Flat');
        }
        
        const tabPromises = tabsList.map(async (tab: any) => {
          if (tab.name === currentTab) return null;
          try {
            const gid = tab.gid;
            const tabRes = await fetch(`${baseUrl}gid/${gid}`, { cache: 'no-store' });
            if (!tabRes.ok) return null;
            const tabData: any = await tabRes.json();
            if (tabData?.eras && Array.isArray(tabData.eras)) {
              tabData.eras.forEach((era: any) => pushTabEras(era, tab.name));
              return tabData.eras.map((era: any) => ({ era, sourceTab: tab.name }));
            }
            if (tabData?.tracks && Array.isArray(tabData.tracks)) {
              pushTabEras({ name: tab.name, tracks: tabData.tracks }, tab.name);
              return [{ era: { name: tab.name, tracks: tabData.tracks }, sourceTab: tab.name }];
            }
            return null;
          } catch {
            return null;
          }
        });
        
        const tabResults = await Promise.all(tabPromises);
        for (const batch of tabResults) {
          if (!batch) continue;
          for (const { era, sourceTab } of batch) {
            mergeEra(era, sourceTab);
          }
        }
        
        trackerTabErasRef.current = rawTabErasMap;
        
        const combinedEras = Object.values(allErasMap).filter((era: any) => {
          const name = (era.name || '').trim().toLowerCase();
          return name !== 'recent' && (era.tracks || []).length > 0;
        });
        
        const data = {
          ...json,
          eras: combinedEras,
          tabs: tabsList,
          current_tab: currentTab,
        };
        
        if (!cancelled) {
          trackerCacheRef.current = data;
          setKanyeData(data);
          setKanyeLoading(false);
        }
      } catch (e) {
        if (!cancelled) setKanyeLoading(false);
      }
    };
    loadKanye();
    return () => { cancelled = true; };
  }, [activeSection]);

  useEffect(() => {
    const hasSeenInfo = localStorage.getItem('yeleaks_info_seen');
    if (!hasSeenInfo) {
      setShowInfoModal(true);
    }
  }, []);

  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setNotificationData({ message, type });
    setShowNotification(true);
    notificationTimeoutRef.current = window.setTimeout(() => {
      setShowNotification(false);
      setNotificationData(null);
      notificationTimeoutRef.current = null;
    }, 3000);
  };

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("yeleaks_expanded_projects");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem("yeleaks_active_project_id");
      return stored || null;
    } catch {
      return null;
    }
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("yeleaks_current_track_index");
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(180);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("yeleaks_volume");
      return stored ? parseFloat(stored) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number, trackId: string, projectId: string, trackUrl: string} | null>(null);
  const [trackerContextMenuPos, setTrackerContextMenuPos] = useState<{x: number, y: number, trackUrl: string, trackTitle: string, trackFormat?: string, era?: any, trackIndex?: number} | null>(null);
  const [isAudioReady, setIsAudioReady] = useState<boolean>(false);
  const [visibleTrackCounts, setVisibleTrackCounts] = useState<Record<string, number>>({});

  const audioRef = useRef<any>(null);
  const activeProjectRef = useRef<any>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentTrackIndexRef = useRef<number>(0);
  const hasAdvancedRef = useRef<boolean>(false);
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollChecksRef = useRef<Set<string>>(new Set());
  const dragDistanceRef = useRef<number>(0);
  const audioRetryKeyRef = useRef<string>("");

  const getVisibleTrackCount = (itemId: string) => visibleTrackCounts[itemId] || 30;
  const showMoreTracks = useCallback((itemId: string) => {
    setVisibleTrackCounts(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 30) + 30
    }));
  }, []);

  const scheduleShowMore = useCallback((itemId: string) => {
    if (pendingScrollChecksRef.current.has(itemId)) return;
    pendingScrollChecksRef.current.add(itemId);
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      pendingScrollChecksRef.current.clear();
      showMoreTracks(itemId);
      scrollRafRef.current = null;
    });
  }, [showMoreTracks]);

  const normalizePillowsUrl = (url: string) => url.replace(/pillowcase\.su/g, "pillows.su");

  const isLikelyAudioUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (/\.(mp3|wav|flac|m4a|aac|ogg|wma|alac|opus|weba)(\?|$)/i.test(lower)) return true;
    if (/pillows\.su\/f\//.test(lower)) return true;
    if (/music\.froste\.lol\/song\//.test(lower)) return true;
    if (/youtube\.com\/|youtu\.be\//.test(lower)) return true;
    if (/krakenfiles\.com\/view\//.test(lower)) return true;
    if (/pixeldrain\.com\/[du]\//.test(lower)) return true;
    if (/imgur\.gg\/.*\.(mp3|wav|flac|m4a|ogg)/.test(lower)) return true;
    if (/soundcloud\.com\//.test(lower)) return true;
    if (/drive\.google\.com\/file\/d\//.test(lower)) return true;
    if (/files\.yetracker\.org\/f\//.test(lower)) return true;
    if (/qobuz\.com\/track\//.test(lower)) return true;
    return false;
  };

  const resolvePlayableUrl = async (url: string): Promise<string> => {
    if (!url || typeof url !== 'string') return '';
    const normalized = normalizePillowsUrl(url);
    
    if (/\.(html|htm|php|asp|aspx|jsp|xml|json|txt|pdf|jpg|jpeg|png|gif|svg|webp)(\?|$)/i.test(normalized)) {
      return '';
    }
    
    if (/\.(mp3|wav|flac|m4a|aac|ogg|wma|alac|opus|weba)(\?|$)/i.test(normalized)) {
      return normalized;
    }
    
    if (/pillows\.su\/f\/([^?\s]+)/i.test(normalized)) {
      const match = normalized.match(/pillows\.su\/f\/([^?\s]+)/i);
      return match ? `https://api.pillows.su/api/download/${match[1]}` : normalized;
    }
    
    if (/pixeldrain\.com\/d\/([a-zA-Z0-9]+)/.test(normalized)) {
      const match = normalized.match(/pixeldrain\.com\/d\/([a-zA-Z0-9]+)/);
      if (match) {
        try {
          const bases = [
            'https://trackerapi-1.artistgrid.cx',
            'https://trackerapi-2.artistgrid.cx',
            'https://trackerapi-3.artistgrid.cx',
          ];
          for (const base of bases) {
            try {
              const res = await fetch(api('/api/proxy?url=' + encodeURIComponent(`${base}/goy/dl/${match[1]}`)));
              if (res.ok) {
                const data = await res.json();
                if (data?.url) return data.url;
              }
            } catch {}
          }
        } catch {}
      }
    }
    
    if (/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/.test(normalized)) {
      const match = normalized.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
      if (match) return api('/api/proxy?url=' + encodeURIComponent(`https://fuck-unvaulted.artistgrid.cx/${match[1]}`));
    }
    
    if (/krakenfiles\.com\/view\/([a-zA-Z0-9]+)/.test(normalized)) {
      const match = normalized.match(/krakenfiles\.com\/view\/([a-zA-Z0-9]+)/);
      if (match) {
        try {
          const res = await fetch(api('/api/proxy?url=' + encodeURIComponent(`https://info.artistgrid.cx/kf/?id=${match[1]}`)));
          if (res.ok) {
            const data = await res.json();
            if (data?.m4a) return data.m4a;
          }
        } catch {}
      }
    }
    
    if (/files\.yetracker\.org\/f\/([a-zA-Z0-9]+)/.test(normalized)) {
      const match = normalized.match(/files\.yetracker\.org\/f\/([a-zA-Z0-9]+)/);
      if (match) return `https://files.yetracker.org/raw/${match[1]}`;
    }
    
    if (/soundcloud\.com\/([^/]+\/[^/?#]+)/.test(normalized)) {
      const match = normalized.match(/soundcloud\.com\/([^/]+\/[^/?#]+)/);
      if (match) return `https://sc.maid.zone/_/restream/${match[1]}`;
    }
    
    if (/(?:open\.)?qobuz\.com\/track\/(\d+)/.test(normalized)) {
      const match = normalized.match(/(?:open\.)?qobuz\.com\/track\/(\d+)/);
      if (match) {
        try {
          const res = await fetch(`https://qobuz.squid.wtf/api/download-music?track_id=${match[1]}&quality=27`);
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.url) return data.data.url;
          }
        } catch {}
      }
    }
    
    if (/imgur\.gg\/.*\/([a-zA-Z0-9]+)/.test(normalized)) {
      const match = normalized.match(/imgur\.gg\/.*\/([a-zA-Z0-9]+)/);
      if (match) {
        try {
          const res = await fetch(`https://imgur.gg/api/file/${match[1]}`);
          if (res.ok) {
            const data = await res.json();
            const mediaType = data.mediaType || data.mimeType || data.type || '';
            if (!mediaType.startsWith('image/')) {
              return data.cdnUrl || normalized;
            }
          }
        } catch {}
      }
    }
    
    if (/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/.test(normalized)) {
      const match = normalized.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return api('/api/proxy?url=' + encodeURIComponent(`http://fuck-unvaulted.artistgrid.cx/gd/${match[1]}`));
    }
    
    return normalized;
  };

  const resolveTrackerTrackUrl = async (track: any): Promise<string> => {
    const allLinks = (track.links || [])
      .filter((l: any) => l.url && typeof l.url === 'string' && l.url.startsWith('http'))
      .map((l: any) => normalizePillowsUrl(l.url));
    
    const audioLinks = allLinks.filter(l => isLikelyAudioUrl(l));
    if (audioLinks.length > 0) return await resolvePlayableUrl(audioLinks[0]);
    if (allLinks.length > 0) return await resolvePlayableUrl(allLinks[0]);
    
    if (track.quality && typeof track.quality === 'string' && track.quality.startsWith('http')) {
      return await resolvePlayableUrl(normalizePillowsUrl(track.quality));
    }
    if (track.available_length && typeof track.available_length === 'string' && track.available_length.startsWith('http')) {
      return await resolvePlayableUrl(normalizePillowsUrl(track.available_length));
    }
    return '';
  };

  const getCombinedProjects = () => {
    const activeHiddenIds: string[] = JSON.parse(localStorage.getItem("yeleaks_hidden_projects") || "[]");
    return remoteProjects
      .filter(p => !activeHiddenIds.includes(p.id))
      .filter(p => {
        if (!p.metadata) return true;
        const tracks = p.metadata.tracks;
        return !(Array.isArray(tracks) && tracks.length === 0);
      });
  };

  const allProjects = useMemo(() => getCombinedProjects(), [remoteProjects]);
  const activeProject = useMemo(() => {
    const fromList = allProjects.find(p => p.id === activeProjectId);
    if (fromList) return fromList;
    if (activeProjectId && activeProjectId.startsWith('trackerhub-')) {
      return trackerHubTempProjectRef.current;
    }
    return null;
  }, [allProjects, activeProjectId]);
  
  const filteredProjects = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (query === "") return allProjects;
    return allProjects.filter(p => {
      const title = p.metadata?.title?.toLowerCase() || "";
      const url = p.url?.toLowerCase() || "";
      const artist = p.metadata?.artist?.toLowerCase() || "";
      const trackTitles = p.metadata?.tracks?.map(t => t.title?.toLowerCase() || "").join(" ") || "";
      return title.includes(query) || url.includes(query) || artist.includes(query) || trackTitles.includes(query);
    });
  }, [debouncedSearchQuery, allProjects]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem("yeleaks_dark_mode", JSON.stringify(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  useEffect(() => {
    try {
      if (activeProjectId) {
        localStorage.setItem("yeleaks_active_project_id", activeProjectId);
      } else {
        localStorage.removeItem("yeleaks_active_project_id");
      }
    } catch {}
  }, [activeProjectId]);

  useEffect(() => {
    try {
      localStorage.setItem("yeleaks_current_track_index", String(currentTrackIndex));
    } catch {}
  }, [currentTrackIndex]);

  useEffect(() => {
    try {
      localStorage.setItem("yeleaks_volume", String(volume));
    } catch {}
  }, [volume]);

  useEffect(() => {
    try {
      if (expandedProjectIds.size > 0) {
        localStorage.setItem("yeleaks_expanded_projects", JSON.stringify([...expandedProjectIds]));
      } else {
        localStorage.removeItem("yeleaks_expanded_projects");
      }
    } catch {}
  }, [expandedProjectIds]);

  useEffect(() => {
    activeProjectRef.current = allProjects.find(p => p.id === activeProjectId) || null;
  }, [activeProjectId, allProjects]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    hasAdvancedRef.current = false;
  }, [currentTrackIndex, activeProjectId]);

  useEffect(() => {
    let audio: any = null;
    let listenerCleanup: (() => void) | null = null;
    
    const attachListeners = (audioEl: any) => {
      const onTimeUpdate = () => {
        setCurrentTime(audioEl.currentTime);
        if (!hasAdvancedRef.current && audioEl.duration && !isNaN(audioEl.duration) && audioEl.currentTime >= audioEl.duration - 0.5) {
          hasAdvancedRef.current = true;
          console.log("[YELEAKS] Near end via timeupdate, advancing to next");
          handleNextTrack();
        }
      };

      const onLoadedMetadata = () => {
        if (audioEl.duration && !isNaN(audioEl.duration)) {
          setTrackDuration(audioEl.duration);
        }
      };

      const onEnded = () => {
        console.log("[YELEAKS] Track ended, advancing to next");
        if (!hasAdvancedRef.current) {
          hasAdvancedRef.current = true;
          handleNextTrack();
        }
      };

      audioEl.addEventListener("timeupdate", onTimeUpdate);
      audioEl.addEventListener("loadedmetadata", onLoadedMetadata);
      audioEl.addEventListener("ended", onEnded);

      return () => {
        audioEl.removeEventListener("timeupdate", onTimeUpdate);
        audioEl.removeEventListener("loadedmetadata", onLoadedMetadata);
        audioEl.removeEventListener("ended", onEnded);
        audioEl.pause();
      };
    };
    
    audio = new Audio();
    audioRef.current = audio;
    setIsAudioReady(true);
    listenerCleanup = attachListeners(audio);
    
    return () => {
      if (listenerCleanup) {
        listenerCleanup();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.volume = isMuted ? 0 : volume;
      audio.muted = isMuted;
    }
  }, [volume, isMuted]);

  const getProxiedAudioUrl = (originalUrl: string) => {
    if (!originalUrl) return originalUrl;
    return `${WORKER_URL}/?proxy_audio=${encodeURIComponent(originalUrl)}`;
  };

  useEffect(() => {
    if (!isAudioReady) return;
    const audio = audioRef.current;
    if (!audio) return;

    console.log("[YELEAKS] Audio effect running, isAudioReady:", isAudioReady, "activeProject:", !!activeProject, "activeProject?.metadata:", !!activeProject?.metadata);

    if (activeProject && activeProject.metadata) {
      const tracks = activeProject.metadata.tracks;
      const activeTrack = tracks[currentTrackIndex];
      console.log("[YELEAKS] Tracks count:", tracks.length, "currentTrackIndex:", currentTrackIndex, "activeTrack:", !!activeTrack);

      if (activeTrack) {
        let activeTrackUrl = activeTrack.audioUrl || "";
        console.log("[YELEAKS] activeTrackUrl:", activeTrackUrl);
        
        if (activeTrackUrl) {
          const effectiveUrl = getProxiedAudioUrl(activeTrackUrl);
          const currentSrc = audio.src || "";
          const needsNewSource = currentSrc !== effectiveUrl;
          
          if (needsNewSource) {
            console.log("[YELEAKS] Setting audio source:", effectiveUrl);
            audio.src = effectiveUrl;
            audio.load();
          }

          if (isPlaying) {
            const retryKey = `${activeProject.id}-${currentTrackIndex}`;
            const alreadyRetried = audioRetryKeyRef.current === retryKey;
            audio.play().then(() => {
              console.log("[YELEAKS] Playback started");
            }).catch(async (e: any) => {
              console.warn("[YELEAKS] Audio play failed:", e.message, "for url:", effectiveUrl);
              if (isPlayingRef.current && !alreadyRetried) {
                audioRetryKeyRef.current = retryKey;
                await forceRefreshMetadata(activeProject.id);
                audioRetryKeyRef.current = "";
                if (isPlayingRef.current) {
                  setTimeout(() => {
                    if (audioRef.current && isPlayingRef.current) {
                      audioRef.current.load();
                      audioRef.current.play().catch(() => {
                        setIsPlaying(false);
                      });
                    }
                  }, 300);
                }
              } else {
                audioRetryKeyRef.current = "";
                setIsPlaying(false);
              }
            });
          } else {
            audio.pause();
          }
        } else {
          console.warn("[YELEAKS] No audio URL for track");
          audioRef.current?.pause();
        }
      } else {
        audioRef.current?.pause();
        if (isPlaying) {
          const mockInterval = setInterval(() => {
            setCurrentTime((prev) => {
              if (prev >= trackDuration) {
                handleNextTrack();
                return 0;
              }
              return prev + 1;
            });
          }, 1000);
          return () => clearInterval(mockInterval);
        }
      }
    } else {
      console.log("[YELEAKS] No active project or metadata");
      audioRef.current?.pause();
    }
  }, [isPlaying, activeProjectId, currentTrackIndex, activeProject?.metadata, isAudioReady]);

  const metadataCache = useRef<Record<string, ProjectMetadata>>({});

  const fetchMetadataForProject = async (project: StreamProject): Promise<StreamProject> => {
    if (metadataCache.current[project.url]) {
      return {
        ...project,
        metadata: metadataCache.current[project.url],
        isLoadingMetadata: false
      };
    }

    try {
      const response = await fetch(api('/api/project-metadata?url=' + encodeURIComponent(project.url)));
      if (!response.ok) throw new Error("Metadata request failed");
      const json = await response.json();
      
      if (json && json.success && json.project) {
        if (json.project.exists === false) {
          console.log(`Project not found in worker: ${json.project.url}`);
          await handleDeleteNotFoundProject(json.project.url);
          return {
            ...project,
            metadata: null,
            isLoadingMetadata: false
          };
        }
        
        let rawTracks = json.project.tracks || [];
        if (rawTracks && typeof rawTracks === 'object' && !Array.isArray(rawTracks)) {
          rawTracks = Object.keys(rawTracks)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => rawTracks[key]);
        }
        
        const tracks = rawTracks.map((track: any, idx: number) => {
          const titleFields = [track.title, track.name, track.filename, track.track_name, track.song_title];
          let title = titleFields.find(t => t && typeof t === 'string' && !/^track\s*\d+$/i.test(t)) || "";
          
          if (!title && track.audioUrl) {
            const filename = track.audioUrl.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
            if (filename && !["audio", "private-audio", "private-transcoded-audio"].includes(filename)) {
              title = filename.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
            }
          }
          
          if (!title) {
            title = `Track ${idx + 1}`;
          }
          
          const urlForFormat = track.audioUrl ? track.audioUrl.split("?")[0] : "";
          const format = track.format || track.fileFormat || (urlForFormat ? urlForFormat.split(".").pop()?.toUpperCase() : "");
          
          return {
            num: track.num || idx + 1,
            title,
            date: track.date || "",
            audioUrl: track.audioUrl || track.url || "",
            format: format || undefined
          };
        });
        
        const metadata: ProjectMetadata = {
          title: json.project.title,
          artist: json.project.artist || "Ye",
          tracksCount: json.project.tracksCount || json.project.track_count || tracks.length || 0,
          duration: json.project.duration || json.project.total_duration || "N/A",
          artworkUrl: json.project.artworkUrl || json.project.artwork_url || json.project.cover_url || "",
          tracks,
          lastRefreshed: Date.now()
        };
        metadataCache.current[project.url] = metadata;
        return {
          ...project,
          metadata,
          isLoadingMetadata: false
        };
      }
      throw new Error("Invalid response schema from proxy");
    } catch (e: any) {
      console.warn(`Failed to fetch metadata for ${project.id}, loading fallback:`, e.message);
      const fallback: ProjectMetadata = {
        title: "Unknown Project",
        artist: "Leaked Material",
        tracksCount: 1,
        duration: "3m 15s",
        artworkUrl: "",
        tracks: [
          { num: 1, title: "Studio Demo Reference", date: "Jan 2026" }
        ]
      };
      return {
        ...project,
        metadata: fallback,
        isLoadingMetadata: false
      };
    }
  };

  const forceRefreshMetadata = async (projectId: string) => {
    const project = remoteProjects.find(p => p.id === projectId);
    if (!project) return;
    
    delete metadataCache.current[project.url];
    const resolved = await fetchMetadataForProject(project);
    setRemoteProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...resolved } : p));
  };

  const fetchAllMetadataBatch = async (projects: StreamProject[]) => {
    const validProjects = projects.filter(p => p.url && typeof p.url === 'string' && p.url.startsWith('http'));
    if (validProjects.length === 0) return;
    
    const urls = validProjects.map(p => p.url);
    try {
      const response = await fetch(api('/api/projects-metadata?urls=' + encodeURIComponent(JSON.stringify(urls))));
      if (!response.ok) throw new Error("Batch metadata request failed");
      const json = await response.json();
      
      if (json && json.success && json.projects && json.projects.length > 0) {
        const updatedProjects: StreamProject[] = [];
        const deletedProjectIds: string[] = [];
        
        for (const project of validProjects) {
          const projectData = json.projects.find((p: any) => p.url === project.url);
          if (projectData && projectData.project) {
            if (projectData.project.exists === false) {
              console.log(`Project not found in worker: ${projectData.project.url}`);
              await handleDeleteNotFoundProject(projectData.project.url);
              deletedProjectIds.push(project.id);
              continue;
            }
            
            const rawTracks = projectData.project.tracks || [];
            const tracks = rawTracks.map((track: any, idx: number) => {
              const titleFields = [track.title, track.name, track.filename, track.track_name, track.song_title];
              let title = titleFields.find((t: any) => t && typeof t === 'string' && !/^track\s*\d+$/i.test(t)) || "";
              
              if (!title && track.audioUrl) {
                const filename = track.audioUrl.split("/").pop()?.replace(/\.[^/.]+$/, "") || "";
                if (filename && !["audio", "private-audio", "private-transcoded-audio"].includes(filename)) {
                  title = filename.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
                }
              }
              
              if (!title) {
                title = `Track ${idx + 1}`;
              }
              
              const format = track.format || track.fileFormat || (track.audioUrl ? (() => {
                const url = track.audioUrl.split("?")[0];
                return url.split(".").pop()?.toUpperCase() || "";
              })() : "");
              
              return {
                num: track.num || idx + 1,
                title,
                date: track.date || "",
                audioUrl: track.audioUrl || track.url || "",
                format: format || undefined
              };
            });
            
            const metadata: ProjectMetadata = {
              title: projectData.project.title,
              artist: projectData.project.artist || "Ye",
              tracksCount: projectData.project.tracksCount || tracks.length || 0,
              duration: projectData.project.duration || "N/A",
              artworkUrl: projectData.project.artworkUrl || "",
              tracks,
              lastRefreshed: Date.now()
            };

            metadataCache.current[project.url] = metadata;
            updatedProjects.push({
              ...project,
              metadata,
              isLoadingMetadata: false
            });
          } else {
            updatedProjects.push(project);
          }
        }
        
        setRemoteProjects(prev => [...prev.filter(p => !validProjects.some(vp => vp.id === p.id) && !deletedProjectIds.includes(p.id)), ...updatedProjects]);
      }
    } catch (e: any) {
      console.warn("Batch metadata fetch failed:", e.message);
    }
  };

  useEffect(() => {
    setIsLoading(true);

    const loadProjects = async () => {
      try {
        const response = await fetch(api('/api/projects'));
        if (!response.ok) throw new Error(`Projects request failed: ${response.status}`);
        const json = await response.json();
        if (!json?.success) throw new Error(json?.error || 'Failed to load projects');
        const projects = Array.isArray(json.projects) ? json.projects : [];
        const items: StreamProject[] = projects.map((p: any) => {
          const url = p.url || "";
          const cached = metadataCache.current[url];
          return {
            id: p._docId || url,
            url: url,
            linkType: 'UNTITLED',
            isLoadingMetadata: !cached,
            metadata: cached || undefined
          };
        });
        setRemoteProjects(items);
        setProxyStatus("synced");
        setIsLoading(false);

        const itemsNeedingMetadata = items.filter(p => !p.metadata);
        if (itemsNeedingMetadata.length > 0) {
          fetchAllMetadataBatch(itemsNeedingMetadata);
        }
      } catch (e: any) {
        console.error("Load projects error:", e.message);
        setRemoteProjects([]);
        setProxyStatus("offline");
        setIsLoading(false);
      }
    };

    loadProjects();
    const interval = setInterval(loadProjects, 30000);

    return () => clearInterval(interval);
  }, []);

  const handlePlayToggle = (projectId: string, index: number = 0) => {
    if (activeProjectId === projectId) {
      if (currentTrackIndex === index) {
        setIsPlaying(!isPlaying);
      } else {
        setCurrentTrackIndex(index);
        setCurrentTime(0);
        setIsPlaying(true);
      }
    } else {
      setActiveProjectId(projectId);
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    console.log("[YELEAKS] handleNextTrack called, currentTrackIndex:", currentTrackIndex, "isPlaying:", isPlaying);
    const activeProject = activeProjectRef.current;
    if (!activeProject || !activeProject.metadata) return;
    const tracks = activeProject.metadata.tracks;
    if (tracks.length === 0) return;

    if (isLoop) {
      if (audioRef.current) {
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      setCurrentTime(0);
      return;
    }

    let nextIndex = currentTrackIndexRef.current + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else if (nextIndex >= tracks.length) {
      nextIndex = 0;
    }

    console.log("[YELEAKS] Advancing to track index:", nextIndex);
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
  };

  const handlePrevTrack = () => {
    if (!activeProject || !activeProject.metadata) return;
    const tracks = activeProject.metadata.tracks;
    if (tracks.length === 0) return;

    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = tracks.length - 1;
    }
    setCurrentTrackIndex(prevIndex);
    setCurrentTime(0);
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const getProjectFingerprint = (project: any): string | null => {
    if (!project || !project.tracks || !Array.isArray(project.tracks) || project.tracks.length === 0) return null;
    const audioUrls = project.tracks
      .map((t: any) => t.audioUrl)
      .filter(Boolean)
      .sort();
    return audioUrls.join("|");
  };

  const getExistingFingerprints = (): Set<string> => {
    const fingerprints = new Set<string>();
    for (const project of remoteProjects) {
      const fp = getProjectFingerprint(project.metadata);
      if (fp) fingerprints.add(fp);
    }
    return fingerprints;
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    try {
      const rawInput = newUrl.trim();
      const urls = rawInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      
      if (urls.length === 0) return;

      const invalidUrls = urls.filter(url => !url.startsWith('https://untitled.stream/') && !url.includes('unrlsd.app'));
      if (invalidUrls.length > 0) {
        triggerNotification('Only https://untitled.stream/ and https://unrlsd.app/ links are allowed.', 'error');
        return;
      }

      const data = await workerPost({ urls });

      if (data.success) {
        let added = 0;
        let skipped = 0;
        
        if (data.results && Array.isArray(data.results)) {
          added = data.results.filter((r: any) => r.success).length;
          skipped = data.results.filter((r: any) => !r.success).length;
        } else if (data.project) {
          added = 1;
        }

        if (added > 0 || skipped > 0) {
          triggerNotification(`ADDED ${added} ${added === 1 ? 'PROJECT' : 'PROJECTS'}${skipped > 0 ? ` | ${skipped} DUPLICATE${skipped > 1 ? 'S' : ''} SKIPPED` : ''}`);
        } else {
          triggerNotification('No new projects found. All URLs were duplicates or invalid.', 'error');
        }
      } else {
        triggerNotification('Failed to fetch project data: ' + (data.error || 'Unknown error'), 'error');
      }

      setNewUrl("");
      setShowAddDropdown(false);
    } catch (err: any) {
      console.error("Failed to add project(s):", err);
      triggerNotification(`Error: ${err.message}`, 'error');
    }
  };

  const toggleExpandedProject = useCallback((projectId: string) => {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const toggleExpandedEra = useCallback((eraKey: string) => {
    setExpandedEras(prev => {
      const next = new Set(prev);
      if (next.has(eraKey)) next.delete(eraKey);
      else next.add(eraKey);
      return next;
    });
  }, []);

  const handleDeleteNotFoundProject = async (projectUrl: string) => {
    try {
      console.log(`Searching for project to delete: ${projectUrl}`);
      const data = await workerPost({ mode: "delete-by-url", url: projectUrl });
      console.log(`Delete result:`, data);
    } catch (err: any) {
      console.error("Failed to delete project:", err.message, err);
    }
  };

  const getWaveformHeights = (title: string, count: number = 40) => {
    const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const heights = [];
    for (let i = 0; i < count; i++) {
      const sinVal = Math.sin(i * 0.5 + hash);
      const cosVal = Math.cos(i * 0.3 - hash);
      const val = Math.abs(sinVal * cosVal);
      heights.push(Math.round(val * 22) + 6);
    }
    return heights;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newTime = percentage * trackDuration;
    
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, trackId: string, trackUrl: string, projectId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY, trackId, trackUrl, projectId: projectId || '' });
  };

  const handleExportTrack = async (trackUrl: string, trackTitle: string, trackFormat?: string) => {
    const ext = trackFormat ? trackFormat.toLowerCase() : 'mp3';
    try {
      const proxyUrl = `https://proxy.jayden-gass10.workers.dev/?proxy_audio=${encodeURIComponent(trackUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy HTTP error ' + response.status);
      const blob = await response.blob();
      if (blob.size < 1024) throw new Error('Blob too small, likely not audio data');
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${trackTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.error('Failed to download track:', err);
      alert('Failed to download track.');
    }
  };

  const downloadTracksAsZip = async (tracks: any[], zipName: string, onProgress?: (current: number, total: number, failed: number) => void) => {
    if (typeof (window as any).JSZip === 'undefined') {
      alert('JSZip library failed to load from CDN!');
      return;
    }
    if (!tracks || tracks.length === 0) {
      alert('No tracks selected for download.');
      return;
    }

    const JSZip = (window as any).JSZip;
    const zip = new JSZip();
    const folder = zip.folder(zipName.replace('.zip', ''));
    
    let successCount = 0;
    let failedCount = 0;

    const getTrackTitle = (track: any) => {
      if (typeof track.title === 'string' && track.title.trim()) return track.title;
      if (track.name?.title) return track.name.title;
      if (track.name?.raw) return track.name.raw;
      return 'Track';
    };

    const getTrackFormat = (track: any) => {
      if (track.format) return track.format.toLowerCase();
      if (track.quality) return track.quality.toLowerCase();
      return 'mp3';
    };

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const directUrl = track.audioUrl || track.links?.[0]?.url || '';
      if (!directUrl) {
        console.error('No audio URL for track:', getTrackTitle(track));
        failedCount++;
        onProgress?.(i + 1, tracks.length, failedCount);
        continue;
      }
      
      try {
        const proxyUrl = `https://proxy.jayden-gass10.workers.dev/?proxy_audio=${encodeURIComponent(directUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy HTTP error ' + response.status);
        
        const blob = await response.blob();
        if (blob.size < 1024) throw new Error('Blob too small, likely not audio data');
        
        const safeTitle = getTrackTitle(track).replace(/[/\\?%*:|"<>]/g, '-');
        const filename = `${track.num || i + 1} - ${safeTitle}.${getTrackFormat(track)}`;
        
        folder.file(filename, blob);
        successCount++;
      } catch (err) {
        console.error('Failed to fetch track ' + getTrackTitle(track) + ':', err);
        failedCount++;
      }

      onProgress?.(i + 1, tracks.length, failedCount);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (successCount === 0 && failedCount > 0) {
      alert('Could not download any tracks. All fetches failed.');
      return;
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 1000);
    } catch (zipErr) {
      console.error('Error generating ZIP:', zipErr);
      alert('Error generating ZIP: ' + zipErr.message);
    }
  };

  const handleExportTracks = async (projectId?: string) => {
    if (selectedTrackIds.length === 0) return;
    
    const targetProjectId = projectId || contextMenuPos?.projectId || activeProjectId;
    const project = targetProjectId ? allProjects.find(p => p.id === targetProjectId) || (targetProjectId.startsWith('trackerhub-') ? trackerHubTempProjectRef.current : null) : null;
    if (!project || !project.metadata) return;
    
    const tracksToDownload = project.metadata.tracks.filter(t => 
      selectedTrackIds.includes(t.num.toString())
    );
    
    if (tracksToDownload.length === 0) return;
    
    const zipName = `${project.metadata.title || project.title} (Selected).zip`;
    setDownloadProgress({ current: 0, total: tracksToDownload.length, failed: 0 });
    await downloadTracksAsZip(tracksToDownload, zipName, (current, total, failed) => {
      setDownloadProgress({ current, total, failed });
    });
    setDownloadProgress(null);
    
    setSelectedTrackIds([]);
  };

  const handleExportProject = async (projectId?: string) => {
    const targetProjectId = projectId || contextMenuPos?.projectId || activeProjectId;
    const project = targetProjectId ? allProjects.find(p => p.id === targetProjectId) || (targetProjectId.startsWith('trackerhub-') ? trackerHubTempProjectRef.current : null) : null;
    if (!project || !project.metadata) return;
    
    const zipName = `${project.metadata.artist || 'Artist'} - ${project.metadata.title || project.title}.zip`;
    setDownloadProgress({ current: 0, total: project.metadata.tracks.length, failed: 0 });
    await downloadTracksAsZip(project.metadata.tracks, zipName, (current, total, failed) => {
      setDownloadProgress({ current, total, failed });
    });
    setDownloadProgress(null);
  };

  const handleOpenReport = (projectId: string) => {
    setReportProjectId(projectId);
    setReportText('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim() || !reportProjectId) return;
    setReportSubmitting(true);
    try {
      const project = allProjects.find(p => p.id === reportProjectId);
      const response = await fetch(api('/api/report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: project?.url || '',
          title: project?.title || project?.metadata?.title || '',
          complaint: reportText.trim(),
          createdAt: new Date().toISOString()
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }
      setReportText('');
      setShowReportModal(false);
      setReportProjectId('');
      alert('Report submitted successfully.');
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      alert('Failed to submit report: ' + err.message);
    } finally {
      setReportSubmitting(false);
    }
  };

  const isTrackerHubProject = (projectId?: string) => typeof projectId === 'string' && projectId.startsWith('trackerhub-');

  const handleUntitledLink = () => {
    if (!activeProject) return;
    if (isTrackerHubProject(activeProject.id)) {
      const track = activeProject.metadata?.tracks?.[currentTrackIndex];
      const url = track?.rawUrl || track?.audioUrl || activeProject.url;
      if (url) window.open(url, '_blank');
      return;
    }
    window.open(activeProject.url, '_blank');
  };

  const handleTrackClick = (projectId: string, trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey) {
      const trackKey = (trackIndex + 1).toString();
      setSelectedTrackIds(prev => 
        prev.includes(trackKey) 
          ? prev.filter(k => k !== trackKey) 
          : [...prev, trackKey]
      );
      return;
    }
    handlePlayToggle(projectId, trackIndex);
  };

  const getRawTrackerTrackUrl = (track: any): string => {
    const allLinks = (track.links || [])
      .filter((l: any) => l.url && typeof l.url === 'string' && l.url.startsWith('http'))
      .map((l: any) => normalizePillowsUrl(l.url));
    
    const audioLinks = allLinks.filter(l => isLikelyAudioUrl(l));
    if (audioLinks.length > 0) return audioLinks[0];
    if (allLinks.length > 0) return allLinks[0];
    
    if (track.audioUrl && typeof track.audioUrl === 'string' && track.audioUrl.startsWith('http')) {
      return track.audioUrl;
    }
    if (track.quality && typeof track.quality === 'string' && track.quality.startsWith('http')) {
      return normalizePillowsUrl(track.quality);
    }
    if (track.available_length && typeof track.available_length === 'string' && track.available_length.startsWith('http')) {
      return normalizePillowsUrl(track.available_length);
    }
    return '';
  };

  const getFormatFromUrl = (url: string) => {
    if (!url) return 'mp3';
    try {
      const path = new URL(url).pathname.toLowerCase();
      const match = path.match(/\.(mp3|wav|flac|m4a|aac|ogg|wma|alac|opus|weba)(\?|$)/);
      if (match) return match[1];
    } catch {}
    return 'mp3';
  };

  const handleLyricsToggle = async () => {
    const next = !showLyricsPanel;
    setShowLyricsPanel(next);
    if (next && activeProject?.metadata?.tracks?.[currentTrackIndex]) {
      const track = activeProject.metadata.tracks[currentTrackIndex];
      const title = track.title || track.name?.title || track.name?.raw || '';
      const artist = activeProject.metadata.title || activeProject.title || 'Unknown';
      setLyricsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const el = amLyricsRef.current;
        if (el) {
          const clean = (s: string) => s.replace(/\s*[\(\[].*?[\)\]]/g, "").replace(/\s+/g, " ").trim();
          const cleanTitle = clean(title);
          const cleanArtist = clean(artist);
          el.songTitle = cleanTitle || title;
          el.songArtist = cleanArtist || artist;
          el.query = [cleanTitle || title, cleanArtist || artist].filter(Boolean).join(" - ");
          el.highlightColor = "#ffffff";
          el.autoScroll = true;
          el.interpolate = true;
          await el.fetchLyrics();
        }
      } catch {
        // lyrics fetch failed; panel will show empty state
      } finally {
        setLyricsLoading(false);
      }
    }
  };

  const handleTrackerTrackClick = async (era: any, trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!era) return;
    
    if (e.ctrlKey || e.metaKey) {
      const trackKey = `${era.name || 'era'}-${trackIndex}`;
      setSelectedTrackerTrackIds(prev => {
        const next = new Set(prev);
        if (next.has(trackKey)) {
          next.delete(trackKey);
        } else {
          next.add(trackKey);
        }
        return next;
      });
      return;
    }
    
    const track = era.tracks[trackIndex];
    const rawUrl = getRawTrackerTrackUrl(track);
    const resolvedUrl = rawUrl ? await resolvePlayableUrl(rawUrl) : '';
    const playUrl = resolvedUrl || rawUrl;
    
    if (!playUrl || /youtube\.com\/|youtu\.be\//i.test(playUrl)) {
      console.warn('[TrackerHub] Skipping non-playable track:', track.name?.title || track.name?.raw);
      return;
    }

    const format = getFormatFromUrl(playUrl);
    const title = track.name?.title || track.name?.raw || `Track ${trackIndex + 1}`;
    const tempId = `trackerhub-${Date.now()}-${trackIndex}`;
    
    const eraTracks = (era.tracks || []).map((t: any, i: number) => {
      const tTitle = t.name?.title || t.name?.raw || `Track ${i + 1}`;
      const tRawUrl = getRawTrackerTrackUrl(t);
      return {
        num: i + 1,
        title: tTitle,
        date: t.file_date || t.leak_date || '',
        audioUrl: tRawUrl,
        rawUrl: tRawUrl,
        format: getFormatFromUrl(tRawUrl)
      };
    });
    
    eraTracks[trackIndex] = {
      ...eraTracks[trackIndex],
      audioUrl: playUrl
    };
    
    const tempProject: any = {
      id: tempId,
      url: playUrl,
      title: title,
      metadata: {
        title: era.name || 'Unknown Era',
        artist: 'Kanye West',
        tracksCount: era.tracks.length,
        duration: '',
        artworkUrl: getTrackerHubCover(era),
        tracks: eraTracks
      }
    };

    trackerHubTempProjectRef.current = tempProject;

    setRemoteProjects(prev => {
      const withoutOldTemps = prev.filter(p => !p.id.startsWith('trackerhub-'));
      return [...withoutOldTemps, tempProject];
    });
    
    setActiveProjectId(tempId);
    setCurrentTrackIndex(trackIndex);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleTrackerContextMenu = async (e: React.MouseEvent, track: any, era: any, trackIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const url = await resolveTrackerTrackUrl(track);
    const title = track.name?.title || track.name?.raw || `Track ${trackIndex + 1}`;
    const format = track.quality?.toLowerCase() || 'mp3';
    setTrackerContextMenuPos({ 
      x: e.clientX, 
      y: e.clientY, 
      trackUrl: url, 
      trackTitle: title,
      trackFormat: format,
      era,
      trackIndex
    });
  };

  const handleTrackerExportTrack = async () => {
    if (!trackerContextMenuPos) return;
    const { trackUrl, trackTitle, trackFormat } = trackerContextMenuPos;
    const ext = trackFormat || 'mp3';
    try {
      const proxyUrl = `https://proxy.jayden-gass10.workers.dev/?proxy_audio=${encodeURIComponent(trackUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy HTTP error ' + response.status);
      const blob = await response.blob();
      if (blob.size < 1024) throw new Error('Blob too small, likely not audio data');
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${trackTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.error('Failed to download track:', err);
      alert('Failed to download track.');
    }
    setTrackerContextMenuPos(null);
  };

  const handleExportTrackerEra = async (era: any) => {
    const rawTracks = era.tracks || [];
    if (rawTracks.length === 0) {
      alert('No tracks in this era to download.');
      return;
    }
    const tracks = await Promise.all(rawTracks.map(async (t: any, i: number) => {
      const rawUrl = getRawTrackerTrackUrl(t) || t.audioUrl;
      const resolvedUrl = rawUrl ? await resolvePlayableUrl(rawUrl) : '';
      const finalUrl = resolvedUrl || rawUrl;
      return {
        num: i + 1,
        title: t.name?.title || t.name?.raw || `Track ${i + 1}`,
        audioUrl: finalUrl,
        links: t.links,
        format: getFormatFromUrl(finalUrl) || undefined,
        quality: t.quality
      };
    }));
    const zipName = `${era.name || 'era'}.zip`;
    setDownloadProgress({ current: 0, total: tracks.length, failed: 0 });
    await downloadTracksAsZip(tracks, zipName, (current, total, failed) => {
      setDownloadProgress({ current, total, failed });
    });
    setDownloadProgress(null);
  };

  const handleExportTrackerTracks = async (era: any, trackIndices: number[]) => {
    if (trackIndices.length === 0) return;
    const rawTracks = era.tracks || [];
    const tracks = await Promise.all(trackIndices.map(async (trackIndex, i) => {
      const t = rawTracks[trackIndex];
      if (!t) return null;
      const rawUrl = getRawTrackerTrackUrl(t) || t.audioUrl;
      const resolvedUrl = rawUrl ? await resolvePlayableUrl(rawUrl) : '';
      const finalUrl = resolvedUrl || rawUrl;
      return {
        num: i + 1,
        title: t.name?.title || t.name?.raw || `Track ${trackIndex + 1}`,
        audioUrl: finalUrl,
        links: t.links,
        format: getFormatFromUrl(finalUrl) || undefined,
        quality: t.quality
      };
    }));
    const validTracks = tracks.filter(Boolean);
    if (validTracks.length === 0) return;
    const zipName = `${era.name || 'era'} (Selected).zip`;
    setSelectedTrackerTrackIds(new Set());
    setDownloadProgress({ current: 0, total: validTracks.length, failed: 0 });
    await downloadTracksAsZip(validTracks, zipName, (current, total, failed) => {
      setDownloadProgress({ current, total, failed });
    });
    setDownloadProgress(null);
  };

  const handleDocumentClick = (e: MouseEvent) => {
    if (selectedTrackIds.length > 0) {
      setSelectedTrackIds([]);
    }
    if (selectedTrackerTrackIds.size > 0) {
      setSelectedTrackerTrackIds(new Set());
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [selectedTrackIds]);

  useEffect(() => {
    const handleScroll = () => setHoveredTrackerTrack(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <Fragment>
    <div 
      className={`min-h-screen font-sans selection:bg-neutral-200 selection:text-black antialiased relative overflow-x-hidden ${isDarkMode ? 'dark bg-[#0a0a0a] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'}`}
    >
      
      {showNotification && notificationData && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
          <div 
            onClick={() => {
              if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
                notificationTimeoutRef.current = null;
              }
              setShowNotification(false);
              setNotificationData(null);
            }}
            className="px-6 py-3 rounded-lg border shadow-lg font-mono text-xs tracking-widest uppercase cursor-pointer animate-in bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
          >
             {notificationData.message}
          </div>
        </div>
      )}

      {downloadProgress && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="px-6 py-3 rounded-lg border shadow-lg font-mono text-xs tracking-widest uppercase animate-in bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white">
            Downloading {downloadProgress.current}/{downloadProgress.total}{downloadProgress.failed > 0 ? ` • Failed ${downloadProgress.failed}` : ''}
          </div>
        </div>
      )}

      {activeSection === 'yeleaks' && (
        <div className="w-full px-4 py-16">
        
        <header className="mb-12" style={{ position: "relative", width: "100%", minHeight: "80px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", boxSizing: "border-box", fontFamily: "IBM Plex Mono" }}>
          
          {/* Left side buttons */}
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "row", gap: "8px", alignItems: "center" }}>
            <a
              href="https://guns.lol/g4su"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer font-mono text-[10px] font-bold uppercase"
              title="Social"
            >
              S
            </a>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
              title="Update"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
              title="Info"
            >
              <Info size={16} />
            </button>
          </div>

          {/* Barrel slider centered */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div
              ref={barrelRef}
              className="barrel-container"
              onPointerDown={handleBarrelPointerDown}
              onPointerMove={handleBarrelPointerMove}
              onPointerUp={handleBarrelPointerUp}
              onPointerCancel={handleBarrelPointerUp}
              style={{ width: "220px" }}
            >
                <div className="barrel-slider">
                  <h1 id="barrel-title-1" className="barrel-title" style={{ opacity: 1 }}>YELEAKS</h1>
                  <h1 id="barrel-title-2" className="barrel-title" style={{ opacity: 0 }}>Trackerhub</h1>
                </div>
            </div>
          </div>

          {/* Add Link on the right */}
          <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "6px", width: "10rem" }}>
              <button
                id="add-link-btn"
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                style={{ padding: "10px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "6px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: "12px", fontWeight: 500, width: "100%" }}
              >
                + Add Link
              </button>
              {showAddDropdown && (
                <input
                  type="text"
                     placeholder="[UNTITLED] / [UNRLSD]"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProject(e as any);
                    }
                  }}
                  style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "12px", outline: "none", boxSizing: "border-box", fontFamily: "monospace", width: "100%", color: "var(--text-primary)" }}
                />
              )}
          </div>

        </header>

        {/* Search bar centered below header */}
        <div className="flex justify-center mb-10">
          <input
            type="text"
            placeholder="SEARCH PROJECT/TRACK"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-60 px-4 py-3 text-xs font-mono uppercase tracking-wider bg-white border border-neutral-200 rounded-lg text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
        </div>

        <div className="space-y-8 max-w-xl mx-auto">
          {isLoading ? (
               <div className="text-center py-28 font-mono text-xs tracking-[0.25em] text-neutral-400 uppercase animate-pulse">
                  LOADING...
                </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => {
              const meta = project.metadata;
              const tracks = meta?.tracks || [];
              const artworkSrc = meta?.artworkUrl || "";
              const isThisProjectPlaying = activeProjectId === project.id && isPlaying;
              const isExpanded = expandedProjectIds.has(project.id);

              return (
                <div 
                  key={project.id}
                  className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300"
                >
                  
                   <div 
                      onClick={() => toggleExpandedProject(project.id)}
                     className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50/20 bg-neutral-50/15 transition-colors"
                   >
                      <div className="relative w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 flex items-center justify-center shadow-xs">
                        {artworkSrc ? (
                           <img 
                             src={artworkSrc} 
                             alt={project.title}
                             referrerPolicy="no-referrer"
                             loading="lazy"
                             className="w-full h-full object-cover"
                           />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                             <Music size={20} className="text-neutral-300" />
                           </div>
                         )}
                      </div>

                     <div className="ml-4 min-w-0">
                       <h2 className="text-base font-sans font-bold text-black tracking-wide truncate uppercase">
                          {renderExplicitTitle(meta?.title || project.title)}
                       </h2>
                       <p className="text-sm text-neutral-400 font-sans mt-1.5 truncate">
                         {meta?.tracksCount || tracks.length} Tracks • {meta?.artist || "YE"}
                       </p>
                     </div>
                         <div className="flex items-center gap-2 ml-auto">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                                handleExportProject(project.id);
                            }}
                            className="p-2 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                            title="Download Project"
                          >
                             <Download size={15} />
                          </button>
                          <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleOpenReport(project.id);
                             }}
                             className="p-2 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                             title="Report"
                           >
                             <Flag size={15} />
                           </button>
                          <a 
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded border border-neutral-200 text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1 font-bold whitespace-nowrap"
                            title="Open in Official App"
                          >
                              <span>{project.url?.includes('unrlsd.app') ? '[UNRLSD] Link' : 'UNTITLED LINK'}</span>
                            <ExternalLink size={11} />
                          </a>
                       </div>
                  </div>

                       <div 
                         className={`transition-all duration-300 ease-in-out overflow-hidden ${
                           isExpanded ? "max-h-[1000px] border-t border-neutral-100" : "max-h-0"
                         }`}
                       >
                         {project.notes && 
                          project.notes.trim() !== "" && 
                          project.notes.toLowerCase() !== "imported via link." && (
                           <div className="px-4 py-2 bg-neutral-50/50 border-b border-neutral-100 flex items-start gap-2">
                             <Terminal size={10} className="text-neutral-400 mt-0.5" />
                             <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider leading-relaxed">
                               <strong>Log / Info</strong>: {project.notes}
                              </p>
                            </div>
                          )}

                            <div 
                              className="bg-white p-3 space-y-0.5 max-h-[400px] overflow-y-auto"
                              onScroll={(e) => {
                                const target = e.currentTarget;
                                const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                                if (scrollBottom < 150 && tracks.length > getVisibleTrackCount(project.id)) {
                                  scheduleShowMore(project.id);
                                }
                              }}
                            >
                              {tracks.length > 0 ? (
                            tracks.slice(0, getVisibleTrackCount(project.id)).map((track, idx) => {
                              const isCurrentActiveTrack = activeProjectId === project.id && currentTrackIndex === idx;
                              const trackKey = `${project.id}-${idx}`;
                              const isSelected = selectedTrackIds.includes((idx + 1).toString());
                              const query = searchQuery.trim().toLowerCase();
                              const matchesSearch = query === "" || 
                                track.title.toLowerCase().includes(query) ||
                                (track.format && track.format.toLowerCase().includes(query));
                              if (query !== "" && !matchesSearch) return null;
                              
                              return (
                                <div 
                                  key={`${track.num}-${idx}`}
                                  onClick={(e) => handleTrackClick(project.id, idx, e)}
                                   onContextMenu={(e) => handleContextMenu(e, `${project.id}-${idx}`, track.audioUrl || '', project.id)}
                                  className={`flex items-center px-4 py-2 rounded-lg transition-all cursor-pointer group ${
                                    isCurrentActiveTrack 
                                      ? "track-subtle-active" 
                                      : isSelected
                                      ? "track-subtle-selected"
                                      : "track-subtle-hover"
                                  }`}
                                >
                                  <span className={`text-sm font-mono font-bold flex items-center justify-center w-5 text-neutral-400`}>

                                  {idx + 1}
                                </span>
                                
                                 <span className={`ml-3 text-sm font-mono truncate text-neutral-700`} style={{ color: isSelected ? 'var(--text-secondary)' : undefined }}>
                                     {renderExplicitTitle(track.title)}
                                   </span>
                                   {track.format && (
                                    <span className={`ml-auto text-[12px] font-mono uppercase tracking-wider text-neutral-500`}>
                                      {track.format}
                                    </span>
                                  )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (track.audioUrl) {
                                          handleExportTrack(track.audioUrl, track.title, track.format);
                                        }
                                      }}
                                      className={`ml-2 p-1.5 transition-colors download-subtle text-neutral-400`}
                                     title="Download Track"
                                   >
                                     <Download size={15} />
                                   </button>
                               </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-neutral-400 font-mono text-xs uppercase tracking-wider">
                             No tracks available
                           </div>
                          )}
                        </div>
                    </div>

                 </div>
               );
             })
           ) : (
            <div className="text-center py-24 bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
              <p className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                {searchQuery.trim() ? "NO MATCHING PROJECTS" : "NO PROJECTS LOADED"}
              </p>
             </div>
           )}
          </div>
        </div>
      )}
 
      {contextMenuPos && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0"
            onClick={() => setContextMenuPos(null)}
          />
          <div
            className="fixed z-51 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[120px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
               {contextMenuPos.trackId.startsWith('project-') ? (
                 <button
                   onClick={() => {
                     const projectId = contextMenuPos.trackId.split('-').slice(0, -1).join('-');
                     handleExportProject(projectId);
                     setContextMenuPos(null);
                   }}
                  className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                >
                  Export Project
                </button>
              ) : selectedTrackIds.length === 0 ? (
                <button
                  onClick={() => {
                    const trackUrl = contextMenuPos.trackUrl;
                    if (trackUrl) {
                      const trackId = contextMenuPos.trackId;
                      if (trackId.includes('-')) {
                        const projectId = trackId.split('-').slice(0, -1).join('-');
                        const trackIndex = parseInt(trackId.split('-').pop() || '0');
                        const project = allProjects.find(p => p.id === projectId);
                        if (project && project.metadata) {
                          const track = project.metadata.tracks[trackIndex];
                          handleExportTrack(trackUrl, track?.title || project.metadata.title || 'track', track?.format);
                        } else {
                          handleExportTrack(trackUrl, 'track');
                        }
                      } else {
                        handleExportTrack(trackUrl, 'track');
                      }
                    }
                    setContextMenuPos(null);
                  }}
                  className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                >
                  Export Track
                </button>
               ) : selectedTrackIds.length === 1 ? (
                 <button
                   onClick={() => {
                     const trackId = (parseInt(contextMenuPos.trackId.split('-').pop() || '0') + 1).toString();
                     if (trackId) {
                       if (selectedTrackIds.includes(trackId)) {
                         setSelectedTrackIds([]);
                       } else {
                         setSelectedTrackIds([trackId]);
                       }
                     }
                     setContextMenuPos(null);
                   }}
                   className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                 >
                   Export Track
                 </button>
               ) : (
                  <button
                    onClick={() => {
                      const projectId = contextMenuPos.trackId.split('-').slice(0, -1).join('-');
                      handleExportTracks(projectId);
                      setContextMenuPos(null);
                    }}
                   className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                 >
                   Export Tracks({selectedTrackIds.length})
                 </button>
               )}
             </div>
           </div>
         )}

          {trackerContextMenuPos && (
           <div className="fixed inset-0 z-50">
             <div
               className="fixed inset-0"
               onClick={() => setTrackerContextMenuPos(null)}
             />
             <div
               className="fixed z-51 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[120px]"
               style={{ left: trackerContextMenuPos.x, top: trackerContextMenuPos.y }}
               onClick={(e) => {
                 e.stopPropagation();
               }}
               >
                 {(() => {
                   if (!trackerContextMenuPos?.era) return null;
                   const eraPrefix = `${trackerContextMenuPos.era.name || 'era'}-`;
                   const selectedInEra = Array.from(selectedTrackerTrackIds).filter(key => key.startsWith(eraPrefix)).length;
                   if (selectedInEra > 1) {
                     return (
                       <button
                         onClick={() => {
                           const indices = Array.from(selectedTrackerTrackIds)
                             .filter(key => key.startsWith(eraPrefix))
                             .map(key => {
                               const parts = key.split('-');
                               const idx = parseInt(parts[parts.length - 1] || '0', 10);
                               return idx;
                             });
                           handleExportTrackerTracks(trackerContextMenuPos.era!, indices);
                           setTrackerContextMenuPos(null);
                         }}
                         className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                       >
                         Download Selected ({selectedInEra})
                       </button>
                     );
                   }
                   return (
                     <button
                       onClick={handleTrackerExportTrack}
                       className="context-menu-item w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors"
                     >
                       Download Track
                     </button>
                   );
                 })()}
             </div>
           </div>
         )}

      {activeSection === 'trackerhub' && (
        <div className="w-full px-4 py-16">
        <header className="mb-12" style={{ position: "relative", width: "100%", minHeight: "80px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", boxSizing: "border-box", fontFamily: "IBM Plex Mono" }}>
          
          {/* Left side buttons */}
            <div style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "row", gap: "8px", alignItems: "center" }}>
              <a
                href="https://guns.lol/g4su"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer font-mono text-[10px] font-bold uppercase"
                title="Social"
              >
                S
              </a>
              <button
                onClick={() => setShowUpdateModal(true)}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
                title="Update"
              >
                <RefreshCw size={16} />
              </button>
               <button
                 onClick={() => setShowInfoModal(true)}
                 className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
                 title="Info"
               >
                 <Info size={16} />
               </button>
             </div>

            {/* Barrel slider centered */}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
              <div
                ref={barrelRef}
                className="barrel-container"
                onPointerDown={handleBarrelPointerDown}
                onPointerMove={handleBarrelPointerMove}
                onPointerUp={handleBarrelPointerUp}
                onPointerCancel={handleBarrelPointerUp}
                style={{ width: "220px" }}
              >
                <div className="barrel-slider">
                  <h1 id="barrel-title-1" className="barrel-title" style={{ opacity: 1 }}>YELEAKS</h1>
                  <h1 id="barrel-title-2" className="barrel-title" style={{ opacity: 0 }}>Trackerhub</h1>
                </div>
              </div>
            </div>

          </header>

          {/* Search bar centered below header */}
          <div className="flex justify-center mb-10 gap-2">
            <input
              type="text"
              placeholder="SEARCH ERA/TRACK"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 px-4 py-3 text-xs font-mono uppercase tracking-wider bg-white border border-neutral-200 rounded-lg text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            />
             {activeSection === 'trackerhub' && (
               <div style={{ position: "relative" }} className="flex items-center gap-1">
                 <button
                   onClick={() => setShowSortDropdown(!showSortDropdown)}
                   className="px-3 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
                   title="Sort"
                 >
                   <ChevronDown size={16} />
                 </button>
                 <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden md:inline">
                   {sortOption}
                 </span>
                  {showSortDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                      {['Unreleased', 'Released', 'Recent', 'Best Of', 'Worst Of', 'Special', 'Grails/Wanted', 'Unwanted', 'AI'].map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortOption(option);
                            setShowSortDropdown(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
             )}
          </div>

           {/* Kanye West tracker data */}
           <div className="space-y-8 max-w-xl mx-auto">
             {kanyeLoading ? (
               <div className="text-center py-28 font-mono text-xs tracking-[0.25em] text-neutral-400 uppercase animate-pulse">
                  LOADING...
               </div>
              ) : kanyeData?.eras ? (
                (() => {
                  const query = debouncedSearchQuery.trim().toLowerCase();
                  let filteredEras = filteredTrackerEras;
                  if (filteredEras.length === 0) {
                    return (
                      <div className="text-center py-24 bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
                        <p className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                          NO MATCHING ERAS/TRACKS
                        </p>
                       </div>
                    );
                  }
                  return filteredEras.map((era: any, idx: number) => {
                    const eraKey = era.name || `era-${idx}`;
                    const eraUniqueKey = `${eraKey}|${era._sourceTab || idx}`;
                    const isExpanded = expandedEras.has(eraKey);
                    const trackCount = (era.tracks || []).length;
                    
                    return (
                      <div 
                        key={eraUniqueKey}
                        className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300"
                      >
                        <div 
                          onClick={() => toggleExpandedEra(eraKey)}
                          className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50/20 bg-neutral-50/15 transition-colors"
                        >
                          <div className="relative w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 flex items-center justify-center shadow-xs">
                            {getTrackerHubCover(era) ? (
                               <img 
                                 src={getTrackerHubCover(era)} 
                                 alt={era.name}
                                 referrerPolicy="no-referrer"
                                 loading="lazy"
                                 className="w-full h-full object-cover"
                               />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                                 <Music size={20} className="text-neutral-300" />
                               </div>
                             )}
                          </div>

                          <div className="ml-4 min-w-0">
                            <h2 className="text-base font-sans font-bold text-black tracking-wide truncate uppercase">
                              {renderExplicitTitle(era.name || eraKey)}
                            </h2>
                            <p className="text-sm text-neutral-400 font-sans mt-1.5 truncate">
                              {trackCount} Tracks
                            </p>
                          </div>
                             <div className="flex items-center gap-2 ml-auto">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleExportTrackerEra(era);
                                 }}
                                 className="p-2 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                                 title="Download Era"
                               >
                                 <Download size={15} />
                               </button>
                             </div>
                        </div>

                         <div 
                           className={`transition-all duration-300 ease-in-out overflow-hidden ${
                             isExpanded ? "max-h-[1000px] border-t border-neutral-100" : "max-h-0"
                           }`}
                         >
                           {era.description && 
                            era.description.trim() !== "" && (
                             <div className="px-4 py-2 bg-neutral-50/50 border-b border-neutral-100 flex items-start gap-2">
                               <Terminal size={10} className="text-neutral-400 mt-0.5" />
                               <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider leading-relaxed">
                                 {era.description}
                               </p>
                             </div>
                           )}

                                <div 
                                  className="bg-white p-3 space-y-0.5 max-h-[400px] overflow-y-auto"
                                  onScroll={(e) => {
                                    const target = e.currentTarget;
                                    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                                    if (scrollBottom < 150 && (era.tracks || []).length > getVisibleTrackCount(eraKey)) {
                                      scheduleShowMore(eraKey);
                                    }
                                  }}
                                >
                                   {(era.tracks || [])
                                       .map((track: any, originalIndex: number) => ({ track, originalIndex }))
                                        .filter(({ track }: { track: any }) => {
                                         const trackTitle = (track.name?.title || '').toLowerCase();
                                         const trackAlt = (track.name?.raw || '').toLowerCase();
                                         const query = debouncedSearchQuery.trim().toLowerCase();
                                         if (query === "") return true;
                                         return trackTitle.includes(query) || trackAlt.includes(query);
                                        })
                                       .slice(0, getVisibleTrackCount(eraKey))
                                          .map(({ track, originalIndex }: { track: any, originalIndex: number }) => {
                                          const trackKey = `${era.name || 'era'}-${originalIndex}`;
                                          const isSelected = selectedTrackerTrackIds.has(trackKey);
                                           const trackDisplayTitle = track.name?.title || track.name?.raw || 'Unknown';
                                           const trackQuality = track.quality || '';
                                        
                                           return (
                                            <div 
                                            key={trackKey}
                                             onClick={(e) => {
                                               handleTrackerTrackClick(era, originalIndex, e);
                                             }}
                                            onContextMenu={(e) => handleTrackerContextMenu(e, track, era, originalIndex)}
                                             onMouseEnter={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              if (hoverTimeoutRef.current) {
                                                clearTimeout(hoverTimeoutRef.current);
                                                hoverTimeoutRef.current = null;
                                              }
                                              setHoveredTrackerTrack({
                                                eraKey,
                                                track,
                                                eraIndex: idx,
                                                trackIndex: originalIndex,
                                                rect
                                              });
                                            }}
                                           onMouseLeave={() => {
                                            hoverTimeoutRef.current = window.setTimeout(() => {
                                              setHoveredTrackerTrack(null);
                                            }, 100);
                                          }}
                                          className={`group relative flex items-center px-4 py-2 rounded-lg transition-all cursor-pointer ${
                                            isSelected ? "track-subtle-selected" : "track-subtle-hover"
                                          }`}
                                        >
                                          <span className={`text-sm font-mono font-bold flex items-center justify-center w-5 text-neutral-400`}>
                                            {originalIndex + 1}
                                          </span>
                                          
                                              <span className={`flex-1 ml-3 text-sm font-mono truncate text-neutral-700`}>
                                                  {renderExplicitTitle(trackDisplayTitle)}
                                              </span>
                                             {trackQuality && (
                                              <span className="text-[12px] font-mono uppercase tracking-wider text-neutral-500">
                                                {trackQuality}
                                              </span>
                                            )}
                                             <button
                                               onClick={async (e) => {
                                                 e.stopPropagation();
                                                 let url = track.audioUrl || track.links?.[0]?.url || '';
                                                 if (!url) return;
                                                 url = await resolvePlayableUrl(url);
                                                 if (url) {
                                                    handleExportTrack(url, trackDisplayTitle, getFormatFromUrl(url));
                                                }
                                              }}
                                                className={`ml-auto p-1.5 transition-colors download-subtle text-neutral-400`}
                                             title="Download Track"
                                           >
                                              <Download size={15} />
                                            </button>
                                       </div>
                                    );
                                  })}
                              </div>
                           </div>
                       </div>
                     );
                   });
                 })()
               ) : (
               <div className="text-center py-24 bg-white border border-neutral-200 rounded-xl p-10 shadow-sm">
                 <p className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                   NO TRACKER DATA
                 </p>
                </div>
              )}
              </div>
            </div>
         )}

        {hoveredTrackerTrack && (
          <div
            className="fixed z-[9999] bg-white border border-neutral-200 rounded-lg shadow-xl p-3 w-72"
            style={{
              top: `${hoveredTrackerTrack.rect.bottom + 8}px`,
              left: `${Math.min(hoveredTrackerTrack.rect.left, window.innerWidth - 300)}px`,
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = window.setTimeout(() => {
                setHoveredTrackerTrack(null);
              }, 100);
            }}
          >
            {hoveredTrackerTrack.track.name?.credits && hoveredTrackerTrack.track.name.credits.length > 0 && (
              <p className="text-[10px] font-mono text-neutral-500 mb-1">
                <strong>Credits:</strong> {hoveredTrackerTrack.track.name.credits.join(", ")}
              </p>
            )}
            {hoveredTrackerTrack.track.notes && (
              <p className="text-[10px] font-mono text-neutral-500 mb-1">
                <strong>Notes:</strong> {hoveredTrackerTrack.track.notes}
              </p>
            )}
            {hoveredTrackerTrack.track.leak_date && (
              <p className="text-[10px] font-mono text-neutral-400">
                <strong>Leak Date:</strong> {hoveredTrackerTrack.track.leak_date}
              </p>
            )}
            {hoveredTrackerTrack.track.available_length && (
              <p className="text-[10px] font-mono text-neutral-400">
                <strong>Availability:</strong> {hoveredTrackerTrack.track.available_length}
              </p>
            )}
            {hoveredTrackerTrack.track.type && (
              <p className="text-[10px] font-mono text-neutral-400">
                <strong>Type:</strong> {hoveredTrackerTrack.track.type}
              </p>
            )}
          </div>
        )}

        {activeProject && activeProject.metadata && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl px-3">
            {isTrackerHubProject(activeProjectId) ? (
              <div className={`relative backdrop-blur-md border shadow-2xl rounded-2xl px-5 py-4 flex items-center justify-between gap-5 overflow-hidden ${isDarkMode ? 'bg-neutral-900/95 text-white border-neutral-800' : 'bg-white text-neutral-900 border-neutral-200'}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
                  <div className="h-full transition-all duration-100 bg-neutral-500" style={{ width: `${(currentTime / (trackDuration || 1)) * 100}%` }} />
                  <input type="range" min="0" max={trackDuration || 100} step="0.1" value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Seek track" />
                </div>
                <div className="flex items-center min-w-0 gap-4 mt-0.5">
                  <div className={`relative w-[3.6rem] h-[3.6rem] rounded-md overflow-hidden shrink-0 border flex items-center justify-center shadow-xs ${isDarkMode ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-neutral-100'}`}>
                    {activeProject.metadata.artworkUrl ? (
                      <img src={activeProject.metadata.artworkUrl} alt={activeProject.title} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={20} className={isDarkMode ? 'text-neutral-600' : 'text-neutral-400'} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className={`text-sm font-sans font-bold tracking-wide truncate uppercase leading-tight ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {renderExplicitTitle(activeProject.metadata.tracks[currentTrackIndex].title)}
                    </h4>
                    <p className={`text-xs font-mono mt-0.5 truncate uppercase tracking-widest leading-none ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {activeProject.metadata.title || activeProject.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handlePrevTrack} className={`p-2 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`} title="Previous">
                    <SkipBack size={16} className="fill-current" />
                  </button>
                   <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: '#737373', color: 'white' }} title={isPlaying ? "Pause" : "Play"}>
                     {isPlaying ? <Pause size={14} className="fill-current" style={{ color: 'white' }} /> : <Play size={14} className="fill-current" style={{ color: 'white', marginLeft: '2px' }} />}
                   </button>
                   <button onClick={handleNextTrack} className={`p-2 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`} title="Next">
                     <SkipForward size={16} className="fill-current" />
                   </button>
                 </div>
                 <div className="flex items-center gap-1 shrink-0">
                   <button onClick={handleLyricsToggle} className={`p-2 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`} title="Lyrics">
                     <Mic size={16} />
                   </button>
                  <button onClick={async () => { if (activeProject && activeProject.metadata) { const track = activeProject.metadata.tracks[currentTrackIndex]; if (track && track.audioUrl) { const url = await resolvePlayableUrl(track.audioUrl); if (url) { handleExportTrack(url, track.title, track.format); } } } }} className={`p-2 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-700'}`} title="Download Track">
                    <FileDown size={16} className="fill-current" />
                  </button>
                  <button onClick={handleUntitledLink} className={`p-2 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`} title="Open Track">
                    <ExternalLink size={16} className="fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-white backdrop-blur-md text-neutral-900 border border-neutral-200 shadow-2xl rounded-2xl px-5 py-4 flex items-center justify-between gap-5 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-white">
                  <div className="h-full transition-all duration-100 bg-neutral-500" style={{ width: `${(currentTime / (trackDuration || 1)) * 100}%` }} />
                  <input type="range" min="0" max={trackDuration || 100} step="0.1" value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Seek track" />
                </div>
                <div className="flex items-center min-w-0 gap-4 mt-0.5">
                  <div className="relative w-[3.6rem] h-[3.6rem] rounded-md overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 flex items-center justify-center shadow-xs">
                    {activeProject.metadata.artworkUrl ? (
                      <img src={activeProject.metadata.artworkUrl} alt={activeProject.title} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={20} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-sans font-bold text-neutral-900 tracking-wide truncate uppercase leading-tight">
                      {renderExplicitTitle(activeProject.metadata.tracks[currentTrackIndex].title)}
                    </h4>
                    <p className="text-xs font-mono text-neutral-500 mt-0.5 truncate uppercase tracking-widest leading-none">
                      {activeProject.metadata.title || activeProject.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button onClick={handlePrevTrack} className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer" title="Previous">
                    <SkipBack size={16} className="fill-current" />
                  </button>
                   <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: '#737373', color: 'white' }} title={isPlaying ? "Pause" : "Play"}>
                     {isPlaying ? <Pause size={14} className="fill-current" style={{ color: 'white' }} /> : <Play size={14} className="fill-current" style={{ color: 'white', marginLeft: '2px' }} />}
                   </button>
                   <button onClick={handleNextTrack} className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer" title="Next">
                     <SkipForward size={16} className="fill-current" />
                   </button>
                   <button onClick={async () => { if (activeProject && activeProject.metadata) { const track = activeProject.metadata.tracks[currentTrackIndex]; if (track && track.audioUrl) { const url = await resolvePlayableUrl(track.audioUrl); if (url) { handleExportTrack(url, track.title, track.format); } } } }} className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer" title="Download Track">
                     <FileDown size={16} className="fill-current" />
                   </button>
                   <button onClick={handleUntitledLink} className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer" title="Open Track">
                     <ExternalLink size={16} className="fill-current" />
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}
        
        {isTrackerHubProject(activeProjectId) && showLyricsPanel && activeProject?.metadata && (
          <div className="fixed bottom-24 right-4 z-50 w-64 aspect-[3/4]">
            <div className={`h-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'}`}>
              <div className="flex items-center justify-between p-4">
                <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>Lyrics</h3>
                <button onClick={() => setShowLyricsPanel(false)} className={`p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 px-4 pb-4">
                <am-lyrics ref={amLyricsRef} className="h-full w-full" />
              </div>
            </div>
          </div>
        )}
        
        {!isTrackerHubProject(activeProjectId) && showLyricsPanel && activeProject?.metadata && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl">
            <div className={`rounded-2xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'}`}>
              <div className="flex items-center justify-between p-4">
                <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>Lyrics</h3>
                <button onClick={() => setShowLyricsPanel(false)} className={`p-1 rounded hover:bg-neutral-100 transition-colors cursor-pointer ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  <X size={14} />
                </button>
              </div>
              <div className="px-4 pb-4 h-64">
                <am-lyrics ref={amLyricsRef} className="h-full w-full" />
              </div>
            </div>
          </div>
        )}
          
       <footer className="mt-24 text-center text-[11px] font-mono text-neutral-400 tracking-[0.3em] uppercase pb-28">
         <p>© {new Date().getFullYear()} YELEAKS</p>
       </footer>

         {showInfoModal && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeInfoModal} />
             <div className="relative w-[800px] h-[800px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-2xl flex flex-col animate-info-modal overflow-hidden">
               <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                 <h2 className="text-lg font-mono font-bold uppercase tracking-widest text-neutral-900 dark:text-white">About YELEAKS</h2>
                 <button onClick={closeInfoModal} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                   <X size={18} className="text-neutral-600 dark:text-neutral-300" />
                 </button>
               </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6 font-mono text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      <div>
                         <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Features</h3>
                         <ul className="space-y-1">
                           <li>Clicking the YELEAKS / TRACKERHUB changes between light and darkmode</li>
                           <li>Swiping on the YELEAKS left will open TrackerHub and swiping right will go back to YELEAKS</li>
                           <li>If you ctrl and left click on tracks you can select them then right click to download them</li>
                           <li>You can add multiple projects by putting a comma between each link</li>
                           <li>You can search projects in YELEAKS using URLs</li>
                         </ul>
                       </div>
                       <div>
                         <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Known Issues</h3>
                          <ul className="space-y-1">
                            <li>E in the explicit mark is barely visible</li>
                            <li>Some songs won't play because they're in ALAC and theres no ALAC support</li>
                          </ul>
                       </div>
                         <div>
                           <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Planned Soon</h3>
                           <ul className="space-y-1">
                             <li>Direct ALAC support</li>
                             <li>Samply support</li>
                             <li>Better Untitled integration</li>
                             <li>Better TrackerHub integrations</li>
                             <li>Multi + era exporting for Tracker Hub</li>
                             <li>Better UI</li>
                           </ul>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Project Refresh</h3>
                          <p className="text-neutral-700 dark:text-neutral-300">
                            Every 24 hours it checks all projects and updates them. If a project isn't changed 5 times per check it'll move up to 48 hours check. After another 5 checks of it not changing it'll move up to 96 hours. If it happens again it'll move up to 168 hours where it won't go higher but if it updates after checking it will reset back to 24 hours.
                          </p>
                         </div>
                     </div>
                   </div>
              </div>
            </div>
           )}

          {showUpdateModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeUpdateModal} />
              <div className="relative w-[800px] h-[800px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-2xl flex flex-col animate-info-modal overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="text-lg font-mono font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Update</h2>
                  <button onClick={closeUpdateModal} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                    <X size={18} className="text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                </div>
              </div>
            </div>
          )}

          {showReportModal && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
             <div className="relative w-[200px] h-[200px] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden">
               <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-700">
                 <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Report</h3>
                 <button onClick={() => setShowReportModal(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                   <X size={14} className="text-neutral-600 dark:text-neutral-300" />
                 </button>
               </div>
               <div className="flex-1 p-3">
                 <textarea
                   value={reportText}
                   onChange={(e) => setReportText(e.target.value)}
                   placeholder="Type your complaint..."
                   className="w-full h-full resize-none border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-xs font-mono text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                 />
               </div>
               <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
                 <button
                   onClick={handleSubmitReport}
                   disabled={reportSubmitting || !reportText.trim()}
                   className="w-full py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-mono uppercase tracking-widest rounded hover:bg-black dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {reportSubmitting ? 'Sending...' : 'Send'}
                 </button>
               </div>
             </div>
           </div>
         )}
       </div>
     </Fragment>
   );
 }
