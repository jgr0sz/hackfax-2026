import React, { useState, useRef, useEffect } from 'react';

function AccessibilityHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [announceKeys, setAnnounceKeys] = useState(false);
  const hubRef = useRef(null);
  const buttonRef = useRef(null);
  const liveRegionRef = useRef(null);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.documentElement.style.filter = 'contrast(1.5)';
      document.documentElement.style.backgroundColor = '#000';
      document.body.style.backgroundColor = '#000';
      document.body.style.color = '#fff';
    } else {
      document.documentElement.style.filter = 'contrast(1)';
      document.documentElement.style.backgroundColor = 'auto';
      document.body.style.backgroundColor = 'auto';
      document.body.style.color = 'auto';
    }
  }, [highContrast]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+A: Toggle accessibility hub
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setTimeout(() => buttonRef.current?.focus(), 0);
        }
      }
      // Alt+1: Toggle high contrast
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setHighContrast(prev => !prev);
        announceToScreenReader(`High contrast mode ${!highContrast ? 'enabled' : 'disabled'}`);
      }
      // Alt+2: Increase font size
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setFontSize(prev => Math.min(prev + 10, 200));
        announceToScreenReader(`Font size increased to ${Math.min(fontSize + 10, 200)}%`);
      }
      // Alt+3: Decrease font size
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setFontSize(prev => Math.max(prev - 10, 80));
        announceToScreenReader(`Font size decreased to ${Math.max(fontSize - 10, 80)}%`);
      }
      // Alt+4: Reset settings
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        setHighContrast(false);
        setFontSize(100);
        announceToScreenReader('Accessibility settings reset to defaults');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fontSize, highContrast, isOpen, announceKeys]);

  // Close hub when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hubRef.current && !hubRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const announceToScreenReader = (message) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  };

  return (
    <>
      {/* Screen reader live region */}
      <div 
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Accessibility Hub Widget */}
      <div 
        ref={hubRef}
        className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6"
        role="region"
        aria-label="Accessibility options"
      >
        {/* Toggle Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          aria-label={isOpen ? 'Close accessibility options' : 'Open accessibility options'}
          aria-expanded={isOpen}
          aria-controls="accessibility-panel"
          title="Alt+A: Toggle accessibility options"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Panel */}
        {isOpen && (
          <div
            id="accessibility-panel"
            className="absolute bottom-16 right-0 w-64 rounded-lg bg-white shadow-2xl border border-gray-200 p-4 sm:bottom-20"
            role="document"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-900">Accessibility</h2>

            {/* High Contrast Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => {
                    setHighContrast(e.target.checked);
                    announceToScreenReader(`High contrast mode ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  aria-label="Toggle high contrast mode"
                />
                <span className="text-sm text-gray-900">High Contrast</span>
                <span className="text-xs text-gray-700 ml-auto">Alt+1</span>
              </label>
            </div>

            {/* Font Size Controls */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Text Size: {fontSize}%
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFontSize(prev => Math.max(prev - 10, 80));
                    announceToScreenReader(`Font size decreased to ${Math.max(fontSize - 10, 80)}%`);
                  }}
                  disabled={fontSize <= 80}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded text-sm font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  aria-label="Decrease text size by 10 percent. Shortcut Alt+3"
                  title="Alt+3: Decrease font size"
                >
                  A−
                </button>
                <button
                  onClick={() => setFontSize(100)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
                  aria-label="Reset text size to default 100%"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setFontSize(prev => Math.min(prev + 10, 200));
                    announceToScreenReader(`Font size increased to ${Math.min(fontSize + 10, 200)}%`);
                  }}
                  disabled={fontSize >= 200}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded text-sm font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  aria-label="Increase text size by 10 percent. Shortcut Alt+2"
                  title="Alt+2: Increase font size"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts Reference */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Keyboard Shortcuts</h3>
              <ul className="text-xs text-gray-800 space-y-1">
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Alt+A</kbd> Toggle this panel</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Alt+1</kbd> High contrast</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Alt+2</kbd> Larger text</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Alt+3</kbd> Smaller text</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Alt+4</kbd> Reset all</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Tab</kbd> Navigate page</li>
                <li><kbd className="bg-gray-300 text-gray-900 px-2 py-1 rounded font-semibold">Enter/Space</kbd> Activate buttons</li>
              </ul>
            </div>

            {/* Skip Links Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Links</h3>
              <div className="space-y-2">
                <a 
                  href="#main-content" 
                  className="block text-sm text-blue-600 hover:text-blue-700 underline py-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
                >
                  Skip to main content
                </a>
                <button 
                  onClick={() => {
                    const nav = document.querySelector('nav');
                    if (nav) {
                      nav.focus();
                      nav.scrollIntoView({ behavior: 'smooth' });
                    }
                    setIsOpen(false);
                  }}
                  className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 underline py-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded"
                >
                  Skip to navigation
                </button>
              </div>
            </div>

            {/* Close Button for Touch Devices */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold text-white transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
              aria-label="Close accessibility panel. Keyboard shortcut Alt+A"
            >
              Close (Alt+A)
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default AccessibilityHub;
