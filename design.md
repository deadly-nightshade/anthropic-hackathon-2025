Web App Design Document: AI-Driven Interactive Room Editor
1. Overview

A web app where users interact with a 3D room via a side chat interface. Users type commands (e.g., "add wooden desk"), and an AI edits the entire HTML, which is then rendered live. Objects are fully AI-generated and stylized. The backend persists versions of the .html files for retrieval or rollback.

2. Architecture
2.1 Components

Frontend

Minimalistic, MacOS-style UI

Side chat panel for commands

3D canvas rendering the room (<canvas> via Three.js)

Object info overlay for hover or click

Backend

REST API for:

Storing .html versions

Retrieving previous versions

Sending HTML + prompt to AI

Optional history/version management

AI Service

Input: Full HTML + user prompt

Output: Edited full HTML

Capable of generating new objects, stylized room content, updating positions

3. Data Flow

User types command → frontend sends request to backend

Backend packages full HTML + command → sends to AI API

AI returns edited full HTML

Backend stores the new HTML version → sends to frontend

Frontend replaces old HTML with AI-edited HTML

Optional: user can revert to previous version via backend

Diagram (simplified):

User → Frontend → Backend → AI → Backend → Frontend → Rendered HTML

4. Frontend Design

Layout

Split-screen:

Left: Chat interface

Right: 3D canvas rendering HTML scene

UI Style

Minimalistic, MacOS-like: soft shadows, rounded corners, subtle color palette

Chat panel: simple text input + send button

Object overlays: subtle semi-transparent info boxes

3D Scene

Three.js renders room and objects

Stylized lighting, furniture, decor

Fully AI-generated objects, stylized or cartoonish

Optional interactive objects (drag/rotate if implemented later)

5. Backend Design

Endpoints

POST /edit → receive prompt + HTML, return edited HTML

GET /version/:id → retrieve specific HTML version

POST /save → save new version

GET /history → list of saved versions

Storage

File system or database storing HTML per version with timestamps

Optional metadata: user, prompt, object summary

6. AI Integration

Receives full HTML + prompt

Generates new objects, edits layout, updates styles

Returns entire HTML, which frontend renders directly

Optional: AI can place objects in aesthetically pleasing positions automatically

7. Future Considerations

Undo/redo per AI edit or per object change

Autocomplete / suggestion in chat for common objects

Drag-and-drop object repositioning

Stylization presets (e.g., Lofi, Futuristic, Minimal)