'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEventHandler, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = { value: string; label: string; disabled?: boolean; placeholder?: boolean };

type SelectProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
};

type PopupPosition = CSSProperties & { placement: 'above' | 'below' };

export default function Select({ value, onChange, options, required = false, disabled = false, 'aria-label': ariaLabel }: SelectProps) {
  const id = useId().replaceAll(':', '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef('');
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  const setPopupPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const placement = below < 250 && above > below ? 'above' : 'below';
    setPosition({
      left: Math.min(rect.left, window.innerWidth - Math.min(rect.width, window.innerWidth - 24) - 12),
      width: Math.min(rect.width, window.innerWidth - 24),
      maxHeight: Math.max(80, Math.min(280, (placement === 'above' ? above : below) - 12)),
      ...(placement === 'above' ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      placement,
    });
  };

  const openList = (index = selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled)) => {
    setActiveIndex(index < 0 ? 0 : index);
    setPopupPosition();
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    setPosition(null);
  };

  const moveActive = (direction: 1 | -1) => {
    let nextIndex = activeIndex;
    for (let count = 0; count < options.length; count += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) break;
    }
    setActiveIndex(nextIndex);
  };

  const choose = (nextValue: string) => {
    const select = nativeRef.current;
    if (!select || disabled) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    valueSetter?.call(select, nextValue);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeList();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => setPopupPosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) closeList();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    popupRef.current?.querySelector<HTMLElement>(`#theme-select-option-${id}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, id, open]);

  useEffect(() => () => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openList();
      else moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = event.key === 'Home' ? options.findIndex((option) => !option.disabled) : options.map((option) => !option.disabled).lastIndexOf(true);
      if (index >= 0) {
        setActiveIndex(index);
        if (!open) openList(index);
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(options[activeIndex]?.value ?? value);
      else openList();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeList();
      return;
    }
    if (event.key === 'Tab' && open) {
      closeList();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => { typeahead.current = ''; }, 500);
      const start = open ? activeIndex + 1 : Math.max(0, selectedIndex + 1);
      const searchOrder = [...options.slice(start), ...options.slice(0, start)];
      const match = searchOrder.find((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(typeahead.current));
      if (match) {
        const index = options.indexOf(match);
        if (!open) openList(index);
        else setActiveIndex(index);
      }
    }
  };

  return (
    <div className="theme-select">
      <select
        ref={nativeRef}
        className="theme-select-native"
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        onChange={onChange}
        onInvalid={(event) => { event.preventDefault(); triggerRef.current?.focus(); openList(); }}
        required={required}
        disabled={disabled}
      >
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      <button
        ref={triggerRef}
        type="button"
        className={`theme-select-trigger${selected?.placeholder ? ' is-placeholder' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`theme-select-list-${id}`}
        aria-activedescendant={open ? `theme-select-option-${id}-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => open ? closeList() : openList()}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label ?? ''}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          id={`theme-select-list-${id}`}
          ref={popupRef}
          className={`theme-select-popup is-${position.placement}`}
          role="listbox"
          style={{ left: position.left, width: position.width, maxHeight: position.maxHeight, top: position.top, bottom: position.bottom }}
        >
          {options.map((option, index) => (
            <div
              id={`theme-select-option-${id}-${index}`}
              key={option.value}
              className={`theme-select-option${index === activeIndex ? ' is-active' : ''}${option.placeholder ? ' is-placeholder' : ''}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => !option.disabled && choose(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
