const express = require('express');
const router = express.Router();

// Undo endpoint
router.post('/undo', (req, res) => {
    try {
        const { 
            roomHistory, 
            historyIndex, 
            setHistoryIndex, 
            setCurrentRoomHTML 
        } = req.app.locals;

        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCurrentRoomHTML(roomHistory[newIndex].html);
            console.log(`⬅️ Undo: moved to history ${newIndex + 1}/${roomHistory.length}`);
            
            res.json({
                success: true,
                html: roomHistory[newIndex].html,
                canUndo: newIndex > 0,
                canRedo: newIndex < roomHistory.length - 1
            });
        } else {
            res.json({
                success: false,
                message: 'Nothing to undo',
                canUndo: false,
                canRedo: historyIndex < roomHistory.length - 1
            });
        }
    } catch (error) {
        console.error('❌ Error during undo:', error);
        res.status(500).json({
            error: 'Failed to undo',
            details: error.message
        });
    }
});

// Redo endpoint
router.post('/redo', (req, res) => {
    try {
        const { 
            roomHistory, 
            historyIndex, 
            setHistoryIndex, 
            setCurrentRoomHTML 
        } = req.app.locals;

        if (historyIndex < roomHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setCurrentRoomHTML(roomHistory[newIndex].html);
            console.log(`➡️ Redo: moved to history ${newIndex + 1}/${roomHistory.length}`);
            
            res.json({
                success: true,
                html: roomHistory[newIndex].html,
                canUndo: newIndex > 0,
                canRedo: newIndex < roomHistory.length - 1
            });
        } else {
            res.json({
                success: false,
                message: 'Nothing to redo',
                canUndo: historyIndex > 0,
                canRedo: false
            });
        }
    } catch (error) {
        console.error('❌ Error during redo:', error);
        res.status(500).json({
            error: 'Failed to redo',
            details: error.message
        });
    }
});

// Get history status
router.get('/history-status', (req, res) => {
    const { roomHistory, historyIndex } = req.app.locals;
    res.json({
        canUndo: historyIndex > 0,
        canRedo: historyIndex < roomHistory.length - 1,
        historyLength: roomHistory.length,
        currentIndex: historyIndex
    });
});

module.exports = router;