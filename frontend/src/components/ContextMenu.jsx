import React, { useLayoutEffect, useRef, useState } from "react";

const ContextMenu = ({ x, y, onClose, children }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [isVisible, setIsVisible] = useState(false);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const PADDING = 12; // Gap from the screen edge
      
      let newTop = y;
      let newLeft = x;

      // Clamp to bottom edge
      if (y + rect.height > window.innerHeight) {
        newTop = Math.max(PADDING, window.innerHeight - rect.height - PADDING);
      }
      
      // Clamp to right edge
      if (x + rect.width > window.innerWidth) {
        newLeft = Math.max(PADDING, window.innerWidth - rect.width - PADDING);
      }

      setPosition({ top: newTop, left: newLeft });
      setIsVisible(true);
    }
  }, [x, y]);

  return (
    <ul
      ref={menuRef}
      className={`menu bg-base-100 border border-base-300 rounded-box shadow-2xl p-2 z-[9999] fixed min-w-[160px] transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing via the hook when clicking inside, or allow it? Usually clicking a menu item closes it, so letting it propagate might be fine.
    >
      {children}
    </ul>
  );
};

export default ContextMenu;
