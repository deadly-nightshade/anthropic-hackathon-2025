import React, { useEffect, useRef } from 'react';

const RoomViewer = ({ roomHTML, isLoading, onToggleMobileMenu }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (roomHTML && iframeRef.current) {
      const blob = new Blob([roomHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      
      // Cleanup previous URL
      return () => URL.revokeObjectURL(url);
    }
  }, [roomHTML]);

  return (
    <div className="room-panel">
      <iframe 
        ref={iframeRef}
        className="room-iframe" 
        src="about:blank"
        title="3D Room Viewer"
      />

      <div className="room-info">
        <div>💡 <strong>Tip:</strong> Use natural language to describe changes</div>
      </div>

      <button className="mobile-toggle" onClick={onToggleMobileMenu}>
        💬
      </button>
    </div>
  );
};

export default RoomViewer;