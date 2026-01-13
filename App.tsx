import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, ChatMessage, INITIAL_CHAR_LIMIT, CHAR_DECREMENT, SCENARIOS, TEXTS, Language, Difficulty } from './types';
import { generateStoryTurn, generateSceneImage } from './services/gemini';
import { soundSystem } from './services/sound';
import TerminalInput from './components/TerminalInput';
import GameDisplay from './components/GameDisplay';
import StatusPanel from './components/StatusPanel';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    language: 'en',
    history: [],
    charLimit: INITIAL_CHAR_LIMIT,
    charDecrement: CHAR_DECREMENT,
    currentGoal: "",
    selectedScenarioId: SCENARIOS[0].id,
    turnCount: 0,
    isLoading: false,
    inventory: [],
    charactersMet: [],
    timePressureChance: 50,
    charGiftChance: 15,
    isTimerActive: false,
    timerDuration: null,
    difficulty: 'HARD'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TEXTS[gameState.language];

  // Language switcher component for the start screen
  const LanguageSwitcher = () => (
    <div className="flex gap-4 justify-center">
      <button 
        onClick={() => setGameState(prev => ({ ...prev, language: 'en' }))}
        className={`px-4 py-2 border font-mono text-xs transition-all ${
          gameState.language === 'en' 
            ? 'border-emerald-500 text-emerald-500 bg-emerald-950/20' 
            : 'border-gray-700 text-gray-500 hover:border-gray-500'
        }`}
      >
        Simple English
      </button>
      <button 
        onClick={() => setGameState(prev => ({ ...prev, language: 'sk' }))}
        className={`px-4 py-2 border font-mono text-xs transition-all ${
          gameState.language === 'sk' 
            ? 'border-emerald-500 text-emerald-500 bg-emerald-950/20' 
            : 'border-gray-700 text-gray-500 hover:border-gray-500'
        }`}
      >
        Slovenčina
      </button>
    </div>
  );

  const startGame = useCallback(async () => {
    // Initialize sound context on user gesture
    soundSystem.playSubmit();

    const selectedScenario = SCENARIOS.find(s => s.id === gameState.selectedScenarioId) || SCENARIOS[0];
    const lang = gameState.language;
    
    setGameState(prev => ({ 
      ...prev, 
      status: 'PLAYING', 
      isLoading: true,
      currentGoal: selectedScenario.goal[lang]
    }));
    
    // Initial story setup
    const initialText = `${selectedScenario.situation[lang]}\n\nGOAL: ${selectedScenario.goal[lang]}`;

    const initialMessage: ChatMessage = {
      role: 'model',
      text: initialText,
      imagePrompt: selectedScenario.imagePrompt,
      isImageLoading: true
    };

    setGameState(prev => ({
      ...prev,
      history: [initialMessage]
    }));

    // Generate initial image
    const imageUrl = await generateSceneImage(selectedScenario.imagePrompt);

    setGameState(prev => ({
      ...prev,
      isLoading: false,
      history: prev.history.map((msg, idx) => 
        idx === 0 ? { ...msg, imageUrl: imageUrl || undefined, isImageLoading: false } : msg
      )
    }));
  }, [gameState.language, gameState.selectedScenarioId]);

  const handleTurn = async (userInput: string) => {
    if (gameState.isLoading || gameState.status !== 'PLAYING') return;

    // Stop timer if it was active
    setGameState(prev => ({ ...prev, isTimerActive: false, timerDuration: null }));

    // 1. Optimistic Update: Add user message
    const userMsg: ChatMessage = { role: 'user', text: userInput };
    
    setGameState(prev => ({
      ...prev,
      history: [...prev.history, userMsg],
      isLoading: true
    }));

    try {
      // 2. Call AI
      const historyForAI = gameState.history.map(m => ({ role: m.role, text: m.text }));
      
      const storyResponse = await generateStoryTurn(
        historyForAI,
        userInput,
        gameState.currentGoal,
        gameState.charLimit,
        gameState.language,
        gameState.inventory,
        gameState.charactersMet,
        gameState.difficulty
      );

      // 3. Prepare AI Response
      const aiMsg: ChatMessage = {
        role: 'model',
        text: storyResponse.message,
        imagePrompt: storyResponse.imagePrompt,
        isImageLoading: true
      };

      // 4. Update Game Logic
      let nextCharLimit = gameState.charLimit;
      let nextIsTimerActive = false;
      let nextTimerDuration = null;
      let systemMessage = "";

      // Logic: Character Gift vs Decrement
      const isGift = Math.random() * 100 < gameState.charGiftChance;
      
      if (isGift) {
        // Gift: Increase capacity
        const giftAmount = gameState.charDecrement * 3;
        nextCharLimit += giftAmount;
        systemMessage = ` [${gameState.language === 'sk' ? TEXTS.sk.capacityRestored : TEXTS.en.capacityRestored}: +${giftAmount}]`;
      } else {
        // Normal: Decrease capacity
        nextCharLimit -= gameState.charDecrement;
      }

      // Logic: Time Pressure for NEXT turn
      const isTimed = Math.random() * 100 < gameState.timePressureChance;
      if (isTimed && storyResponse.gameStatus === 'CONTINUE') {
        nextIsTimerActive = true;
        // Random duration between 10 and 20 seconds
        nextTimerDuration = Math.floor(Math.random() * 11) + 10; 
      }

      // Lose Condition Check
      let nextStatus = storyResponse.gameStatus;
      if (nextStatus === 'CONTINUE' && nextCharLimit < 0) {
        nextStatus = 'LOSE';
        aiMsg.text += ` \n\n(${gameState.language === 'sk' ? 'Tvoj hlas zanikol v prázdnote.' : 'Your voice fades into nothingness.'})`;
      } else if (systemMessage) {
        aiMsg.text += `\n\n${systemMessage}`;
      }

      // Sound Effects based on outcome
      if (nextStatus === 'WIN') {
        soundSystem.playWin();
      } else if (nextStatus === 'LOSE') {
        soundSystem.playLose();
      } else {
        soundSystem.playReceive();
      }

      // 5. Update State
      setGameState(prev => {
        // Calculate new inventory
        let newInventory = [...prev.inventory];
        if (storyResponse.inventoryAdd) {
          storyResponse.inventoryAdd.forEach(item => {
            if (!newInventory.includes(item)) newInventory.push(item);
          });
        }
        if (storyResponse.inventoryRemove) {
          newInventory = newInventory.filter(item => !storyResponse.inventoryRemove?.includes(item));
        }

        // Calculate new characters
        let newCharacters = [...prev.charactersMet];
        if (storyResponse.newCharacters) {
          storyResponse.newCharacters.forEach(char => {
            if (!newCharacters.includes(char)) newCharacters.push(char);
          });
        }

        return {
          ...prev,
          history: [...prev.history, aiMsg],
          status: nextStatus === 'CONTINUE' ? 'PLAYING' : (nextStatus as any),
          charLimit: nextCharLimit,
          turnCount: prev.turnCount + 1,
          inventory: newInventory,
          charactersMet: newCharacters,
          isLoading: false, // Waiting for image in background
          isTimerActive: nextIsTimerActive,
          timerDuration: nextTimerDuration
        };
      });

      // 6. Generate Image
      generateSceneImage(storyResponse.imagePrompt).then(imageUrl => {
        setGameState(prev => {
          const newHistory = [...prev.history];
          const lastIdx = newHistory.length - 1;
          if (lastIdx >= 0 && newHistory[lastIdx].role === 'model') {
            newHistory[lastIdx] = {
              ...newHistory[lastIdx],
              imageUrl: imageUrl || undefined,
              isImageLoading: false
            };
          }
          return { ...prev, history: newHistory };
        });
      });

    } catch (error) {
      console.error(error);
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: "The void disrupted your thoughts. Please try again."
      }));
    }
  };

  const restartGame = () => {
    soundSystem.playSubmit();
    // Return to start screen, preserving settings
    setGameState({
      status: 'START',
      language: gameState.language,
      history: [],
      charLimit: INITIAL_CHAR_LIMIT,
      charDecrement: CHAR_DECREMENT,
      currentGoal: "",
      selectedScenarioId: gameState.selectedScenarioId,
      turnCount: 0,
      isLoading: false,
      inventory: [],
      charactersMet: [],
      timePressureChance: gameState.timePressureChance,
      charGiftChance: gameState.charGiftChance,
      isTimerActive: false,
      timerDuration: null,
      difficulty: gameState.difficulty
    });
  };

  const handleExport = () => {
    const scenario = SCENARIOS.find(s => s.id === gameState.selectedScenarioId);
    const title = scenario?.title[gameState.language] || "Echoes";
    const date = new Date().toISOString().split('T')[0];
    
    let mdContent = `# Echoes of the Void - ${title}\n`;
    mdContent += `**Date**: ${new Date().toLocaleString()}\n`;
    mdContent += `**Goal**: ${gameState.currentGoal}\n`;
    mdContent += `**Difficulty**: ${gameState.difficulty}\n`;
    mdContent += `**Status**: ${gameState.status}\n\n`;
    mdContent += `## Story Log\n\n`;

    gameState.history.forEach(msg => {
      const role = msg.role === 'user' ? (gameState.language === 'en' ? 'You' : 'Ty') : 'Narrator';
      mdContent += `**${role}**:\n${msg.text}\n\n`;
      
      if (msg.imageUrl) {
        mdContent += `![Scene](${msg.imageUrl})\n\n`;
      }
      
      if (msg.imagePrompt) {
        mdContent += `> *Visual Context: ${msg.imagePrompt}*\n`;
      }
      mdContent += `\n---\n\n`;
    });

    // Save full state including images so they can be restored on import
    const stateToSave: GameState = {
      ...gameState,
      history: gameState.history.map(h => ({
        ...h,
        // We preserve imageUrl now to support full restore
        isImageLoading: false
      })),
      isLoading: false,
      isTimerActive: false, // Reset transient states
      timerDuration: null
    };

    mdContent += `\n<!-- ECHOES_DATA\n${JSON.stringify(stateToSave)}\n-->`;

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echoes-${title.replace(/\s+/g, '-').toLowerCase()}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    soundSystem.playSubmit();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Regex to find the JSON block inside the HTML comment
      const match = text.match(/<!-- ECHOES_DATA\n([\s\S]*?)\n-->/);
      
      if (match && match[1]) {
        try {
          const loadedState = JSON.parse(match[1]) as GameState;
          // Validate critical fields
          if (loadedState.history && Array.isArray(loadedState.history)) {
            setGameState(loadedState);
            soundSystem.playSubmit();
          } else {
            throw new Error("Invalid save file structure");
          }
        } catch (err) {
          console.error("Failed to parse save file", err);
          alert("Corrupted save file. The void rejects this offering.");
        }
      } else {
         alert("No valid game data found in this Markdown file.");
      }
      
      // Reset input value to allow re-uploading the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 flex flex-col font-sans selection:bg-emerald-900 selection:text-white">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".md" 
        className="hidden" 
      />

      {/* Header */}
      <header className="p-6 border-b border-white/10 flex flex-wrap gap-4 justify-between items-center bg-[#050505]/80 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-xl md:text-2xl font-serif-title tracking-wider text-white">ECHOES OF THE VOID</h1>
        
        <div className="flex items-center gap-4">
          {/* Export/Import Buttons */}
          <div className="flex gap-2">
             <button 
                onClick={handleExport}
                title="Save Story (Download .md)"
                className="p-2 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-500 rounded-sm transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
             </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                title="Load Story (Upload .md)"
                className="p-2 border border-zinc-700 hover:border-purple-500 hover:text-purple-500 rounded-sm transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
             </button>
          </div>

          <div className="hidden md:flex gap-4 text-xs font-mono text-gray-500 border-l border-white/10 pl-4">
             <span>{t.turn}: {gameState.turnCount}</span>
             <span>{t.status}: {gameState.status}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative">
        <StatusPanel 
          inventory={gameState.inventory} 
          characters={gameState.charactersMet} 
          language={gameState.language}
        />

        {gameState.status === 'START' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-fade-in w-full">
            <div className="space-y-4 max-w-lg">
              <p className="text-xl font-serif-title italic text-gray-400">
                {gameState.language === 'en' 
                  ? "\"The silence is loud, and your time is short.\"" 
                  : "\"Ticho je hlasné a tvoj čas je krátky.\""}
              </p>
              <p className="text-sm font-mono text-gray-500 leading-relaxed">
                {gameState.language === 'en' ? (
                  <>
                    You are trapped. You must escape. <br/>
                    Every action you take consumes your mental capacity.<br/>
                    Your words will become fewer.<br/>
                    Your choices, simpler.
                  </>
                ) : (
                  <>
                    Si uväznený. Musíš uniknúť. <br/>
                    Každá akcia spotrebúva tvoju mentálnu kapacitu.<br/>
                    Tvoje slová budú redšie.<br/>
                    Tvoje voľby jednoduchšie.
                  </>
                )}
                <br/><br/>
                <span className="text-emerald-700">
                  {gameState.language === 'en' 
                    ? "Can you achieve the goal before you go silent?" 
                    : "Dokážeš splniť cieľ skôr, než navždy stíchneš?"}
                </span>
              </p>
            </div>
            
            <div className="flex flex-col gap-6 items-center w-full max-w-lg">
              <LanguageSwitcher />

              {/* Scenario Selection */}
              <div className="w-full border border-zinc-800 bg-zinc-900/50 p-6 rounded-sm space-y-4 backdrop-blur-sm shadow-lg text-left">
                  <h3 className="text-xs font-mono tracking-widest text-emerald-700 border-b border-zinc-800 pb-2 mb-2">
                    {t.selectScenario}
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {SCENARIOS.map((scenario) => (
                      <div 
                        key={scenario.id}
                        onClick={() => setGameState(prev => ({ ...prev, selectedScenarioId: scenario.id }))}
                        className={`p-3 border cursor-pointer transition-all duration-200 ${
                          gameState.selectedScenarioId === scenario.id
                            ? 'border-emerald-500 bg-emerald-900/20'
                            : 'border-zinc-800 hover:border-zinc-600 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-serif-title text-sm ${gameState.selectedScenarioId === scenario.id ? 'text-white' : 'text-gray-400'}`}>
                            {scenario.title[gameState.language]}
                          </span>
                          {gameState.selectedScenarioId === scenario.id && <span className="text-emerald-500 text-xs">●</span>}
                        </div>
                        <p className="text-xs font-mono text-gray-500 line-clamp-2">
                          {scenario.description[gameState.language]}
                        </p>
                      </div>
                    ))}
                  </div>
              </div>

              {/* Configuration Panel */}
              <div className="w-full border border-zinc-800 bg-zinc-900/50 p-6 rounded-sm space-y-6 backdrop-blur-sm shadow-lg text-left">
                  <h3 className="text-xs font-mono tracking-widest text-emerald-700 border-b border-zinc-800 pb-2 mb-4">
                      {t.configuration}
                  </h3>

                  {/* Difficulty Selector */}
                  <div className="space-y-2 mb-6">
                    <div className="text-xs font-mono text-gray-400">{t.difficultySelect}</div>
                    <div className="flex flex-col gap-2">
                        {(['HARD', 'NORMAL', 'JOKE'] as Difficulty[]).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setGameState(prev => ({...prev, difficulty: diff}))}
                            className={`px-3 py-2 text-xs font-mono border text-left transition-all ${
                              gameState.difficulty === diff 
                              ? 'border-emerald-500 text-emerald-500 bg-emerald-900/20' 
                              : 'border-zinc-700 text-gray-500 hover:border-zinc-500'
                            }`}
                          >
                            {diff === 'HARD' ? t.diffHard : diff === 'NORMAL' ? t.diffNormal : t.diffJoke}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Char Limit Slider */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>{t.initialCapacity}</span>
                          <span className="text-emerald-500 font-bold">{gameState.charLimit}</span>
                      </div>
                      <input 
                          type="range" 
                          min="20" max="100" step="5"
                          value={gameState.charLimit}
                          onChange={(e) => setGameState(prev => ({...prev, charLimit: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                      />
                  </div>

                  {/* Decrement Slider */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>{t.entropyRate}</span>
                          <span className="text-red-400 font-bold">-{gameState.charDecrement}</span>
                      </div>
                       <input 
                          type="range" 
                          min="1" max="15" step="1"
                          value={gameState.charDecrement}
                          onChange={(e) => setGameState(prev => ({...prev, charDecrement: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400"
                      />
                  </div>

                  {/* Time Pressure Slider */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>{t.timePressureConfig}</span>
                          <span className="text-orange-500 font-bold">{gameState.timePressureChance}%</span>
                      </div>
                       <input 
                          type="range" 
                          min="0" max="100" step="5"
                          value={gameState.timePressureChance}
                          onChange={(e) => setGameState(prev => ({...prev, timePressureChance: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                      />
                  </div>

                  {/* Char Gift Slider */}
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                          <span>{t.charGiftConfig}</span>
                          <span className="text-purple-400 font-bold">{gameState.charGiftChance}%</span>
                      </div>
                       <input 
                          type="range" 
                          min="0" max="100" step="5"
                          value={gameState.charGiftChance}
                          onChange={(e) => setGameState(prev => ({...prev, charGiftChance: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                      />
                  </div>
              </div>
              
              <button 
                onClick={startGame}
                className="px-8 py-3 border border-emerald-900 text-emerald-500 font-mono text-sm hover:bg-emerald-900/10 hover:text-emerald-400 transition-all duration-300 tracking-widest uppercase w-full"
              >
                {t.initiate}
              </button>
            </div>
          </div>
        ) : (
          <>
            <GameDisplay history={gameState.history} />
            
            {/* End Game Screens */}
            {(gameState.status === 'WIN' || gameState.status === 'LOSE') && (
               <div className="my-8 mx-auto text-center space-y-4 p-6 border-y border-white/10 bg-white/5 backdrop-blur-sm w-full animate-fade-in">
                  <h2 className={`text-3xl font-serif-title ${gameState.status === 'WIN' ? 'text-emerald-400' : 'text-red-500'}`}>
                    {gameState.status === 'WIN' ? t.win : t.lose}
                  </h2>
                  <p className="font-mono text-sm text-gray-400">
                    {gameState.status === 'WIN' ? t.winMsg : t.loseMsg}
                  </p>
                  <button 
                    onClick={restartGame}
                    className="mt-4 px-6 py-2 bg-white text-black font-mono text-xs hover:bg-gray-200 transition-colors uppercase tracking-widest"
                  >
                    {t.tryAgain}
                  </button>
               </div>
            )}

            {/* Input Area */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-12 pb-8 px-4">
              {gameState.error && (
                <div className="text-red-500 text-xs font-mono text-center mb-2">
                  ERROR: {gameState.error}
                </div>
              )}
              
              {gameState.status === 'PLAYING' && (
                 <TerminalInput 
                    charLimit={gameState.charLimit} 
                    onSubmit={handleTurn} 
                    disabled={gameState.isLoading}
                    language={gameState.language}
                    timerDuration={gameState.timerDuration}
                 />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;