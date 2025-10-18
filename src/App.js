import React, { useState, useEffect, useRef } from 'react';
import RoomViewer from './components/RoomViewer';
import ChatPanel from './components/ChatPanel';
import './styles/main.css';

function App() {
  const [roomHTML, setRoomHTML] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const roomViewerRef = useRef(null);

  // Load initial room on component mount
  useEffect(() => {
    loadCurrentRoom();
  }, []);

  const loadCurrentRoom = async () => {
    try {
      const response = await fetch('/api/current-room');
      const data = await response.json();
      setRoomHTML(data.html);
    } catch (error) {
      console.error('Error loading current room:', error);
    }
  };

  const handleVisionRoomEdit = async (prompt) => {
    setIsLoading(true);
    try {
      console.log('🔄 Capturing room screenshot for vision analysis...');
      
      // Capture screenshot of current room
      const screenshot = await roomViewerRef.current?.captureRoomScreenshot();
      
      if (!screenshot) {
        throw new Error('Failed to capture room screenshot');
      }

      console.log('📸 Screenshot captured, sending to vision agent...');

      const response = await fetch('/api/edit-room-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          screenshot: {
            base64Data: screenshot.base64Data,
            mediaType: screenshot.mediaType,
            width: screenshot.width,
            height: screenshot.height
          },
          currentHTML: roomHTML
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setRoomHTML(data.html);
        return {
          success: true,
          message: `👁️ Vision analysis complete! Applied ${data.changesApplied} changes based on visual understanding.`,
          metadata: data.metadata,
          processingStats: data.processingStats,
          visualAnalysis: data.visualAnalysis
        };
      } else {
        return {
          success: false,
          message: `❌ ${data.error || 'Vision analysis failed'}`
        };
      }
    } catch (error) {
      console.error('Vision room edit error:', error);
      return {
        success: false,
        message: `❌ Vision Error: ${error.message}`
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Keep the original text-based editing as fallback
  const handleRoomEdit = async (prompt) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/edit-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          currentHTML: roomHTML
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setRoomHTML(data.html);
        return {
          success: true,
          message: `✅ Room updated successfully! Applied ${data.changesApplied} changes.`,
          metadata: data.metadata,
          processingStats: data.processingStats
        };
      } else {
        return {
          success: false,
          message: `❌ ${data.error || 'Failed to update room'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error: ${error.message}`
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRoom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reset-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setRoomHTML(data.html);
        return {
          success: true,
          message: data.message || '🔄 Room reset to default state'
        };
      } else {
        return {
          success: false,
          message: `❌ ${data.error || 'Failed to reset room'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error: ${error.message}`
      };
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="app">
      <div className="main-content">
        <RoomViewer 
          ref={roomViewerRef}
          roomHTML={roomHTML} 
          isLoading={isLoading}
          onToggleMobileMenu={toggleMobileMenu}
        />
        
        <ChatPanel 
          onRoomEdit={handleVisionRoomEdit} // Use vision-based editing by default
          onRoomEditFallback={handleRoomEdit} // Keep text-based as fallback
          onResetRoom={handleResetRoom}
          isLoading={isLoading}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;