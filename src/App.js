import React, { useState, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import RoomViewer from './components/RoomViewer';

const App = () => {
  const [currentRoomHTML, setCurrentRoomHTML] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    // Load initial room on component mount
    loadInitialRoom();
  }, []);

  const loadInitialRoom = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/current-room');
      const data = await response.json();
      setCurrentRoomHTML(data.html);
      
      // Load history status
      await updateHistoryStatus();
    } catch (error) {
      console.error('Error loading initial room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateHistoryStatus = async () => {
    try {
      const response = await fetch('/api/history-status');
      const data = await response.json();
      setCanUndo(data.canUndo);
      setCanRedo(data.canRedo);
    } catch (error) {
      console.error('Error updating history status:', error);
    }
  };

  const handleRoomEdit = async (prompt) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/edit-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          currentHTML: currentRoomHTML
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentRoomHTML(data.html);
        await updateHistoryStatus();
        return { success: true, message: '✨ Room updated successfully! Your changes have been applied.' };
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error editing room:', error);
      return { success: false, message: `❌ Error: ${error.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRoom = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reset-room', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setCurrentRoomHTML(data.html);
        await updateHistoryStatus();
        return { success: true, message: '🔄 Room reset to default state.' };
      } else {
        throw new Error(data.error || 'Failed to reset room');
      }
    } catch (error) {
      console.error('Error resetting room:', error);
      return { success: false, message: `❌ Error resetting room: ${error.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadRoom = () => {
    if (!currentRoomHTML) {
      return { success: false, message: 'No room to download' };
    }

    const blob = new Blob([currentRoomHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: '💾 Room downloaded successfully!' };
  };

  const handleUndo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/undo', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setCurrentRoomHTML(data.html);
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        return { success: true, message: '⬅️ Undid last change.' };
      } else {
        return { success: false, message: data.message || 'Nothing to undo' };
      }
    } catch (error) {
      console.error('Error undoing:', error);
      return { success: false, message: `❌ Error undoing: ${error.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/redo', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setCurrentRoomHTML(data.html);
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        return { success: true, message: '➡️ Redid last change.' };
      } else {
        return { success: false, message: data.message || 'Nothing to redo' };
      }
    } catch (error) {
      console.error('Error redoing:', error);
      return { success: false, message: `❌ Error redoing: ${error.message}` };
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="app">
      <div className="container">
        <ChatPanel 
          onRoomEdit={handleRoomEdit}
          onResetRoom={handleResetRoom}
          onDownloadRoom={handleDownloadRoom}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isLoading={isLoading}
          canUndo={canUndo}
          canRedo={canRedo}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={toggleMobileMenu}
        />
        <RoomViewer 
          roomHTML={currentRoomHTML}
          isLoading={isLoading}
          onToggleMobileMenu={toggleMobileMenu}
        />
      </div>
    </div>
  );
};

export default App;