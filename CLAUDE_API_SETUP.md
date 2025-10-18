# Claude AI Item Generator Setup

This guide will help you set up the Claude AI integration for the 3D item generator feature.

## Quick Setup

### 1. Get Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your API key (it starts with `sk-ant-...`)

### 2. Add API Key to Environment Variables

The API key is stored securely in the `.env` file (already configured):

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Note**: The `.env` file is already set up with your API key. The server reads it automatically using `process.env.ANTHROPIC_API_KEY`.

### 3. Start the Server

The AI item generator requires the backend server to be running:

```bash
npm install  # Install dependencies (first time only)
npm start    # Start the server
```

The server will start on `http://localhost:3000`

### 4. Test It Out

1. Open `default_room.html` in your browser
2. Press `D` to enter **Drag Mode**
3. Click the **✨ AI Generate** button in the control panel
4. Enter a description like:
   - "a red vintage lamp"
   - "a small green cactus"
   - "a modern wooden chair"
   - "a large decorative table"
5. Click **Generate Item**
6. Watch as Claude AI creates a 3D object based on your description!

## Features

The AI generator uses Claude to:

- **Understand your description**: Interprets natural language descriptions
- **Choose object type**: Automatically selects lamp, plant, chair, table, or generic object
- **Pick appropriate colors**: Matches colors from your description
- **Determine size**: Creates small, medium, or large versions
- **Add style details**: Considers modern, vintage, minimal, or decorative styles

## Example Prompts

Try these creative prompts:

- "a tiny blue flower pot with pink flowers"
- "a large golden floor lamp"
- "a cozy reading chair in burgundy"
- "a minimalist white desk"
- "a decorative purple cube"
- "a tall green plant with big leaves"

## Security Features

✅ **Secure Implementation:**

This implementation uses a **backend server** to protect your API key:

- ✅ API key stored in `.env` file (never exposed to browser)
- ✅ Server-side API calls to Claude
- ✅ Frontend only communicates with your backend
- ✅ No risk of API key theft from client-side code
- ✅ Production-ready architecture

**How it works:**

1. Frontend sends item description to `/api/generate-item` endpoint
2. Backend server reads `ANTHROPIC_API_KEY` from environment
3. Server calls Claude API securely
4. Server returns results to frontend
5. Frontend generates 3D model from specifications

## Troubleshooting

### "Failed to generate item with AI"

**Check:**
1. **Server is running**: Make sure you ran `npm start` and see "Server running on http://localhost:3000"
2. **API key is correct**: Check `.env` file has valid `ANTHROPIC_API_KEY`
3. **Billing is set up**: Verify your Anthropic account has credits/billing enabled
4. **Port 3000 is available**: No other service is using port 3000
5. **Console errors**: Check browser console (F12 → Console tab) for detailed errors

### "Cannot connect to server"

If you see connection errors:
- **Start the server**: Run `npm start` in the project directory
- **Check port**: Server must be running on `http://localhost:3000`
- **Firewall**: Ensure port 3000 is not blocked by firewall
- **Test endpoint**: Open `http://localhost:3000/health` in browser (should show `{"status":"OK"}`)

### API Rate Limits

- Claude API has rate limits based on your plan
- If you hit limits, wait a moment before trying again
- Consider upgrading your plan for higher limits

## API Costs

- Claude API charges per token (input + output)
- Each item generation uses approximately:
  - Input: ~200 tokens (your prompt + system message)
  - Output: ~150 tokens (JSON response)
- Current pricing: Check [Anthropic Pricing](https://www.anthropic.com/pricing)
- Estimated cost: ~$0.001-0.002 per item generated

## How It Works

1. **User Input**: You describe an item in natural language in the browser
2. **Frontend Request**: Browser sends description to backend server (`POST /api/generate-item`)
3. **Server Processing**: Server reads `ANTHROPIC_API_KEY` from `.env` file
4. **Claude API Call**: Server securely calls Claude API with the description
5. **AI Analysis**: Claude analyzes your description and generates JSON specifications
6. **Server Response**: Server sends specifications back to browser
7. **3D Generation**: Browser uses Claude's specifications to create a Three.js 3D model
8. **Scene Integration**: The object is added to your room at the center

**Architecture:**
```
Browser (default_room.html)
    ↓ POST /api/generate-item
Backend Server (server.js)
    ↓ Uses ANTHROPIC_API_KEY from .env
Claude API
    ↓ Returns item specifications
Backend Server
    ↓ JSON response
Browser (generates 3D model)
```

## Advanced Customization

Want to modify the AI behavior? Edit the prompt in `default_room.html` (around line 4126):

```javascript
content: `You are a 3D object designer. Generate detailed specifications...`
```

You can adjust:
- The types of objects Claude can generate
- The JSON structure returned
- Additional properties like texture, special features, etc.
- More detailed size/style specifications

## Support

For issues with:
- **Claude API**: Visit [Anthropic Support](https://support.anthropic.com)
- **3D Room Code**: Check the main project README
- **Three.js**: Visit [Three.js Documentation](https://threejs.org/docs/)

## License

This feature uses the Anthropic Claude API which has its own terms of service.
Make sure to review the [Anthropic Terms](https://www.anthropic.com/legal/terms) before use.

---

**Happy Creating! 🎨✨**
