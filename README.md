# meet vroom (virtual room), an AI-Driven Interactive 3D Room Editor

A sophisticated web application that combines 3D visualization with AI-powered room editing through natural language commands. Users can interact with a virtual room using simple text prompts like "add a bed to the right side" or "change the wall color to blue", and watch as AI agents collaboratively transform the space in real-time.

## 🎯 Overview

This project demonstrates advanced AI collaboration through a multi-agent system that processes natural language requests and generates 3D room modifications. The application features a split-screen interface with a chat panel for commands and a Three.js-powered 3D canvas that renders a fully interactive room environment.

### Key Features

- **Natural Language Room Editing**: Type commands in plain English to modify room layouts, furniture, and decor
- **Multi-Agent AI System**: Specialized AI agents work together to ensure design consistency and quality
- **Real-time 3D Visualization**: Three.js renders a beautiful, interactive 3D room with proper lighting and shadows
- **Style Consistency**: AI maintains cohesive design themes across all modifications
- **Version History**: Complete backup system with rollback capabilities
- **Interactive Objects**: Click on furniture and objects to learn more about them

## 🚀 How to Run

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   # Copy the template file to create your .env file
   copy .env.template .env
   
   # On Mac/Linux use:
   # cp .env.template .env
   ```

4. Edit the `.env` file and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   CODE_MODEL=claude-sonnet-4-5
   DESCRIPTION_MODEL=claude-haiku-4-5
   ```

5. Build the frontend:
   ```bash
   npm run build
   ```

6. Start the server:
   ```bash
   npm start
   ```

7. Open your browser to `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev        # Start server with nodemon
npm run watch      # Watch and rebuild frontend
```

## 🏗️ Architecture Overview

The application uses a sophisticated multi-agent architecture where specialized AI agents collaborate to process user requests:

```
User Request → Agent Pipeline → 3D Rendering
     ↓              ↓              ↓
  Chat UI  →  Multi-Agent AI  →  Three.js Scene
```

### Core Components

- **Frontend**: React-based UI with Three.js 3D rendering
- **Backend**: Express.js server managing agent coordination and file persistence
- **Agent System**: Specialized AI agents for different aspects of room design
- **Storage**: File-based versioning system with automatic backups

## 🤖 Multi-Agent System

The heart of this application is its collaborative AI agent system. Each agent has a specific role and expertise:

### Primary Agents

#### 1. **InteriorDesignerAgent**
- **Role**: Creative design consultation
- **Expertise**: Color theory, furniture placement, lighting concepts, spatial relationships
- **Input**: User's natural language request + current room state
- **Output**: Enhanced design recommendations with professional interior design principles

#### 2. **StyleDetectiveAgent** 
- **Role**: Style consistency enforcement
- **Expertise**: Design coherence, material matching, aesthetic harmony
- **Input**: Designer recommendations + current room style profile
- **Output**: Style-consistent modifications that maintain the room's design theme

#### 3. **RoomEditorAgent**
- **Role**: Technical implementation
- **Expertise**: Three.js code generation, 3D object creation, scene manipulation
- **Input**: Style-approved design changes
- **Output**: Precise code modifications to implement the requested changes

### Specialized Agents

#### 4. **VisionRoomAgent**
- **Role**: Visual analysis and scene understanding
- **Expertise**: Spatial analysis, object recognition, layout optimization
- **Use Case**: Analyzing room layouts and suggesting improvements

#### 5. **RoomAnalyzerAgent**
- **Role**: Room state analysis and validation
- **Expertise**: Spatial constraints, furniture compatibility, flow optimization
- **Use Case**: Ensuring modifications work within physical and aesthetic constraints

#### 6. **JsonFixerAgent**
- **Role**: Data integrity and error recovery
- **Expertise**: JSON validation, data structure repair, error handling
- **Use Case**: Maintaining clean room description data and fixing formatting issues

#### 7. **AdvancedRoomEditorAgent**
- **Role**: Complex multi-object modifications
- **Expertise**: Advanced scene manipulation, coordinated changes, bulk operations
- **Use Case**: Handling complex requests that involve multiple objects or major layout changes

### Agent Workflow

1. **Request Processing**: User's natural language command is received
2. **Design Enhancement**: InteriorDesignerAgent applies professional design principles
3. **Style Validation**: StyleDetectiveAgent ensures consistency with existing room aesthetic
4. **Technical Implementation**: RoomEditorAgent generates precise Three.js code modifications
5. **Quality Assurance**: Additional agents validate and refine the changes as needed
6. **Rendering**: Modified code is applied to update the 3D scene

### Advanced Features

#### **ChangePlanner** & **CodeAnalyzer**
Located in `server/agents/advanced/`, these components provide:
- Strategic planning for complex modifications
- Code impact analysis and optimization
- Dependency management for interconnected changes

#### **Robust Diff Application**
The `RobustDiffApplicator` ensures:
- Safe code modifications without breaking existing functionality
- Precise line-by-line updates
- Rollback capabilities in case of errors

## 📁 Code Structure

```
├── server/
│   ├── agents/              # AI agent implementations
│   │   ├── advanced/        # Advanced planning and analysis agents
│   │   └── *.js            # Core agent implementations
│   ├── routes/             # API endpoints
│   ├── utils/              # Utility functions and logging
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── styles/            # CSS styling
├── public/                # Static assets
├── logs/                  # Agent execution logs
└── backups/              # Automatic room state backups
```

## 🎨 Design Philosophy

The application maintains a "Modern Lofi Study" aesthetic by default, but agents can adapt to various design styles while ensuring:

- **Consistency**: All modifications respect the established design language
- **Functionality**: Changes enhance rather than hinder room usability  
- **Aesthetics**: Professional interior design principles guide all decisions
- **User Intent**: Natural language commands are interpreted with design expertise

## 🔧 Technical Details

- **Frontend**: React 18, Three.js for 3D rendering
- **Backend**: Node.js with Express
- **AI Integration**: Anthropic's Claude API for multi-agent processing
- **Build System**: Webpack with Babel for modern JavaScript features
- **Persistence**: File-based storage with automatic versioning and backups

## 📈 Future Enhancements

- Real-time collaborative editing with multiple users
- Voice command integration
- AR/VR compatibility
- Expanded furniture and decor libraries
- Machine learning for personalized design suggestions
- Export capabilities for 3D models and floor plans

---

*This project showcases the power of multi-agent AI systems in creative applications, demonstrating how specialized AI agents can collaborate to transform natural language into sophisticated 3D environments.*