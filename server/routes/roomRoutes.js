const express = require('express');
const router = express.Router();
const RoomUtils = require('../utils/RoomUtils');
const RobustDiffApplicator = require('../utils/RobustDiffApplicator');
const AgentLogger = require('../utils/AgentLogger');

// Initialize the robust diff applicator
const diffApplicator = new RobustDiffApplicator();

// Room editing route
router.post('/edit-room', async (req, res) => {
    try {
        const { prompt, currentHTML } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`🎨 Processing room edit request: "${prompt}"`);

        // Get agent instances and room data from app locals
        const { 
            interiorDesignerAgent, 
            styleDetectiveAgent, 
            roomEditorAgent,
            getRoomDescription,
            setCurrentRoomHTML, 
            getCurrentRoomHTML,
            addToHistory,
            saveCurrentRoom
        } = req.app.locals;

        let currentRoomHTML = getCurrentRoomHTML();
        const roomDescription = getRoomDescription();

        // ==================== MULTI-AGENT PROCESSING ====================
        
        // AGENT 1: Interior Designer Agent - Enhances prompt with design principles
        const enhancedPrompt = await interiorDesignerAgent.enhancePrompt(prompt, roomDescription);

        // AGENT 2: Style Detective Agent - Adapts prompt to existing room style
        const styleAdaptedPrompt = await styleDetectiveAgent.adaptPrompt(enhancedPrompt, roomDescription, prompt);

        // AGENT 3: Room Editor Agent - Generate diff with improved planning
        const diffObject = await roomEditorAgent.generateDiff(styleAdaptedPrompt, currentRoomHTML, prompt, enhancedPrompt);
        
        // ==================== END MULTI-AGENT PROCESSING ====================

        // Update current HTML if provided
        if (currentHTML) {
            currentRoomHTML = currentHTML;
            setCurrentRoomHTML(currentHTML);
        }

        // Apply diff using robust applicator
        let updatedHTML = currentRoomHTML;
        let applicationResult = { success: true, appliedChanges: [], failedChanges: [] };
        
        if (diffObject.changes && diffObject.changes.length > 0) {
            applicationResult = await diffApplicator.applyDiff(currentRoomHTML, diffObject, {
                allowPartialSuccess: true,
                backupOriginal: true,
                validateResult: true
            });
            
            // Log diff application for debugging
            await AgentLogger.logDiffApplication(currentRoomHTML, diffObject, applicationResult, {
                userPrompt: prompt,
                route: 'edit-room',
                agentsUsed: ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent']
            });
            
            updatedHTML = applicationResult.content;
            
            // Update current room state only if application was successful
            if (applicationResult.success || applicationResult.appliedChanges.length > 0) {
                setCurrentRoomHTML(updatedHTML);
                await saveCurrentRoom();
                addToHistory(updatedHTML, 'advanced_edit');
            }
        }

        console.log('✅ Room edit completed successfully');

        await AgentLogger.logProcessingSession(prompt, ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent'], {
            success: applicationResult.success,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            advancedMode: true,
            defaultMode: true,
            strategy: diffObject.metadata?.strategy,
            fallbackUsed: diffObject.metadata?.fallbackUsed || false,
            robustApplication: true
        });

        res.json({
            success: applicationResult.success,
            html: updatedHTML,
            originalPrompt: prompt,
            enhancedPrompt: enhancedPrompt,
            finalPrompt: styleAdaptedPrompt,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            warnings: applicationResult.warnings || [],
            advancedMode: true,
            defaultMode: true,
            metadata: {
                ...diffObject.metadata,
                applicationResult: {
                    success: applicationResult.success,
                    summary: applicationResult.summary
                }
            },
            processingStats: roomEditorAgent.getProcessingStats()
        });

    } catch (error) {
        console.error('❌ Error processing room edit:', error);
        await AgentLogger.logProcessingSession(req.body.prompt, ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent'], {
            success: false,
            error: error.message,
            robustApplication: true
        });
        res.status(500).json({
            error: 'Failed to process room edit',
            details: error.message
        });
    }
});

// Advanced room editing route (new code-aware system)
router.post('/edit-room-advanced', async (req, res) => {
    try {
        const { prompt, currentHTML } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`🧠 Processing ADVANCED room edit request: "${prompt}"`);

        // Get agent instances and room data from app locals
        const { 
            interiorDesignerAgent, 
            styleDetectiveAgent, 
            roomEditorAgent,
            getRoomDescription,
            setCurrentRoomHTML, 
            getCurrentRoomHTML,
            addToHistory,
            saveCurrentRoom
        } = req.app.locals;

        let currentRoomHTML = getCurrentRoomHTML();
        const roomDescription = getRoomDescription();

        // ==================== MULTI-AGENT PROCESSING ====================
        
        // AGENT 1: Interior Designer Agent - Enhances prompt with design principles
        const enhancedPrompt = await interiorDesignerAgent.enhancePrompt(prompt, roomDescription);

        // AGENT 2: Style Detective Agent - Adapts prompt to existing room style
        const styleAdaptedPrompt = await styleDetectiveAgent.adaptPrompt(enhancedPrompt, roomDescription, prompt);

        // AGENT 3: Room Editor Agent - Generate diff with improved planning
        const diffObject = await roomEditorAgent.generateDiff(styleAdaptedPrompt, currentRoomHTML, prompt, enhancedPrompt);
        
        // ==================== END MULTI-AGENT PROCESSING ====================

        // Update current HTML if provided
        if (currentHTML) {
            currentRoomHTML = currentHTML;
            setCurrentRoomHTML(currentHTML);
        }

        // Apply diff using robust applicator
        let updatedHTML = currentRoomHTML;
        let applicationResult = { success: true, appliedChanges: [], failedChanges: [] };
        
        if (diffObject.changes && diffObject.changes.length > 0) {
            applicationResult = await diffApplicator.applyDiff(currentRoomHTML, diffObject, {
                allowPartialSuccess: true,
                backupOriginal: true,
                validateResult: true
            });
            
            // Log diff application for debugging
            await AgentLogger.logDiffApplication(currentRoomHTML, diffObject, applicationResult, {
                userPrompt: prompt,
                route: 'edit-room-advanced',
                agentsUsed: ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent']
            });
            
            updatedHTML = applicationResult.content;
            
            // Update current room state only if application was successful
            if (applicationResult.success || applicationResult.appliedChanges.length > 0) {
                setCurrentRoomHTML(updatedHTML);
                await saveCurrentRoom();
                addToHistory(updatedHTML, 'advanced_edit');
            }
        }

        console.log('✅ Advanced room edit completed successfully');

        await AgentLogger.logProcessingSession(prompt, ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent'], {
            success: applicationResult.success,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            advancedMode: true,
            strategy: diffObject.metadata?.strategy,
            fallbackUsed: diffObject.metadata?.fallbackUsed || false,
            robustApplication: true
        });

        res.json({
            success: applicationResult.success,
            html: updatedHTML,
            originalPrompt: prompt,
            enhancedPrompt: enhancedPrompt,
            finalPrompt: styleAdaptedPrompt,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            warnings: applicationResult.warnings || [],
            advancedMode: true,
            metadata: {
                ...diffObject.metadata,
                applicationResult: {
                    success: applicationResult.success,
                    summary: applicationResult.summary
                }
            },
            processingStats: roomEditorAgent.getProcessingStats()
        });

    } catch (error) {
        console.error('❌ Error processing advanced room edit:', error);
        await AgentLogger.logProcessingSession(req.body.prompt, ['InteriorDesignerAgent', 'StyleDetectiveAgent', 'RoomEditorAgent'], {
            success: false,
            error: error.message,
            advancedMode: true,
            robustApplication: true
        });
        res.status(500).json({
            error: 'Failed to process advanced room edit',
            details: error.message,
            advancedMode: true
        });
    }
});

// Vision-based room editing route (NEW APPROACH)
router.post('/edit-room-vision', async (req, res) => {
    try {
        const { prompt, screenshot, currentHTML } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        if (!screenshot || !screenshot.base64Data) {
            return res.status(400).json({ error: 'Room screenshot is required' });
        }

        console.log(`👁️ Processing VISION room edit request: "${prompt}"`);

        // Get agent instances and room data from app locals
        const { 
            visionRoomAgent,
            setCurrentRoomHTML, 
            getCurrentRoomHTML,
            addToHistory,
            saveCurrentRoom
        } = req.app.locals;

        let currentRoomHTML = getCurrentRoomHTML();

        // Update current HTML if provided
        if (currentHTML) {
            currentRoomHTML = currentHTML;
            setCurrentRoomHTML(currentHTML);
        }

        // ==================== VISION-BASED PROCESSING ====================
        
        // VISION AGENT: Analyze screenshot and generate changes
        const diffObject = await visionRoomAgent.analyzeRoomAndGenerateChanges(
            prompt, 
            screenshot, 
            currentRoomHTML
        );
        
        // ==================== END VISION PROCESSING ====================

        // Apply diff using robust applicator
        let updatedHTML = currentRoomHTML;
        let applicationResult = { success: true, appliedChanges: [], failedChanges: [] };
        
        if (diffObject.changes && diffObject.changes.length > 0) {
            applicationResult = await diffApplicator.applyDiff(currentRoomHTML, diffObject, {
                allowPartialSuccess: true,
                backupOriginal: true,
                validateResult: true
            });
            
            // Log diff application for debugging
            await AgentLogger.logDiffApplication(currentRoomHTML, diffObject, applicationResult, {
                userPrompt: prompt,
                route: 'edit-room-vision',
                agentsUsed: ['VisionRoomAgent'],
                screenshotSize: `${screenshot.width}x${screenshot.height}`
            });
            
            updatedHTML = applicationResult.content;
            
            // Update current room state only if application was successful
            if (applicationResult.success || applicationResult.appliedChanges.length > 0) {
                setCurrentRoomHTML(updatedHTML);
                await saveCurrentRoom();
                addToHistory(updatedHTML, 'vision_edit');
            }
        }

        console.log('✅ Vision room edit completed successfully');

        await AgentLogger.logProcessingSession(prompt, ['VisionRoomAgent'], {
            success: applicationResult.success,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            visionMode: true,
            strategy: diffObject.metadata?.strategy,
            robustApplication: true,
            screenshotAnalyzed: true
        });

        res.json({
            success: applicationResult.success,
            html: updatedHTML,
            originalPrompt: prompt,
            changesApplied: applicationResult.appliedChanges?.length || 0,
            changesFailed: applicationResult.failedChanges?.length || 0,
            warnings: applicationResult.warnings || [],
            visionMode: true,
            visualAnalysis: diffObject.metadata?.visualAnalysis,
            metadata: {
                ...diffObject.metadata,
                applicationResult: {
                    success: applicationResult.success,
                    summary: applicationResult.summary
                },
                screenshotInfo: {
                    width: screenshot.width,
                    height: screenshot.height,
                    mediaType: screenshot.mediaType
                }
            },
            processingStats: visionRoomAgent.getProcessingStats()
        });

    } catch (error) {
        console.error('❌ Error processing vision room edit:', error);
        await AgentLogger.logProcessingSession(req.body.prompt, ['VisionRoomAgent'], {
            success: false,
            error: error.message,
            visionMode: true,
            robustApplication: true
        });
        res.status(500).json({
            error: 'Failed to process vision room edit',
            details: error.message,
            visionMode: true
        });
    }
});

// Get current room state
router.get('/current-room', (req, res) => {
    const { getCurrentRoomHTML } = req.app.locals;
    res.json({
        html: getCurrentRoomHTML()
    });
});

// Reset to default room
router.post('/reset-room', async (req, res) => {
    try {
        const { 
            roomAnalyzerAgent, 
            setCurrentRoomHTML, 
            getCurrentRoomHTML,
            addToHistory,
            saveCurrentRoom,
            setRoomDescription,
            getRoomDescription,
            ROOM_DESCRIPTION_FILE,
            DEFAULT_ROOM_DESCRIPTION_FILE
        } = req.app.locals;

        // Load default room
        const defaultHTML = await RoomUtils.loadRoomHTML('./default_room.html');
        if (!defaultHTML) {
            throw new Error('Default room file not found');
        }

        setCurrentRoomHTML(defaultHTML);
        
        // Save the reset state as current room
        await saveCurrentRoom();
        
        // Load default room description instead of current one
        const defaultDescription = await roomAnalyzerAgent.loadDescription(DEFAULT_ROOM_DESCRIPTION_FILE);
        if (defaultDescription) {
            setRoomDescription(defaultDescription);
            console.log('🔄 Restored default room description from file');
        } else {
            // If no default description exists, analyze the default room and save it
            const newDescription = await roomAnalyzerAgent.analyzeRoom(getCurrentRoomHTML());
            await roomAnalyzerAgent.saveDescription(newDescription, DEFAULT_ROOM_DESCRIPTION_FILE);
            setRoomDescription(newDescription);
            console.log('🆕 Created and saved new default room description');
        }
        
        // Save current description to match the default
        await roomAnalyzerAgent.saveDescription(getRoomDescription(), ROOM_DESCRIPTION_FILE);
        
        addToHistory(getCurrentRoomHTML(), 'reset');
        
        res.json({
            success: true,
            html: getCurrentRoomHTML(),
            message: '🔄 Room reset to default state with original design theme.'
        });
    } catch (error) {
        console.error('❌ Error resetting room:', error);
        res.status(500).json({
            error: 'Failed to reset room',
            details: error.message
        });
    }
});

module.exports = router;