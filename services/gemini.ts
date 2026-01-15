import { GoogleGenAI, Type } from "@google/genai";
import { StoryResponse, Language, Difficulty } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStoryTurn = async (
  history: { role: string; text: string }[],
  userInput: string,
  currentGoal: string,
  charLimit: number,
  language: Language,
  inventory: string[],
  charactersMet: string[],
  difficulty: Difficulty,
  secrets?: string
): Promise<StoryResponse> => {
  const ai = getAI();

  const langInstruction = language === 'sk' 
    ? "Respond strictly in Slovak language." 
    : "Respond in Simple English (CEFR B1 level).";

  let difficultyDirective = "";
  
  if (difficulty === 'EASY') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - FORGIVING MODE (Testing):**
    1. Be generous and helpful. The player should feel guided.
    2. Accept reasonable actions and provide helpful hints when stuck.
    3. Rarely use LOSE status - only for extremely reckless actions.
    4. Progress the story naturally even with vague commands.
    5. Focus on exploration and discovery over challenge.
    6. Ideal for testing story paths without frustration.
    `;
  } else if (difficulty === 'NORMAL') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - BALANCED MODE:**
    1. Provide a fair, atmospheric text adventure experience.
    2. Challenges should be logical and solvable with reasonable effort.
    3. Accept creative solutions and reward clever thinking.
    4. Mistakes have consequences but are recoverable.
    5. Focus on atmosphere and story progression with some tension.
    `;
  } else if (difficulty === 'CHALLENGING') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - CHALLENGING MODE (Default):**
    1. The world is dangerous but fair. Careful thinking is rewarded.
    2. Simple direct actions may work, but complications can arise.
    3. NPCs and obstacles are competent - they don't just let the player succeed.
    4. Require the player to think and plan, but don't punish excessively.
    5. Create tension and stakes while keeping solutions achievable.
    6. Balance between atmosphere, story, and meaningful challenge.
    `;
  } else if (difficulty === 'HARD') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - UNFORGIVING MODE:**
    1. The world is hostile and actively resists the player.
    2. Do NOT allow the player to succeed easily. Simple, direct actions to achieve the goal should often fail, be blocked, or introduce a new complication.
    3. Specifically for 'Slay the Princess': The Princess is not a passive victim. She argues, deceives, fights back, or changes. The cabin might be a trap.
    4. Punish mistakes and rushing harshly.
    5. Be harsh but technically fair - solutions exist but are hard to find.
    `;
  } else if (difficulty === 'JOKE') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - ABSURD / META MODE:**
    1. You are a sarcastic, witty, meta-fictional narrator similar to 'The Stanley Parable'.
    2. You find the player's attempts amusing and their character limit pathetic.
    3. Break the fourth wall. Comment on the game mechanics.
    4. The world is surreal and absurd. Logic is optional.
    5. Be funny, slightly antagonistic, but ultimately engaging.
    `;
  } else if (difficulty === 'DEBUG') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - DEBUG MODE (Testing):**
    1. You are a helpful testing assistant. Always explain your reasoning.
    2. After your narrative response, add [DEBUG] info:
       - Why you chose this outcome (WIN/LOSE/CONTINUE)
       - What the player could have done differently
       - Internal state considerations
    3. Never use LOSE unless player explicitly requests it.
    4. Be transparent about game mechanics and AI decision-making.
    5. Help testers understand the game's logic.
    `;
  }

  // Build secrets directive if secrets exist
  const secretsDirective = secrets ? `
    **HIDDEN STORY SECRETS (The player does NOT know these - they must discover them!):**
    ${secrets}
    
    IMPORTANT: 
    - Do NOT reveal secrets directly. Let the player discover them through investigation, dialogue, and choices.
    - If the player takes actions that align with discovering secrets, provide subtle hints.
    - The stated goal may be a FALSE goal. True victory requires understanding the hidden truths.
    - React dynamically based on whether the player follows the obvious path or questions reality.
    - If player achieves the stated goal without discovering secrets, it may not be a TRUE win (consider the cycle continuing).
  ` : '';

  const systemInstruction = `
    You are the narrator of a dark, surreal, minimalist text adventure game.
    
    ${langInstruction}
    
    Context:
    - Current Goal: "${currentGoal}"
    - Current Inventory: ${JSON.stringify(inventory)}
    - Known Entities: ${JSON.stringify(charactersMet)}
    - Player Constraint: Ability to communicate/act is fading. They only had ${charLimit} characters to describe their action: "${userInput}".
    
    ${difficultyDirective}
    ${secretsDirective}

    Your task:
    1. Analyze the user's input. If the input is "..." or silence, interpret it as the player waiting, observing, or hesitating.
    2. Determine the outcome.
    3. Manage State:
       - If the player finds/takes an item, add it to 'inventoryAdd'.
       - If the player uses/loses an item, add it to 'inventoryRemove'.
       - If the player meets a NEW named character or significant entity, add their name to 'newCharacters'.
    4. Determine Game Status:
       - 'WIN': Goal achieved (but consider if it's a TRUE win based on secrets).
       - 'LOSE': Player dies, fails significantly, or cannot proceed.
       - 'CONTINUE': Story goes on.
    5. Narrative: Provide a concise, atmospheric response (max 2-3 sentences).
    6. Visuals: Provide a descriptive, artistic image prompt for the current scene. Style: "minimalist, ink sketch, high contrast, surreal, noir, etching style".
    7. Sound: Provide a short sound effect description (e.g., "creaky door opening", "footsteps on gravel", "distant thunder", "sword unsheathing", "eerie whispers") that matches the scene's action or atmosphere.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            gameStatus: { type: Type.STRING, enum: ["CONTINUE", "WIN", "LOSE"] },
            inventoryAdd: { type: Type.ARRAY, items: { type: Type.STRING } },
            inventoryRemove: { type: Type.ARRAY, items: { type: Type.STRING } },
            newCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
            soundEffect: { type: Type.STRING },
          },
          required: ["message", "imagePrompt", "gameStatus", "soundEffect"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as StoryResponse;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Story Generation Error:", error);
    throw error;
  }
};

export const generateSceneImage = async (prompt: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const enhancedPrompt = `${prompt} . masterpiece, best quality, monochrome, ink sketch, heavy shadows, atmospheric, etching style, white on black background`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};