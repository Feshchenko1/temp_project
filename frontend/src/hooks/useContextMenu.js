import { useState, useEffect, useCallback } from "react";

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = useCallback((e, data) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      data,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    const handleScroll = () => closeContextMenu();
    
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [closeContextMenu]);

  return { contextMenu, handleContextMenu, closeContextMenu };
}
