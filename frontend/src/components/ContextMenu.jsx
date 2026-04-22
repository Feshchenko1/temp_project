import React, { useLayoutEffect, useRef, useState } from "react";

const ContextMenu = ({ x, y, onClose, children }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [isVisible, setIsVisible] = useState(false);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const PADDING = 12;

      let newTop = y;
      let newLeft = x;

      if (newTop + rect.height > window.innerHeight) {
        newTop = window.innerHeight - rect.height - PADDING;
      }

      if (newLeft + rect.width > window.innerWidth) {
        newLeft = window.innerWidth - rect.width - PADDING;
      }
      newTop = Math.max(PADDING, newTop);
      newLeft = Math.max(PADDING, newLeft);

      setPosition({ top: newTop, left: newLeft });
      setIsVisible(true);
    }
  }, [x, y]);

  return (
    <ul
      ref={menuRef}
      className={`menu bg-base-100 border border-base-300 rounded-box shadow-2xl p-2 z-[9999] fixed min-w-[160px] transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </ul>
  );
};

export default ContextMenu;
