# AI System Architecture Manual
## Echoes of the Void - Complete API Integration Documentation

---

## Table of Contents
1. [System Overview](#system-overview)
2. [API Services Used](#api-services-used)
3. [Game Initialization Flow](#game-initialization-flow)
4. [Gameplay Turn Cycle](#gameplay-turn-cycle)
5. [Image Generation Pipeline](#image-generation-pipeline)
6. [Text-to-Speech System](#text-to-speech-system)
7. [Sound Effects System](#sound-effects-system)
8. [Data Structures & Prompts](#data-structures--prompts)
9. [Error Handling](#error-handling)
10. [Configuration](#configuration)

---

## System Overview

**Echoes of the Void** is an AI-driven text adventure game that uses three primary AI services:

1. **Google Gemini AI** - Story generation and image creation
2. **ElevenLabs API** - Text-to-speech narration and sound effects
3. **OpenAI TTS API** - Alternative text-to-speech provider

The game orchestrates these services to create an interactive narrative experience where the AI dynamically responds to player actions, generates atmospheric images, and provides audio narration.

---

## API Services Used

### 1. Google Gemini AI
- **Model for Story**: `gemini-3-flash-preview`
- **Model for Images**: `gemini-2.5-flash-image`
- **Purpose**: Generate narrative responses, manage game state, create scene images
- **Authentication**: API key via `process.env.API_KEY`

### 2. ElevenLabs
- **TTS Endpoint**: `https://api.elevenlabs.io/v1/text-to-speech`
- **SFX Endpoint**: `https://api.elevenlabs.io/v1/sound-generation`
- **Purpose**: Narrate story text, generate ambient sound effects
- **Authentication**: API key via `process.env.ELEVENLABS_API_KEY`
- **Default Voice**: `JBFqnCBsd6RMkjVDRZzb` ("George" - narrative voice)

### 3. OpenAI TTS
- **Endpoint**: `https://api.openai.com/v1/audio/speech`
- **Purpose**: Alternative TTS provider
- **Authentication**: API key via `process.env.OPENAI_API_KEY`
- **Default Voice**: `onyx`
- **Model**: `gpt-4o-mini-tts`

### 4. Web Audio API (Built-in)
- **Purpose**: Generate UI sound effects (typing, submit, receive, win/lose)
- **No external API required**

---

## Game Initialization Flow

### When Player Starts a New Game:

#### Step 1: Game State Initialization
```typescript
// Initial state set in App.tsx
{
  status: 'PLAYING',
  language: 'en' | 'sk',
  history: [],
  charLimit: 50,  // Player starts with 50 characters
  currentGoal: "[selected scenario's goal]",
  selectedScenarioId: "[princess|tower|cyber|space|western|forest]",
  inventory: [],
  charactersMet: [],
  difficulty: 'HARD' | 'NORMAL' | 'JOKE',
  timePressureChance: 50,  // 50% chance of time limits
  charGiftChance: 15       // 15% chance of character recovery
}
```

#### Step 2: Initial Scene Image Generation

**API Call:**
```
Service: Google Gemini AI
Model: gemini-2.5-flash-image
Endpoint: generateSceneImage()
```

**Request Structure:**
```typescript
{
  model: "gemini-2.5-flash-image",
  contents: {
    parts: [{
      text: "[scenario.imagePrompt] . masterpiece, best quality, monochrome, 
             ink sketch, heavy shadows, atmospheric, etching style, 
             white on black background"
    }]
  }
}
```

**Example Prompt (The Cabin scenario):**
```
"A path in a dark forest leading to a small lonely wooden cabin, 
pencil sketch style, mysterious, slay the princess vibe, monochrome, 
high contrast . masterpiece, best quality, monochrome, ink sketch, 
heavy shadows, atmospheric, etching style, white on black background"
```

**Response:**
- Returns base64-encoded image
- Converted to data URL: `data:image/png;base64,[data]`
- Displayed as the first scene

#### Step 3: First Message Display
The game displays the scenario's initial situation text:
```
"You are on a path in the woods. At the end of that path is a cabin..."
```

**No AI call yet** - this is pre-written scenario text.

---

## Gameplay Turn Cycle

### Complete Flow for Each Player Action:

```
USER INPUT → GEMINI API → STATE UPDATE → IMAGE GENERATION → TTS NARRATION → SOUND EFFECTS
```

---

### Step 1: Player Submits Action

**Trigger:** User types action and presses Enter
**UI Sound:** `soundSystem.playSubmit()` (Web Audio API - synthesized beep)

---

### Step 2: Story Generation API Call

**API Call:**
```
Service: Google Gemini AI
Function: generateStoryTurn()
Model: gemini-3-flash-preview
```

**Request Payload:**

```typescript
{
  model: "gemini-3-flash-preview",
  contents: [
    // Conversation history (simplified for context)
    { role: 'user', parts: [{ text: "Previous user action 1" }] },
    { role: 'model', parts: [{ text: "Previous AI response 1" }] },
    { role: 'user', parts: [{ text: "Previous user action 2" }] },
    { role: 'model', parts: [{ text: "Previous AI response 2" }] },
    // Current action
    { role: 'user', parts: [{ text: "I approach the cabin door" }] }
  ],
  config: {
    systemInstruction: "[Dynamic prompt - see below]",
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        message: "STRING",           // Narrative response
        imagePrompt: "STRING",       // Description for image generation
        gameStatus: "ENUM[CONTINUE|WIN|LOSE]",
        inventoryAdd: "ARRAY[STRING]",
        inventoryRemove: "ARRAY[STRING]",
        newCharacters: "ARRAY[STRING]",
        soundEffect: "STRING"        // Sound description
      },
      required: ["message", "imagePrompt", "gameStatus", "soundEffect"]
    }
  }
}
```

---

### System Instruction (Dynamic Prompt)

The system instruction is dynamically constructed based on:
- **Language** (English/Slovak)
- **Difficulty** (NORMAL/HARD/JOKE)
- **Game State** (inventory, characters, goal, character limit)

**Example Full Prompt (HARD mode, English):**

```
You are the narrator of a dark, surreal, minimalist text adventure game.

Respond in Simple English (CEFR B1 level).

Context:
- Current Goal: "Slay the Princess."
- Current Inventory: []
- Known Entities: []
- Player Constraint: Ability to communicate/act is fading. They only had 47 characters to describe their action: "I approach the cabin door".

**CRITICAL DIRECTIVE - UNFORGIVING MODE:**
1. The world is hostile and actively resists the player.
2. Do NOT allow the player to succeed easily. Simple, direct actions to achieve the goal should often fail, be blocked, or introduce a new complication.
3. Specifically for 'Slay the Princess': The Princess is not a passive victim. She argues, deceives, fights back, or changes. The cabin might be a trap.
4. Punish mistakes and rushing.
5. Be harsh but fair.

Your task:
1. Analyze the user's input. If the input is "..." or silence, interpret it as the player waiting, observing, or hesitating.
2. Determine the outcome.
3. Manage State:
   - If the player finds/takes an item, add it to 'inventoryAdd'.
   - If the player uses/loses an item, add it to 'inventoryRemove'.
   - If the player meets a NEW named character or significant entity, add their name to 'newCharacters'.
4. Determine Game Status:
   - 'WIN': Goal achieved.
   - 'LOSE': Player dies, fails significantly, or cannot proceed.
   - 'CONTINUE': Story goes on.
5. Narrative: Provide a concise, atmospheric response (max 2-3 sentences).
6. Visuals: Provide a descriptive, artistic image prompt for the current scene. Style: "minimalist, ink sketch, high contrast, surreal, noir, etching style".
7. Sound: Provide a short sound effect description (e.g., "creaky door opening", "footsteps on gravel", "distant thunder", "sword unsheathing", "eerie whispers") that matches the scene's action or atmosphere.
```

**Difficulty Variations:**

**NORMAL Mode:**
```
**CRITICAL DIRECTIVE - BALANCED MODE:**
1. Provide a standard, atmospheric text adventure experience.
2. Challenges should be logical and solvable.
3. Do not be overly punishing, but do not hand out victory for free.
4. Focus on atmosphere and story progression.
```

**JOKE Mode:**
```
**CRITICAL DIRECTIVE - ABSURD / META MODE:**
1. You are a sarcastic, witty, meta-fictional narrator similar to 'The Stanley Parable'.
2. You find the player's attempts amusing and their character limit pathetic.
3. Break the fourth wall. Comment on the game mechanics.
4. The world is surreal and absurd. Logic is optional.
5. Be funny, slightly antagonistic, but ultimately engaging.
```

---

### Step 3: Parse AI Response

**Example Response JSON:**

```json
{
  "message": "The door opens with a long, tortured creak. Inside, a stone staircase descends into darkness. You hear breathing—slow, measured—from below.",
  "imagePrompt": "Open cabin doorway revealing stone stairs descending into darkness, breathing sounds suggested by shadows, minimalist ink sketch, high contrast",
  "gameStatus": "CONTINUE",
  "inventoryAdd": [],
  "inventoryRemove": [],
  "newCharacters": [],
  "soundEffect": "creaking door and distant breathing"
}
```

---

### Step 4: Game State Logic

**Character Limit Management:**

The game implements a unique mechanic where player communication degrades:

```typescript
// 15% chance: Gift (restore characters)
if (Math.random() * 100 < 15) {
  charLimit += (charDecrement * 3);  // Restore 9 characters
  message += " [CAPACITY RESTORED: +9]";
}
// 85% chance: Decay (lose characters)
else {
  charLimit -= charDecrement;  // Lose 3 characters
}
```

**Lose Condition:**
```typescript
if (charLimit < 0) {
  gameStatus = 'LOSE';
  message += "\n\n(Your voice fades into nothingness.)";
}
```

**Time Pressure:**
```typescript
// 50% chance of time limit for NEXT turn
if (Math.random() * 100 < 50 && gameStatus === 'CONTINUE') {
  isTimerActive = true;
  timerDuration = Math.floor(Math.random() * 11) + 10;  // 10-20 seconds
}
```

**Inventory & Characters:**
```typescript
// Add new items
if (response.inventoryAdd) {
  inventory.push(...response.inventoryAdd);
}

// Remove used items
if (response.inventoryRemove) {
  inventory = inventory.filter(item => 
    !response.inventoryRemove.includes(item)
  );
}

// Track new characters
if (response.newCharacters) {
  charactersMet.push(...response.newCharacters);
}
```

---

### Step 5: UI Sound Effects

**Built-in Web Audio Synthesis:**

```typescript
// Play outcome sound
if (gameStatus === 'WIN') {
  soundSystem.playWin();        // Ethereal major chord
} else if (gameStatus === 'LOSE') {
  soundSystem.playLose();       // Dark dissonant drone
} else {
  soundSystem.playReceive();    // Soft ambient swell
}
```

**Sound Characteristics:**
- **Win**: A Major chord (440Hz, 554Hz, 659Hz, 880Hz), 3-second fade
- **Lose**: Dissonant sawtooth (80Hz → 40Hz), 2.5 seconds
- **Receive**: Soft sine wave (220Hz → 330Hz), 0.5 seconds
- **Submit**: Sweep (600Hz → 1200Hz), 0.15 seconds
- **Type**: Triangle wave (~800Hz), 0.03 seconds per keystroke

---

### Step 6: Scene Image Generation

**Parallel API Call (non-blocking):**

```
Service: Google Gemini AI
Function: generateSceneImage()
Model: gemini-2.5-flash-image
```

**Request:**
```typescript
{
  model: "gemini-2.5-flash-image",
  contents: {
    parts: [{
      text: "[response.imagePrompt] . masterpiece, best quality, monochrome, 
             ink sketch, heavy shadows, atmospheric, etching style, 
             white on black background"
    }]
  }
}
```

**Example Full Prompt:**
```
"Open cabin doorway revealing stone stairs descending into darkness, 
breathing sounds suggested by shadows, minimalist ink sketch, high contrast 
. masterpiece, best quality, monochrome, ink sketch, heavy shadows, 
atmospheric, etching style, white on black background"
```

**Response Handling:**
```typescript
// Extract base64 image data
for (const part of response.candidates?.[0]?.content?.parts || []) {
  if (part.inlineData) {
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  }
}
```

**Timeline:**
- Image generation starts immediately after story response
- Runs in background (async)
- UI shows loading spinner until image arrives
- Typically takes 2-5 seconds

---

### Step 7: Text-to-Speech Narration

**Conditional:** Only if `narrationEnabled === true`

**API Call:**
```
Service: ElevenLabs (default) or OpenAI TTS
Function: narrateGameText()
```

---

#### ElevenLabs TTS Request

**Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/[voiceId]?output_format=mp3_44100_128`

**Headers:**
```json
{
  "xi-api-key": "[ELEVENLABS_API_KEY]",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "text": "The door opens with a long, tortured creak. Inside, a stone staircase descends into darkness. You hear breathing from below.",
  "model_id": "eleven_multilingual_v2"
}
```

**Text Preprocessing:**
```typescript
// Clean narrative text before sending to TTS
let cleanText = text
  .replace(/\[.*?\]/g, '')         // Remove [CAPACITY RESTORED: +9]
  .replace(/\n{2,}/g, '. ')        // Multiple newlines → period
  .replace(/\n/g, ' ')              // Single newlines → space
  .replace(/GOAL:/g, 'Your goal is:')
  .trim();
```

**Response:**
- Returns MP3 audio blob
- Converted to object URL
- Auto-plays in browser
- Previous narration stops automatically

---

#### OpenAI TTS Request

**Endpoint:** `https://api.openai.com/v1/audio/speech`

**Headers:**
```json
{
  "Authorization": "Bearer [OPENAI_API_KEY]",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "model": "gpt-4o-mini-tts",
  "input": "The door opens with a long, tortured creak...",
  "voice": "onyx",
  "instructions": "Speak in a mysterious, deep, and atmospheric tone. Your voice should evoke a sense of darkness and intrigue, like a narrator in a surreal horror story. Pause slightly between sentences for dramatic effect. Keep the pace slow and deliberate."
}
```

**Voice Options:**
- `alloy`, `echo`, `fable`, `onyx` (default), `nova`, `shimmer`

---

### Step 8: AI-Generated Sound Effects

**Conditional:** Only if ElevenLabs API configured

**API Call:**
```
Service: ElevenLabs Sound Effects
Function: playSoundEffect()
Endpoint: https://api.elevenlabs.io/v1/sound-generation
```

**Request:**
```json
{
  "text": "creaking door and distant breathing",
  "duration_seconds": 3,
  "prompt_influence": 0.5
}
```

**Headers:**
```json
{
  "xi-api-key": "[ELEVENLABS_API_KEY]",
  "Content-Type": "application/json"
}
```

**Response:**
- Returns MP3 audio blob
- Played at 40% volume
- Overlays with TTS narration
- Typical duration: 2-5 seconds

---

## Image Generation Pipeline

### Detailed Flow

1. **AI generates image prompt** as part of story response
2. **App.tsx calls** `generateSceneImage(prompt)`
3. **Prompt enhancement** happens automatically:
   ```
   [AI's prompt] + " . masterpiece, best quality, monochrome, 
   ink sketch, heavy shadows, atmospheric, etching style, 
   white on black background"
   ```
4. **API request** to Gemini 2.5 Flash Image
5. **Response parsing** - extract base64 from inline data
6. **State update** - replace loading spinner with image
7. **Display** - Image shown with fade-in effect

### Image Prompt Examples

**User Action:** "I open the door"

**AI Story Response:**
```json
{
  "message": "The door swings open...",
  "imagePrompt": "Open wooden door revealing stone staircase, shadows, cabin interior"
}
```

**Actual Gemini Request:**
```
"Open wooden door revealing stone staircase, shadows, cabin interior 
. masterpiece, best quality, monochrome, ink sketch, heavy shadows, 
atmospheric, etching style, white on black background"
```

---

## Text-to-Speech System

### Provider Selection

Players can choose between:
1. **ElevenLabs** (default) - More atmospheric, cinematic
2. **OpenAI TTS** - Faster, more consistent

```typescript
setTTSProvider('elevenlabs' | 'openai');
```

### Testing TTS

**Test Button Flow:**
```typescript
testElevenLabs() → textToSpeech() → speakText()
```

**Test Message:**
```
"Hello! This is a test of the ElevenLabs text to speech system. 
If you can hear this, the integration is working correctly."
```

### Voice Customization

**ElevenLabs:**
- Default voice: `JBFqnCBsd6RMkjVDRZzb` ("George")
- Can be changed by modifying `DEFAULT_VOICE_ID`
- Model: `eleven_multilingual_v2`

**OpenAI:**
- Default voice: `onyx` (deep, atmospheric)
- Alternatives: `alloy`, `echo`, `fable`, `nova`, `shimmer`
- Instructions pre-configured for horror atmosphere

---

## Sound Effects System

### Three-Tier Sound Architecture

#### 1. Web Audio API (Synthesized)
**Always available, no API required**

```typescript
soundSystem.playType();     // Keystroke clicks
soundSystem.playSubmit();   // Action submission
soundSystem.playReceive();  // AI response arrives
soundSystem.playWin();      // Victory chord
soundSystem.playLose();     // Defeat drone
```

#### 2. ElevenLabs Sound Generation
**AI-generated ambient sounds**

**API Call per turn:**
```
Endpoint: https://api.elevenlabs.io/v1/sound-generation
Text: "[AI's soundEffect description]"
Duration: 3 seconds
```

**Examples:**
- "creaking door opening"
- "footsteps on gravel"
- "distant thunder"
- "sword unsheathing"
- "eerie whispers"

#### 3. Background Music
**Static MP3 file**
- File: `/assets/music.mp3`
- HTML5 Audio element
- Looping
- Volume adjustable (default: 30%)

---

## Data Structures & Prompts

### GameState Object
```typescript
{
  status: 'START' | 'PLAYING' | 'WIN' | 'LOSE',
  language: 'en' | 'sk',
  history: ChatMessage[],
  charLimit: number,              // Current character budget
  charDecrement: number,          // Amount lost per turn (3)
  currentGoal: string,
  selectedScenarioId: string,
  turnCount: number,
  isLoading: boolean,
  inventory: string[],            // ["rusty key", "torch"]
  charactersMet: string[],        // ["The Princess", "The Crow King"]
  timePressureChance: number,     // 0-100 (default: 50)
  charGiftChance: number,         // 0-100 (default: 15)
  isTimerActive: boolean,
  timerDuration: number | null,   // seconds
  difficulty: 'NORMAL' | 'HARD' | 'JOKE'
}
```

### ChatMessage Object
```typescript
{
  role: 'user' | 'model',
  text: string,
  imageUrl?: string,              // data:image/png;base64,...
  imagePrompt?: string,
  isImageLoading?: boolean
}
```

### StoryResponse (from AI)
```typescript
{
  message: string,                // Narrative text
  imagePrompt: string,            // Description for image
  gameStatus: 'CONTINUE' | 'WIN' | 'LOSE',
  inventoryAdd?: string[],        // ["blade"]
  inventoryRemove?: string[],     // ["torch"]
  newCharacters?: string[],       // ["The Narrator"]
  soundEffect?: string            // "sword clash"
}
```

---

## Error Handling

### API Failures

**Gemini Story Generation Fails:**
```typescript
catch (error) {
  setGameState({
    isLoading: false,
    error: "The void disrupted your thoughts. Please try again."
  });
}
```
- Error message displayed in UI
- Player can retry same action
- Game state preserved

**Image Generation Fails:**
```typescript
// Continues without image
return null;  // Image URL set to undefined
```
- Story continues
- Placeholder shown instead
- Non-blocking failure

**TTS Fails:**
```typescript
// Silently fails, logs to console
console.error('ElevenLabs TTS error:', error);
return null;
```
- Game continues without narration
- No user-facing error

**Sound Effects Fail:**
```typescript
// Gracefully degrades
if (!isElevenLabsConfigured()) {
  return;  // Skip sound effect
}
```

### Network Issues
- All API calls have timeouts
- Failures show user-friendly messages
- Game state never corrupts

---

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
# Required for core gameplay
API_KEY=your_google_gemini_api_key

# Optional - for narration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional - alternative TTS
OPENAI_API_KEY=your_openai_api_key
```

### API Keys Setup

1. **Google Gemini AI:**
   - Get key: https://makersuite.google.com/app/apikey
   - Required for: Story generation, image generation
   - Used by: `services/gemini.ts`

2. **ElevenLabs:**
   - Get key: https://elevenlabs.io/app/settings/api-keys
   - Required for: TTS narration, sound effects
   - Used by: `services/elevenlabs.ts`

3. **OpenAI:**
   - Get key: https://platform.openai.com/api-keys
   - Required for: Alternative TTS
   - Used by: `services/elevenlabs.ts`

### Testing Configuration

**In-game test buttons:**
- Test ElevenLabs TTS
- Test OpenAI TTS  
- Test Sound Effects

Each plays sample audio to verify API connectivity.

---

## Performance Considerations

### API Call Timing

**Per Game Turn:**
- 1 Gemini Story API call (~1-3 seconds)
- 1 Gemini Image API call (~2-5 seconds, async)
- 0-1 ElevenLabs TTS call (~2-4 seconds)
- 0-1 ElevenLabs SFX call (~1-2 seconds)

**Total latency per turn:** ~3-8 seconds

### Optimization Strategies

1. **Image generation is non-blocking**
   - Player sees story text immediately
   - Image loads in background

2. **TTS can be disabled**
   - Faster gameplay without waiting for audio

3. **History simplification**
   - Only sends simplified history to Gemini
   - Reduces token usage
   - Faster API responses

4. **Sound effects are optional**
   - Degrades gracefully if ElevenLabs unavailable

---

## API Cost Estimation

### Per Turn Costs (approximate):

**Gemini AI:**
- Story generation: ~0.001-0.005 USD
- Image generation: ~0.01-0.02 USD

**ElevenLabs:**
- TTS narration: ~0.002-0.005 USD
- Sound effect: ~0.001-0.003 USD

**OpenAI TTS:**
- Narration: ~0.001-0.003 USD

**Typical 10-turn game:** ~$0.15-0.40 USD

---

## Summary Flow Diagram

```
[PLAYER TYPES ACTION]
        ↓
[Submit Sound Effect - Web Audio]
        ↓
[API: Gemini Story Generation]
   - Sends: user input + history + game state
   - Receives: narrative + imagePrompt + gameStatus + soundEffect
        ↓
[Game Logic: Update State]
   - Modify char limit (±)
   - Update inventory
   - Check win/lose
   - Set timer
        ↓
[API: Gemini Image Generation] ← Async/Parallel
   - Sends: enhanced imagePrompt
   - Receives: base64 image
        ↓
[UI Sound Effects - Web Audio]
   - Win/Lose/Continue
        ↓
[API: ElevenLabs TTS] ← If enabled
   - Sends: cleaned narrative text
   - Receives: MP3 audio blob
   - Auto-plays
        ↓
[API: ElevenLabs SFX] ← If configured
   - Sends: soundEffect description
   - Receives: MP3 audio blob
   - Plays at 40% volume
        ↓
[DISPLAY COMPLETE RESPONSE]
   - Narrative text
   - Generated image (when ready)
   - Updated UI stats
```

---

## Debugging Tips

### Check API Connectivity
1. Open browser console (F12)
2. Look for API errors
3. Test buttons verify each service

### Common Issues

**"Empty response from AI"**
- Check `API_KEY` in `.env.local`
- Verify Gemini API quota

**"No narration playing"**
- Check `ELEVENLABS_API_KEY` or `OPENAI_API_KEY`
- Test TTS buttons
- Check browser audio permissions

**"Images not loading"**
- Gemini Image API might be slow
- Check network tab for failures
- Images are optional, game continues

### Viewing API Calls
All API requests log to console with:
```typescript
console.error("Story Generation Error:", error);
console.error("Image Generation Error:", error);
console.error("ElevenLabs API error:", response.status, errorText);
```

---

## Future Enhancements

Potential API integrations:
- Add DALL-E 3 as alternative image generator
- Integrate Azure Speech for more voice options
- Add GPT-4 as alternative story engine
- WebSocket streaming for real-time narration
- Cloud save/load via Firebase API

---

## Credits

**AI Services:**
- Google Gemini AI - Story & Image Generation
- ElevenLabs - Text-to-Speech & Sound Effects
- OpenAI - Alternative TTS

**Audio:**
- Web Audio API - UI Sound Effects
- HTML5 Audio - Background Music

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Game Version:** Current

---

For technical support or API issues, check:
- Google AI Studio: https://makersuite.google.com
- ElevenLabs Docs: https://elevenlabs.io/docs
- OpenAI Platform: https://platform.openai.com/docs
