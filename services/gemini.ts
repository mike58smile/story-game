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
  difficulty: Difficulty
): Promise<StoryResponse> => {
  const ai = getAI();

  const langInstruction = language === 'sk' 
    ? "Respond strictly in Slovak language." 
    : "Respond in Simple English (CEFR B1 level).";

  let difficultyDirective = "";
  
  if (difficulty === 'HARD') {
    difficultyDirective = `
    **CRITICAL DIRECTIVE - UNFORGIVING MODE:**
    1. The world is hostile and actively resists the player.
    2. Do NOT allow the player to succeed easily. Simple, direct actions to achieve the goal should often fail, be blocked, or introduce a new complication.
    3. Specifically for 'Slay the Princess': The Princess is not a passive victim. She argues, deceives, fights back, or changes. The cabin might be a trap.
    4. Punish mistakes and rushing.
    5. Be harsh but fair.
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
  } else { // NORMAL
    difficultyDirective = `
    **CRITICAL DIRECTIVE - BALANCED MODE:**
    1. Provide a standard, atmospheric text adventure experience.
    2. Challenges should be logical and solvable.
    3. Do not be overly punishing, but do not hand out victory for free.
    4. Focus on atmosphere and story progression.
    `;
  }

  const systemInstruction = `
    You are the narrator of a dark, surreal, minimalist text adventure game.
    
    ${langInstruction}
    
    Context:
    - Current Goal: "${currentGoal}"
    - Current Inventory: ${JSON.stringify(inventory)}
    - Known Entities: ${JSON.stringify(charactersMet)}
    - Player Constraint: Ability to communicate/act is fading. They only had ${charLimit} characters to describe their action: "${userInput}".
    
    ${difficultyDirective}

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
          },
          required: ["message", "imagePrompt", "gameStatus"],
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