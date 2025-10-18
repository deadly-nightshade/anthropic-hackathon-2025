const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const path = require('path');
require('dotenv').config();

// Import modular components
const RoomAnalyzerAgent = require('./server/agents/RoomAnalyzerAgent');
const InteriorDesignerAgent = require('./server/agents/InteriorDesignerAgent');
const StyleDetectiveAgent = require('./server/agents/StyleDetectiveAgent');
const RoomEditorAgent = require('./server/agents/RoomEditorAgent');
const AdvancedRoomEditorAgent = require('./server/agents/AdvancedRoomEditorAgent');
const VisionRoomAgent = require('./server/agents/VisionRoomAgent');
const AgentLogger = require('./server/utils/AgentLogger');
const RoomUtils = require('./server/utils/RoomUtils');
const roomRoutes = require('./server/routes/roomRoutes');
const historyRoutes = require('./server/routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from root directory (for default_room.html, etc.)
app.use(express.static('.'));

// Serve built React app
app.use(express.static('dist'));

<<<<<<< HEAD
=======
// Also serve static files for backward compatibility
app.use('/static', express.static('.'));

// ==================== APPLICATION STATE ====================

>>>>>>> 79a5d8c3b86c53e5b0d37589bdc58ef8e6386965
// Store current room state
let currentRoomHTML = '';
let roomDescription = null; // JSON description of the room
let roomHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 20; // Limit history to prevent memory issues

// File paths for persistence
const ROOM_DESCRIPTION_FILE = './room_description.json';
const DEFAULT_ROOM_DESCRIPTION_FILE = './default_room_description.json';
const CURRENT_ROOM_FILE = './current_room.html';

// ==================== AGENT INITIALIZATION ====================

// Initialize agent instances
const roomAnalyzerAgent = new RoomAnalyzerAgent(anthropic);
const interiorDesignerAgent = new InteriorDesignerAgent(anthropic);
const styleDetectiveAgent = new StyleDetectiveAgent(anthropic);
const roomEditorAgent = new RoomEditorAgent(anthropic);
const advancedRoomEditorAgent = new AdvancedRoomEditorAgent(anthropic);
const visionRoomAgent = new VisionRoomAgent(anthropic);

console.log('🤖 Initialized AI agents:');
console.log('   - InteriorDesignerAgent (prompt enhancement)');
console.log('   - StyleDetectiveAgent (style adaptation)');
console.log('   - RoomEditorAgent (simple editing)');
console.log('   - AdvancedRoomEditorAgent (multi-AI coordination)');
console.log('   - RoomAnalyzerAgent (room understanding)');
console.log('   - VisionRoomAgent (screenshot analysis) 👁️ NEW');

// Log which Claude model is being used
const claudeModel = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
console.log(`🤖 Using Claude model: ${claudeModel}`);
console.log(`🧠 Advanced Room Editor Agent initialized and ready`);

// ==================== UTILITY FUNCTIONS ====================

// Helper function to add state to history
function addToHistory(html, operation = 'edit') {
    // Remove any future history if we're not at the end
    if (historyIndex < roomHistory.length - 1) {
        roomHistory = roomHistory.slice(0, historyIndex + 1);
    }
    
    // Add new state
    roomHistory.push({
        html: html,
        operation: operation,
        timestamp: new Date().toISOString()
    });
    
    // Limit history size
    if (roomHistory.length > MAX_HISTORY) {
        roomHistory.shift();
    } else {
        historyIndex++;
    }
    
    console.log(`📚 Added to history: ${operation} (${historyIndex + 1}/${roomHistory.length})`);
}

// Save current room HTML to file
async function saveCurrentRoom() {
    await RoomUtils.saveRoomHTML(CURRENT_ROOM_FILE, currentRoomHTML);
}

// Load current room HTML from file
async function loadCurrentRoom() {
    return await RoomUtils.loadRoomHTML(CURRENT_ROOM_FILE);
}

// Load default room on startup
async function loadDefaultRoom() {
    const html = await RoomUtils.loadRoomHTML('./default_room.html');
    if (!html) {
        console.error('❌ Error: default_room.html not found');
        process.exit(1);
    }
    return html;
}

// ==================== APP LOCALS (DEPENDENCY INJECTION) ====================

// Make all dependencies available to routes via app.locals
app.locals.roomAnalyzerAgent = roomAnalyzerAgent;
app.locals.interiorDesignerAgent = interiorDesignerAgent;
app.locals.styleDetectiveAgent = styleDetectiveAgent;
app.locals.roomEditorAgent = roomEditorAgent;
app.locals.advancedRoomEditorAgent = advancedRoomEditorAgent;
app.locals.visionRoomAgent = visionRoomAgent; // Add vision agent

// State getters and setters
app.locals.getCurrentRoomHTML = () => currentRoomHTML;
app.locals.setCurrentRoomHTML = (html) => { currentRoomHTML = html; };
app.locals.getRoomDescription = () => roomDescription;
app.locals.setRoomDescription = (desc) => { roomDescription = desc; };

// History management
app.locals.roomHistory = roomHistory;
app.locals.historyIndex = historyIndex;
app.locals.setHistoryIndex = (index) => { historyIndex = index; };
app.locals.addToHistory = addToHistory;

// Utility functions
app.locals.saveCurrentRoom = saveCurrentRoom;

// File paths
app.locals.ROOM_DESCRIPTION_FILE = ROOM_DESCRIPTION_FILE;
app.locals.DEFAULT_ROOM_DESCRIPTION_FILE = DEFAULT_ROOM_DESCRIPTION_FILE;

// ==================== ROUTES ====================

// Use modular routes
app.use('/api', roomRoutes);
app.use('/api', historyRoutes);

// AI Item Generator endpoint
app.post('/api/generate-item', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log(`✨ Generating 3D item: "${description}"`);

        // Send request to Anthropic
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `You are a 3D object designer. Generate detailed specifications for a 3D object based on this description: "${description}"

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "type": "lamp|plant|chair|table|generic",
  "name": "Short descriptive name",
  "color": "#HEXCOLOR",
  "details": {
    "size": "small|medium|large",
    "style": "modern|vintage|minimal|decorative",
    "specialFeatures": ["feature1", "feature2"]
  }
}

Choose the most appropriate type. Use creative colors that match the description.`
            }]
        });

        const aiResponse = response.content[0].text.trim();
        
        // Parse the JSON response
        let itemSpec;
        try {
            // Clean response by removing any markdown code blocks if present
            let cleanResponse = aiResponse;
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                itemSpec = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON object found in response');
            }
            
            console.log('✅ Generated item spec:', itemSpec);
            
        } catch (parseError) {
            console.warn('⚠️ Failed to parse Claude response, using fallback');
            // Fallback if parsing fails
            itemSpec = {
                type: 'generic',
                name: 'AI Object',
                color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                details: {
                    size: 'medium',
                    style: 'modern',
                    specialFeatures: []
                }
            };
        }

        res.json({
            success: true,
            itemSpec: itemSpec,
            originalDescription: description
        });

    } catch (error) {
        console.error('❌ Error generating item:', error);
        res.status(500).json({
            error: 'Failed to generate item',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve landing page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve React app for all other routes (must be after API routes)
app.get('*', (req, res) => {
    const requestedPath = path.join(__dirname, req.path);
    // If file exists, serve it (for default_room.html, editor.html, etc.)
    if (require('fs').existsSync(requestedPath) && require('fs').statSync(requestedPath).isFile()) {
        res.sendFile(requestedPath);
    } else {
        // Otherwise serve React app
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});

// ==================== SERVER STARTUP ====================

async function startServer() {
    // Initialize logging
    await AgentLogger.initializeLogs();

    // Try to load current room first, fallback to default room
    const existingRoom = await loadCurrentRoom();
    if (existingRoom) {
        currentRoomHTML = existingRoom;
        console.log('🔄 Loaded existing current room state');
    } else {
        currentRoomHTML = await loadDefaultRoom();
        console.log('🆕 No current room found, starting with default room');
        // Save the default as current room for future persistence
        await saveCurrentRoom();
    }
    
    addToHistory(currentRoomHTML, 'initial'); // Add initial state to history
    
    // Load or analyze room description
    roomDescription = await roomAnalyzerAgent.loadDescription(ROOM_DESCRIPTION_FILE);
    if (!roomDescription) {
        console.log('🔍 No existing room description found, analyzing room...');
        roomDescription = await roomAnalyzerAgent.analyzeRoom(currentRoomHTML);
        await roomAnalyzerAgent.saveDescription(roomDescription, ROOM_DESCRIPTION_FILE);
        
        // Also save as default description if it doesn't exist
        const defaultDescription = await roomAnalyzerAgent.loadDescription(DEFAULT_ROOM_DESCRIPTION_FILE);
        if (!defaultDescription) {
            await roomAnalyzerAgent.saveDescription(roomDescription, DEFAULT_ROOM_DESCRIPTION_FILE);
            console.log('💾 Saved default room description for future resets');
        }
    }

    app.listen(PORT, () => {
        console.log(`🚀 AI Room Editor Server running on http://localhost:${PORT}`);
        console.log(`🎨 Open http://localhost:${PORT}/editor.html to start editing!`);
        console.log(`📝 Agent logs will be written to: ${AgentLogger.AGENT_LOG_FILE}`);
        console.log(`📋 Room descriptions: current=${ROOM_DESCRIPTION_FILE}, default=${DEFAULT_ROOM_DESCRIPTION_FILE}`);
        console.log(`🗂️ Modular backend structure loaded successfully!`);
    });
}

startServer().catch(console.error);