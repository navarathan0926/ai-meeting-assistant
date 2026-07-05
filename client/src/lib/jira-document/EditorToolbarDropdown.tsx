'use client';

import {
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface EditorToolbarDropdownProps {
  label: string;
  trigger: ReactNode;
  children: ReactNode | ((closeMenu: () => void) => ReactNode);
  disabled?: boolean;
  align?: 'start' | 'end';
}

export function EditorToolbarDropdown({
  label,
  trigger,
  children,
  disabled = false,
  align = 'start',
}: EditorToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={[
        'rich-description-editor__dropdown',
        align === 'end' ? 'rich-description-editor__dropdown--end' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        className="rich-description-editor__dropdown-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="rich-description-editor__dropdown-menu"
        >
          {typeof children === 'function'
            ? children(() => setOpen(false))
            : children}
        </div>
      )}
    </div>
  );
}

interface EditorToolbarMenuItemProps {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onSelect: () => void;
  closeMenu?: () => void;
}

export function EditorToolbarMenuItem({
  label,
  icon,
  active = false,
  onSelect,
  closeMenu,
}: EditorToolbarMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        'rich-description-editor__dropdown-item',
        active ? 'rich-description-editor__dropdown-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => {
        onSelect();
        closeMenu?.();
      }}
    >
      {icon && (
        <span className="rich-description-editor__dropdown-item-icon">{icon}</span>
      )}
      <span>{label}</span>
    </button>
  );
}

export function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BulletListIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="2.5" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.25" fill="currentColor" />
      <circle cx="2.5" cy="12.5" r="1.25" fill="currentColor" />
      <path
        d="M6 3.5H14M6 8H14M6 12.5H14"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NumberedListIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 3.5H3.2V5.1H2.4V5.55H3.2V6.5H2V3.5ZM2 7.75H3.25L2 9.75H3.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 11.25H3.25L2 13.25H3.5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 3.5H14M6 8H14M6 12.5H14"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
