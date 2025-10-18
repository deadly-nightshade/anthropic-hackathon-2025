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

  // Function to capture screenshot of the room (exposed to parent)
  const captureRoomScreenshot = () => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current) {
        reject(new Error('Room iframe not available'));
        return;
      }

      try {
        // Wait for iframe to load, then capture
        const iframe = iframeRef.current;
        
        if (iframe.contentDocument) {
          // Try to access the canvas in the iframe
          const canvas = iframe.contentDocument.querySelector('canvas');
          
          if (canvas) {
            // Convert Three.js canvas to base64 image
            const dataURL = canvas.toDataURL('image/png');
            const base64Data = dataURL.split(',')[1]; // Remove data:image/png;base64, prefix
            
            resolve({
              base64Data: base64Data,
              mediaType: 'image/png',
              width: canvas.width,
              height: canvas.height
            });
          } else {
            reject(new Error('Canvas not found in room iframe'));
          }
        } else {
          reject(new Error('Cannot access iframe content'));
        }
      } catch (error) {
        reject(new Error(`Screenshot capture failed: ${error.message}`));
      }
    });
  };

  // Expose screenshot function to parent component
  React.useImperativeHandle(React.forwardRef(() => {}), () => ({
    captureRoomScreenshot
  }));

  return (
    <div className="room-panel">
      <iframe 
        ref={iframeRef}
        className="room-iframe" 
        src="about:blank"
        title="3D Room Viewer"
      />

      <div className="room-info">
        <div>👁️ <strong>Vision Mode:</strong> AI can see your room and understand spatial requests</div>
        <div>💡 <strong>Tip:</strong> Use natural language like "add a bed to the right side"</div>
      </div>

      <button className="mobile-toggle" onClick={onToggleMobileMenu}>
        💬
      </button>
    </div>
  );
};

// Forward ref to expose screenshot function
export default React.forwardRef((props, ref) => {
  const roomViewerRef = useRef();

  React.useImperativeHandle(ref, () => ({
    captureRoomScreenshot: () => roomViewerRef.current?.captureRoomScreenshot()
  }));

  return <RoomViewer {...props} ref={roomViewerRef} />;
});