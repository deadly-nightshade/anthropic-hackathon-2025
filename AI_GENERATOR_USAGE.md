# AI Item Generator - Quick Start Guide

## 🚀 Getting Started (3 Steps)

### Step 1: Start the Server
```bash
npm install  # First time only
npm start    # Start the backend server
```

You should see:
```
🚀 AI Room Editor Server running on http://localhost:3000
```

### Step 2: Open the Room
Open `default_room.html` in your web browser

### Step 3: Generate Items!

1. Press **`D`** key to enter **Drag Mode**
2. Click **✨ AI Generate** button in the control panel
3. Type a description:
   - "a red vintage lamp"
   - "a small cactus"
   - "a modern wooden chair"
4. Click **Generate Item**
5. Watch the magic happen! ✨

## 🎨 Example Prompts to Try

**Lamps:**
- "a tall gold floor lamp"
- "a small blue desk lamp"
- "a vintage red reading light"

**Plants:**
- "a large leafy plant"
- "a tiny cactus"
- "a flower in a decorative pot"

**Furniture:**
- "a cozy reading chair in purple"
- "a minimalist white table"
- "a modern desk chair"

**Creative Objects:**
- "a decorative cube with patterns"
- "a colorful geometric sculpture"
- "a mysterious glowing orb"

## 🔧 Configuration

The system uses **ANTHROPIC_API_KEY** from your `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

✅ Already configured in your `.env` file!

## 🏗️ Architecture

```
┌─────────────────────┐
│   Browser           │
│   (3D Room)         │
└──────────┬──────────┘
           │ Description: "red lamp"
           │ POST /api/generate-item
           ↓
┌─────────────────────┐
│   Backend Server    │
│   (Express + Node)  │
│                     │
│   Reads .env file:  │
│   ANTHROPIC_API_KEY │
└──────────┬──────────┘
           │ API Call with key
           ↓
┌─────────────────────┐
│   Claude API        │
│   (Anthropic)       │
└──────────┬──────────┘
           │ JSON: {type, name, color, size}
           ↓
┌─────────────────────┐
│   Backend Server    │
└──────────┬──────────┘
           │ Return specifications
           ↓
┌─────────────────────┐
│   Browser           │
│   Generates 3D      │
│   Three.js object   │
└─────────────────────┘
```

## 🛡️ Security Features

✅ **API Key Protection**
- Key stored in `.env` (never exposed to browser)
- Server-side API calls only
- Production-ready architecture

✅ **No Client-Side Exposure**
- Browser never sees your API key
- All sensitive operations on server
- Safe to host publicly

## 📊 Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-item` | POST | Generate 3D item specs with Claude |
| `/api/edit-room` | POST | Edit room with AI (different feature) |
| `/health` | GET | Check if server is running |

## 🐛 Troubleshooting

**❌ "Cannot connect to server"**
- Solution: Run `npm start` to start the server

**❌ "Failed to generate item"**
- Check: Is the server running? (`http://localhost:3000/health`)
- Check: Is `.env` file present with valid API key?
- Check: Do you have credits in your Anthropic account?

**❌ Server won't start**
- Check: Is port 3000 already in use?
- Try: Kill other processes using port 3000
- Try: Change PORT in `.env` file

## 💡 Tips

- **Be specific**: "small blue lamp" works better than just "lamp"
- **Add details**: "vintage wooden chair" gets better results
- **Experiment**: Try different styles and colors
- **Size matters**: Specify "small", "large", or "tiny" for scale

## 📝 Logs

Server logs show generation activity:
```
✨ Generating 3D item: "red vintage lamp"
✅ Generated item spec: { type: 'lamp', name: 'Vintage Red Lamp', ... }
```

Browser console (F12) shows:
- API requests
- Item specifications
- Any errors

## 🎯 What Claude Generates

For each item, Claude decides:
- **Type**: lamp | plant | chair | table | generic
- **Name**: Descriptive title
- **Color**: Hex code (#RRGGBB)
- **Size**: small | medium | large
- **Style**: modern | vintage | minimal | decorative
- **Features**: Special characteristics

Example response:
```json
{
  "type": "lamp",
  "name": "Vintage Red Lamp",
  "color": "#DC143C",
  "details": {
    "size": "medium",
    "style": "vintage",
    "specialFeatures": ["ornate base", "warm glow"]
  }
}
```

## 📞 Support

- **Server Issues**: Check server.js logs in terminal
- **Browser Issues**: Check console (F12 → Console)
- **API Issues**: Visit [Anthropic Console](https://console.anthropic.com)

---

**Enjoy creating! 🎨✨**
