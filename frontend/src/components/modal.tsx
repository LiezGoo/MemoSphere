'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  overlayClassName?: string;
  size?: 'compact' | 'wide' | 'fluid';
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
};

let activeModals: HTMLElement[] = [];
let scrollLockCount = 0;
let scrollLockSnapshot: {
  bodyOverflow: string;
  bodyGutter: string;
  documentOverflow: string;
  documentGutter: string;
  containers: Array<{ element: HTMLElement; overflow: string }>;
} | null = null;

function lockPageScroll() {
  if (scrollLockCount++ > 0) return;
  const body = document.body;
  const root = document.documentElement;
  const containers = Array.from(document.querySelectorAll<HTMLElement>('.app-layout-content'));
  scrollLockSnapshot = {
    bodyOverflow: body.style.overflow,
    bodyGutter: body.style.scrollbarGutter,
    documentOverflow: root.style.overflow,
    documentGutter: root.style.scrollbarGutter,
    containers: containers.map((element) => ({ element, overflow: element.style.overflow })),
  };
  body.style.overflow = 'hidden';
  body.style.scrollbarGutter = 'stable';
  root.style.overflow = 'hidden';
  root.style.scrollbarGutter = 'stable';
  for (const { element } of scrollLockSnapshot.containers) element.style.overflow = 'hidden';
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount || !scrollLockSnapshot) return;
  const { bodyOverflow, bodyGutter, documentOverflow, documentGutter, containers } = scrollLockSnapshot;
  document.body.style.overflow = bodyOverflow;
  document.body.style.scrollbarGutter = bodyGutter;
  document.documentElement.style.overflow = documentOverflow;
  document.documentElement.style.scrollbarGutter = documentGutter;
  for (const { element, overflow } of containers) element.style.overflow = overflow;
  scrollLockSnapshot = null;
}

export default function Modal({
  children,
  onClose,
  ariaLabel,
  labelledBy,
  describedBy,
  className = '',
  overlayClassName = '',
  size = 'compact',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  initialFocusRef,
  contentRef,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const localContentRef = useRef<HTMLDivElement>(null);
  const panelRef = contentRef ?? localContentRef;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeModals.push(panel);
    lockPageScroll();
    const firstFocus = initialFocusRef?.current ?? panel.querySelector<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    );
    (firstFocus ?? panel).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (activeModals[activeModals.length - 1] !== panel) return;
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      activeModals = activeModals.filter((entry) => entry !== panel);
      unlockPageScroll();
      if (previousFocus?.isConnected) requestAnimationFrame(() => previousFocus.focus({ preventScroll: true }));
    };
  }, [mounted, closeOnEscape, initialFocusRef, panelRef]);

  const onOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!closeOnOutsideClick || event.target !== event.currentTarget) return;
    const selection = window.getSelection()?.toString().trim();
    if (selection) return;
    onCloseRef.current();
  };

  if (!mounted) return null;
  return createPortal(
    <div className={`app-modal-overlay ${overlayClassName}`} onMouseDown={onOverlayMouseDown}>
      <div
        ref={panelRef}
        className={`app-modal-surface app-modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
