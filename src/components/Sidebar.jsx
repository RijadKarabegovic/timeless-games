import { useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { MODES } from './navigation/modes.js';

const Logo = ({ collapsed }) => (
  <div
    className={`flex items-center overflow-hidden transition-all duration-300 ${
      collapsed ? 'justify-center' : ''
    }`}
  >
    {collapsed ? (
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800/50 bg-zinc-900 text-sm font-bold text-emerald-400"
        title="Timeless Games"
      >
        T
      </span>
    ) : (
      <p className="whitespace-nowrap text-lg font-bold tracking-tight text-white">
        <span className="text-emerald-400">Timeless</span> Games
      </p>
    )}
  </div>
);

const ModeButton = ({ mode, isActive, collapsed, onSelect }) => {
  const { label, shortLabel, description, icon: Icon } = mode;

  return (
    <button
      type="button"
      onClick={() => onSelect(mode.id)}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex w-full items-center rounded-lg text-left transition-all duration-200 ${
        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'
      } ${
        isActive
          ? 'border-l-2 border-emerald-500 bg-emerald-500/10 text-emerald-400'
          : 'border-l-2 border-transparent text-zinc-500 hover:bg-white/3 hover:text-zinc-200'
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
          isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'
        }`}
        aria-hidden="true"
      />

      <span
        className={`flex min-w-0 flex-col overflow-hidden transition-all duration-300 ${
          collapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'
        }`}
      >
        <span className="truncate text-sm font-semibold tracking-tight">{label}</span>
        <span className="truncate text-xs text-zinc-600">{description}</span>
      </span>

      {/* Collapsed rail tooltip */}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-zinc-800/60 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-white opacity-0 shadow-lg transition-all duration-200 group-hover:block group-hover:opacity-100"
        >
          {shortLabel}
        </span>
      )}
    </button>
  );
};

const ModeList = ({ activeMode, collapsed, onModeChange }) => (
  <nav
    aria-label="Game modes"
    className={`flex flex-col ${collapsed ? 'gap-1' : 'divide-y divide-zinc-800/50'}`}
  >
    {MODES.map((mode) => (
      <ModeButton
        key={mode.id}
        mode={mode}
        isActive={mode.id === activeMode}
        collapsed={collapsed}
        onSelect={onModeChange}
      />
    ))}
  </nav>
);

const HelpButton = ({ collapsed, onHelp }) => (
  <button
    type="button"
    onClick={onHelp}
    title={collapsed ? 'How to Play' : undefined}
    className={`group relative flex w-full items-center rounded-lg border border-zinc-800/50 text-sm font-semibold tracking-tight text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:text-white ${
      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
    }`}
  >
    <HelpCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
        collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
      }`}
    >
      How to Play
    </span>
    {collapsed && (
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-zinc-800/60 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:block group-hover:opacity-100"
      >
        How to Play
      </span>
    )}
  </button>
);

/**
 * Responsive sidebar: collapsible rail on desktop (md+), sliding drawer on
 * mobile. State is controlled by the parent layout shell.
 */
export default function Sidebar({
  activeMode,
  onModeChange,
  onHelp,
  isExpanded,
  isMobileOpen,
  onCloseMobile,
}) {
  // Close mobile drawer with Escape.
  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const selectMode = (id) => {
    onModeChange(id);
    onCloseMobile();
  };

  const openHelp = () => {
    onCloseMobile();
    onHelp();
  };

  const desktopCollapsed = !isExpanded;

  return (
    <>
      {/* Desktop rail / expanded sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className={`fixed bottom-0 left-0 top-14 z-30 hidden flex-col border-r border-zinc-800/50 bg-zinc-950 p-3 transition-all duration-300 ease-in-out md:flex ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        <div
          className={`mb-4 border-b border-zinc-800/50 pb-4 transition-all duration-300 ${
            desktopCollapsed ? 'px-0' : 'px-1'
          }`}
        >
          <Logo collapsed={desktopCollapsed} />
        </div>

        <ModeList
          activeMode={activeMode}
          collapsed={desktopCollapsed}
          onModeChange={onModeChange}
        />

        <div className="mt-auto border-t border-zinc-800/50 pt-4">
          <HelpButton collapsed={desktopCollapsed} onHelp={onHelp} />
        </div>
      </aside>

      {/* Mobile backdrop */}
      <div
        aria-hidden={!isMobileOpen}
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Mobile sliding drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-zinc-800/50 bg-zinc-950 p-5 transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 border-b border-zinc-800/50 pb-5">
          <Logo collapsed={false} />
        </div>

        <ModeList activeMode={activeMode} collapsed={false} onModeChange={selectMode} />

        <div className="mt-auto border-t border-zinc-800/50 pt-5">
          <HelpButton collapsed={false} onHelp={openHelp} />
        </div>
      </aside>
    </>
  );
}

// Re-export for consumers that import MODES from Sidebar.
export { MODES };
