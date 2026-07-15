import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Menu, X } from 'lucide-react';

/**
 * Top bar with a polished hamburger toggle.
 * Mobile: fixed; hides while scrolling down and slides back in on scroll-up
 * or when you reach the top. How to Play stays on the right.
 * Desktop: sticky; expands/collapses the sidebar rail; always visible.
 */
export default function Header({
  isSidebarExpanded,
  isMobileMenuOpen,
  menuShowsClose,
  onMenuClick,
  onHelp,
}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile || isMobileMenuOpen) {
        setHidden(false);
        lastY.current = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const delta = y - lastY.current;

      if (y < 24) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }

      lastY.current = y;
    };

    lastY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) setHidden(false);
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-900 bg-zinc-950/85 px-4 backdrop-blur-md transition-transform duration-300 ease-in-out md:sticky md:translate-y-0 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={
            menuShowsClose
              ? isMobileMenuOpen
                ? 'Close navigation menu'
                : 'Collapse sidebar'
              : 'Open navigation menu'
          }
          aria-expanded={menuShowsClose}
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800/50 text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        >
          <span className="relative h-5 w-5">
            <Menu
              aria-hidden="true"
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                menuShowsClose ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <X
              aria-hidden="true"
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                menuShowsClose ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
              }`}
            />
          </span>
        </button>

        <p className="text-base font-bold tracking-tight text-white md:hidden">
          <span className="text-emerald-400">Timeless</span> Games
        </p>

        <button
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800/50 text-zinc-400 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 md:hidden"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile offset for the fixed header; collapses when the header is hidden. */}
      <div
        aria-hidden="true"
        className={`shrink-0 transition-[height] duration-300 ease-in-out md:hidden ${
          hidden ? 'h-0' : 'h-14'
        }`}
      />
    </>
  );
}
