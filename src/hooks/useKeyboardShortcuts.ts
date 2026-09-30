import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onF1NewBill?: () => void;
  onF2SearchProduct?: () => void;
  onF3SearchCustomer?: () => void;
  onF5HoldBill?: () => void;
  onF6RetrieveHeld?: () => void;
  onF9SaveFinalize?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default actions for registered function keys
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          handlersRef.current.onF1NewBill?.();
          break;
        case 'F2':
          e.preventDefault();
          handlersRef.current.onF2SearchProduct?.();
          break;
        case 'F3':
          e.preventDefault();
          handlersRef.current.onF3SearchCustomer?.();
          break;
        case 'F5':
          e.preventDefault(); // Prevents browser/electron reload
          handlersRef.current.onF5HoldBill?.();
          break;
        case 'F6':
          e.preventDefault();
          handlersRef.current.onF6RetrieveHeld?.();
          break;
        case 'F9':
          e.preventDefault();
          handlersRef.current.onF9SaveFinalize?.();
          break;
        case 'Escape':
          handlersRef.current.onEscape?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
