import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import ClassicGame from './components/ClassicGame.jsx';
import TimeShiftGame from './components/TimeShiftGame.jsx';
import ChronologyGame from './components/ChronologyGame.jsx';
import TimelineAlgebraGame from './components/TimelineAlgebraGame.jsx';
import HelpModal from './components/Modals/HelpModal.jsx';

const GAMES = {
  classic: ClassicGame,
  timeshift: TimeShiftGame,
  chronology: ChronologyGame,
  algebra: TimelineAlgebraGame,
};

const MD_BREAKPOINT = 768;

export default function App() {
  const [activeMode, setActiveMode] = useState('classic');
  const [helpOpen, setHelpOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const ActiveGame = GAMES[activeMode];

  // Mobile: X when drawer open. Desktop: X when sidebar expanded (collapse action).
  const menuShowsClose = isMobile ? isMobileMenuOpen : isSidebarExpanded;

  const handleMenuClick = useCallback(() => {
    const isMobile = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`).matches;
    if (isMobile) {
      setIsMobileMenuOpen((open) => !open);
    } else {
      setIsSidebarExpanded((expanded) => !expanded);
    }
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">
      <Header
        isSidebarExpanded={isSidebarExpanded}
        isMobileMenuOpen={isMobileMenuOpen}
        menuShowsClose={menuShowsClose}
        onMenuClick={handleMenuClick}
        onHelp={() => setHelpOpen(true)}
      />

      <Sidebar
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onHelp={() => setHelpOpen(true)}
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* Main content shifts smoothly with sidebar width on desktop. */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        <main className="mx-auto max-w-xl px-4 py-10 pb-28 md:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ActiveGame />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        mode={activeMode}
      />
    </div>
  );
}
