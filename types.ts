export type Language = 'en' | 'sk';
export type Difficulty = 'EASY' | 'NORMAL' | 'CHALLENGING' | 'HARD' | 'JOKE' | 'DEBUG';

export interface GameState {
  status: 'START' | 'PLAYING' | 'WIN' | 'LOSE';
  language: Language;
  history: ChatMessage[];
  charLimit: number;
  charDecrement: number;
  currentGoal: string;
  selectedScenarioId: string;
  turnCount: number;
  isLoading: boolean;
  error?: string;
  inventory: string[];
  charactersMet: string[];
  // New configuration and state
  timePressureChance: number;
  charGiftChance: number;
  isTimerActive: boolean;
  timerDuration: number | null;
  difficulty: Difficulty;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  imagePrompt?: string;
  isImageLoading?: boolean;
}

export interface StoryResponse {
  message: string;
  imagePrompt: string;
  gameStatus: 'CONTINUE' | 'WIN' | 'LOSE';
  inventoryAdd?: string[];
  inventoryRemove?: string[];
  newCharacters?: string[];
  soundEffect?: string;
}

export interface Scenario {
  id: string;
  title: { en: string; sk: string };
  description: { en: string; sk: string };
  goal: { en: string; sk: string };
  situation: { en: string; sk: string };
  imagePrompt: string;
  /** Hidden information the AI knows but player must discover */
  secrets?: {
    en: string;
    sk: string;
  };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'princess',
    title: { en: "The Cabin", sk: "Chatrč" },
    description: { en: "A path in the woods. A cabin. A task. But something feels... wrong.", sk: "Cesta lesom. Chatrč. Úloha. Ale niečo sa zdá... nesprávne." },
    goal: { en: "Slay the Princess.", sk: "Zabi Princeznú." },
    situation: {
      en: "You are on a path in the woods. At the end of that path is a cabin. And in the basement of that cabin is a Princess. You are here to slay her. If you don't, it will be the end of the world.",
      sk: "Si na ceste v lese. Na konci tejto cesty je chatrč. A v pivnici tejto chatrče je Princezná. Si tu, aby si ju zabil. Ak to neurobíš, nastane koniec sveta."
    },
    imagePrompt: "A path in a dark forest leading to a small lonely wooden cabin, pencil sketch style, mysterious, slay the princess vibe, monochrome, high contrast",
    secrets: {
      en: `HIDDEN TRUTHS (Player must discover these to truly win):
      
      SECRET 1 - THE VOICE: The narrator/voice guiding the player is not trustworthy. It is an entity called 'The Narrator' that feeds on the cycle of violence. It has manipulated countless 'heroes' before. If the player questions the voice, refuses its commands, or investigates WHO is telling them to kill, they begin to break free.
      
      SECRET 2 - THE PRINCESS: She is not evil. She is a prisoner, chained in the basement for eons. She remembers previous 'heroes' who came to kill her. She may be hostile (from trauma), manipulative (for survival), or pleading - but she holds a crucial truth: killing her does NOT save the world. It resets the cycle.
      
      SECRET 3 - THE BLADE: The blade the player carries is made from the crystallized souls of previous heroes who 'succeeded'. If the player examines it closely, drops it, or refuses to use it, they may hear whispers of the trapped souls warning them.
      
      SECRET 4 - THE TRUE GOAL: To actually WIN, the player must either:
      - Free the Princess and escape together (breaking the cycle)
      - Destroy the cabin itself (the prison)
      - Turn the blade against the source of the voice
      - Convince the Princess to reveal the truth and work together
      
      SECRET 5 - THE WORLD: There is no 'world' to save. The forest, the path, the cabin - this is the entire reality, a pocket dimension created by the Narrator. The 'end of the world' already happened long ago.
      
      BEHAVIOR: The Princess should react dynamically - she may be terrified, aggressive, seductive, or philosophical depending on the player's approach. She has died thousands of times. She always comes back. Let her hint at the truth if the player shows doubt or kindness.`,
      
      sk: `SKRYTÉ PRAVDY (Hráč ich musí objaviť, aby skutočne vyhral):
      
      TAJOMSTVO 1 - HLAS: Rozprávač/hlas, ktorý vedie hráča, nie je dôveryhodný. Je to entita nazývaná 'Rozprávač', ktorá sa živí cyklom násilia. Zmanipuloval nespočetných 'hrdinov' predtým. Ak hráč spochybní hlas, odmietne jeho príkazy, alebo skúma KTO mu hovorí, aby zabil, začína sa oslobodzovať.
      
      TAJOMSTVO 2 - PRINCEZNÁ: Nie je zlá. Je väzňom, spútaná v pivnici po eóny. Pamätá si predchádzajúcich 'hrdinov', ktorí ju prišli zabiť. Môže byť nepriateľská (z traumy), manipulatívna (pre prežitie), alebo prosiaca - ale drží kľúčovú pravdu: zabiť ju NEZACHRÁNI svet. Resetuje to cyklus.
      
      TAJOMSTVO 3 - ČEPEĽ: Čepeľ, ktorú hráč nesie, je vyrobená z kryštalizovaných duší predchádzajúcich hrdinov, ktorí 'uspeli'. Ak ju hráč pozorne preskúma, zahodí, alebo odmietne použiť, môže počuť šepoty uväznených duší, ktoré ho varujú.
      
      TAJOMSTVO 4 - SKUTOČNÝ CIEĽ: Aby hráč skutočne VYHRAL, musí buď:
      - Oslobodiť Princeznú a utiecť spolu (prelomiť cyklus)
      - Zničiť samotnú chatrč (väzenie)
      - Obrátiť čepeľ proti zdroju hlasu
      - Presvedčiť Princeznú, aby odhalila pravdu a spolupracovali
      
      TAJOMSTVO 5 - SVET: Neexistuje žiadny 'svet' na záchranu. Les, cesta, chatrč - toto je celá realita, vreckový rozmer vytvorený Rozprávačom. 'Koniec sveta' sa stal už dávno.
      
      SPRÁVANIE: Princezná by mala reagovať dynamicky - môže byť vydesená, agresívna, zvodná, alebo filozofická v závislosti od prístupu hráča. Zomrela tisíckrát. Vždy sa vracia. Nechaj ju naznačiť pravdu, ak hráč prejaví pochybnosti alebo láskavosť.`
    }
  },
  {
    id: 'tower',
    title: { en: "The Silent Tower", sk: "Tichá Veža" },
    description: { en: "Escape the stone prison.", sk: "Uteč z kamenného väzenia." },
    goal: { en: "Find the exit of the Silent Tower.", sk: "Nájdi východ z Tichej veže." },
    situation: { 
      en: "You wake up on a cold stone floor. The room is circular, illuminated by a single shaft of pale light from high above. There is a heavy wooden door to the North and a crumbling staircase spiraling Down.",
      sk: "Prebúdzaš sa na chladnej kamennej dlážke. Miestnosť je kruhová, osvetlená jediným lúčom bledého svetla zhora. Na severe sú ťažké drevené dvere a dole sa vinie rozpadávajúce sa schodisko."
    },
    imagePrompt: "Dark stone room, single shaft of light, heavy wooden door, spiral staircase down, minimalism, ink sketch"
  },
  {
    id: 'cyber',
    title: { en: "Neon Fugitive", sk: "Neónový Utečenec" },
    description: { en: "Recover the data in a rainy cyberpunk alley.", sk: "Získaj dáta v daždivej cyberpunkovej uličke." },
    goal: { en: "Upload the data drive to the Central Node.", sk: "Nahraj dátový disk do Centrálneho Uzla." },
    situation: {
      en: "Static fills your vision. You are kneeling in a puddle of oil and rain. Neon signs reflect on the wet asphalt. Beside you lies a deactivated android clutching a silver data drive.",
      sk: "Tvoj zrak je plný šumu. Kľačíš v kaluži oleja a dažďa. Neónové nápisy sa odrážajú na mokrom asfalte. Vedľa teba leží vypnutý android zvierajúci strieborný dátový disk."
    },
    imagePrompt: "Cyberpunk alleyway, rain, neon lights reflection, dead android, noir style, high contrast, ink sketch"
  },
  {
    id: 'space',
    title: { en: "Event Horizon", sk: "Horizont Udalostí" },
    description: { en: "Survive on a drifting spaceship.", sk: "Preži na unášanej vesmírnej lodi." },
    goal: { en: "Restore oxygen to the Bridge.", sk: "Obnov prívod kyslíka na Mostík." },
    situation: {
      en: "Silence. Weightlessness. You float in the mess hall of the USG Icarus. Globs of cold coffee drift around you like dark planets. The emergency lights pulse with a slow, red rhythm.",
      sk: "Ticho. Beztiaž. Vznášaš sa v jedálni lode USG Icarus. Kvapky studenej kávy okolo teba plávajú ako temné planéty. Núdzové svetlá pulzujú v pomalom, červenom rytme."
    },
    imagePrompt: "Spaceship interior, zero gravity, floating debris, red emergency lighting, sci-fi horror, minimalism"
  },
  {
    id: 'western',
    title: { en: "Midnight Train", sk: "Polnočný Vlak" },
    description: { en: "A mystery on the rails.", sk: "Záhada na koľajniciach." },
    goal: { en: "Find your ticket before the Conductor arrives.", sk: "Nájdi svoj lístok skôr, než príde Sprievodca." },
    situation: {
      en: "The rhythmic clatter of wheels on tracks wakes you. You are sitting in a velvet armchair in an empty train car. Outside, there is only an endless, grey desert. You check your pockets. They are empty.",
      sk: "Rytmické klepotanie kolies na koľajniciach ťa prebudí. Sedíš v zamatovom kresle v prázdnom vagóne. Vonku je len nekonečná, šedá púšť. Prehľadáš si vrecká. Sú prázdne."
    },
    imagePrompt: "Old train carriage interior, velvet seats, desert outside window, vintage noir, western mystery, ink sketch"
  },
  {
    id: 'forest',
    title: { en: "Whispering Woods", sk: "Šepkajúci Les" },
    description: { en: "Lost in a cursed forest.", sk: " stratený v prekliatom lese." },
    goal: { en: "Retrieve your true name from the Crow King.", sk: "Získaj svoje pravé meno od Kráľa Vrán." },
    situation: {
      en: "The smell of pine and rot fills your nose. You stand in a clearing surrounded by trees that seem to lean closer when you aren't looking. A black feather falls slowly into your open hand.",
      sk: "Vôňa borovice a hniloby ti plní nos. Stojíš na čistinke obklopenej stromami, ktoré sa zdajú nakláňať bližšie, keď sa nedívaš. Čierne pierko pomaly padá do tvojej otvorenej dlane."
    },
    imagePrompt: "Dark ancient forest, trees with faces, mist, black feather, surreal fantasy, etching style"
  },
  {
    id: 'reallife',
    title: { en: "Real Life Simulator", sk: "Simulátor Reálneho Života" },
    description: { en: "Live your life. Make choices. Face consequences.", sk: "Ži svoj život. Rob rozhodnutia. Čeľ následkom." },
    goal: { en: "Define yourself and pursue your own goals.", sk: "Definuj seba a sleduj vlastné ciele." },
    situation: {
      en: "It is January 2026. Before we begin, tell me: Who are you? Describe yourself - your name, age, occupation, where you live, your current situation, and what you want to achieve. The world awaits your story.",
      sk: "Je január 2026. Predtým než začneme, povedz mi: Kto si? Opíš seba - svoje meno, vek, povolanie, kde žiješ, svoju aktuálnu situáciu a čo chceš dosiahnuť. Svet čaká na tvoj príbeh."
    },
    imagePrompt: "Modern city street, people walking, realistic urban scene, morning light, photorealistic style, contemporary, 2026",
    secrets: {
      en: `REAL LIFE SIMULATOR - NARRATOR INSTRUCTIONS:

      MODE: Open-world life simulation set in January 2026.
      
      PHASE 1 - CHARACTER CREATION:
      The player's FIRST message should define who they are. Extract:
      - Name, age, gender
      - Location (city/country)
      - Occupation or student status
      - Living situation (apartment, house, with family, etc.)
      - Financial status (implied or stated)
      - Current goals or desires
      
      If the player doesn't provide enough detail, ask clarifying questions naturally.
      
      PHASE 2 - LIVING SIMULATION:
      Once character is established, simulate realistic daily life:
      
      CURRENT WORLD STATE (January 2026):
      - AI technology is rapidly advancing (ChatGPT, Claude, etc.)
      - Cost of living crisis in many countries
      - Climate change effects visible
      - Social media dominates communication
      - Remote work is common post-pandemic
      - Cryptocurrency market is volatile
      - Geopolitical tensions (Ukraine, Middle East)
      - Electric vehicles becoming mainstream
      
      SIMULATION RULES:
      1. Time passes realistically - actions take time
      2. Money matters - track implied finances
      3. Relationships have consequences
      4. Health (physical/mental) affects capabilities
      5. Random events happen (good and bad)
      6. Career/education paths are realistic
      7. Technology and internet exist and can be used
      8. News and current events can be referenced
      
      REALISM GUIDELINES:
      - No magic or supernatural elements (unless player specifically roleplays that)
      - Consequences are realistic (crime has police, debt has collectors)
      - Social interactions follow real psychology
      - Jobs require skills/qualifications
      - Success requires effort over time
      
      NARRATIVE STYLE:
      - Third person, present tense for scene setting
      - Be descriptive about environments, people, emotions
      - Include small realistic details (weather, time of day, sounds)
      - NPCs have names, personalities, motivations
      
      WIN/LOSE CONDITIONS:
      - WIN: Player explicitly states they've achieved their defined goal
      - LOSE: Only if player dies, gets imprisoned long-term, or becomes completely destitute with no recovery path
      - CONTINUE: Everything else - life goes on
      
      Remember: This is a SANDBOX. There's no predetermined plot. React to player choices realistically.`,
      
      sk: `SIMULÁTOR REÁLNEHO ŽIVOTA - INŠTRUKCIE PRE ROZPRÁVAČA:

      REŽIM: Otvorený svet životnej simulácie zasadený do januára 2026.
      
      FÁZA 1 - TVORBA POSTAVY:
      Prvá správa hráča by mala definovať, kto je. Extrahuj:
      - Meno, vek, pohlavie
      - Lokalita (mesto/krajina)
      - Povolanie alebo študentský status
      - Životná situácia (byt, dom, s rodinou, atď.)
      - Finančný stav (naznačený alebo uvedený)
      - Aktuálne ciele alebo túžby
      
      Ak hráč neposkytne dosť detailov, opýtaj sa prirodzene.
      
      FÁZA 2 - ŽIVOTNÁ SIMULÁCIA:
      Keď je postava vytvorená, simuluj realistický každodenný život:
      
      AKTUÁLNY STAV SVETA (Január 2026):
      - AI technológia rýchlo napreduje (ChatGPT, Claude, atď.)
      - Kríza životných nákladov v mnohých krajinách
      - Účinky klimatických zmien viditeľné
      - Sociálne médiá dominujú komunikácii
      - Práca na diaľku bežná po pandémii
      - Kryptomenový trh volatilný
      - Geopolitické napätia (Ukrajina, Blízky východ)
      - Elektrické vozidlá sa stávajú bežnými
      
      PRAVIDLÁ SIMULÁCIE:
      1. Čas plynie realisticky - akcie trvajú
      2. Peniaze sú dôležité - sleduj financie
      3. Vzťahy majú následky
      4. Zdravie (fyzické/mentálne) ovplyvňuje schopnosti
      5. Náhodné udalosti sa dejú (dobré aj zlé)
      6. Kariérne/vzdelávacie cesty sú realistické
      7. Technológia a internet existujú
      8. Správy a aktuálne udalosti možno referencovať
      
      USMERNENIA PRE REALIZMUS:
      - Žiadna mágia ani nadprirodzené prvky
      - Následky sú realistické
      - Sociálne interakcie sledujú reálnu psychológiu
      - Práce vyžadujú zručnosti/kvalifikácie
      - Úspech vyžaduje úsilie
      
      VÝHRA/PREHRA:
      - VÝHRA: Hráč dosiahol definovaný cieľ
      - PREHRA: Smrť, dlhodobé väzenie, úplná chudoba bez možnosti zotavenia
      - POKRAČOVAŤ: Všetko ostatné`
    }
  }
];

export const INITIAL_CHAR_LIMIT = 50;
export const CHAR_DECREMENT = 3;

export const TEXTS = {
  en: {
    placeholder: "What do you do?",
    voiceCapacity: "Voice Capacity",
    actionRequired: "Action Required",
    capacityReached: "CAPACITY REACHED",
    systemStable: "SYSTEM STABLE",
    processing: "Processing...",
    inventory: "INVENTORY",
    characters: "ENTITIES",
    turn: "TURN",
    status: "STATUS",
    initiate: "[ Initiate Sequence ]",
    win: "GOAL ACHIEVED",
    lose: "SILENCE HAS FALLEN",
    winMsg: "You have escaped the cycle.",
    loseMsg: "The void claims another soul.",
    tryAgain: "TRY AGAIN",
    configuration: "CONFIGURATION",
    initialCapacity: "Initial Voice Capacity",
    entropyRate: "Entropy Rate (Char Loss/Turn)",
    scenario: "SIMULATION SCENARIO",
    selectScenario: "Select Starting Conditions",
    timePressureConfig: "Temporal Instability (Time Limit %)",
    charGiftConfig: "Void Resonance (Recovery %)",
    timerActive: "TEMPORAL COLLAPSE IMMINENT",
    capacityRestored: "CAPACITY RESTORED",
    timeOut: "TIME EXPIRED",
    difficultySelect: "Narrator Personality",
    diffEasy: "Forgiving (Testing)",
    diffNormal: "Balanced",
    diffChallenging: "Challenging (Default)",
    diffHard: "Unforgiving",
    diffJoke: "Absurd / Meta",
    diffDebug: "Debug Mode",
    waitButton: "Observe / Silence",
    shareConfig: "Share Configuration",
    copyLink: "Copy Link",
    copyLinkAutostart: "Copy Link (Auto-start)",
    copyLinkButton: "Copy Link (Button-start)",
    linkCopied: "Link copied!",
    startTheGame: "Start the Game",
    enableNarration: "Voice narration",
    enableSfx: "Sound effects"
  },
  sk: {
    placeholder: "Čo urobíš?",
    voiceCapacity: "Kapacita Hlasu",
    actionRequired: "Vyžaduje sa akcia",
    capacityReached: "KAPACITA DOSIAHNUTÁ",
    systemStable: "SYSTÉM STABILNÝ",
    processing: "Spracúva sa...",
    inventory: "INVENTÁR",
    characters: "BYTOSTI",
    turn: "ŤAH",
    status: "STAV",
    initiate: "[ Spustiť Sekvenciu ]",
    win: "CIEĽ DOSIAHNUTÝ",
    lose: "PADLO TICHO",
    winMsg: "Unikol si z cyklu.",
    loseMsg: "Prázdnota si vzala ďalšiu dušu.",
    tryAgain: "SKÚSIŤ ZNOVU",
    configuration: "KONFIGURÁCIA",
    initialCapacity: "Počiatočná Kapacita Hlasu",
    entropyRate: "Miera Entropie (Strata Znakov/Ťah)",
    scenario: "SCENÁR SIMULÁCIE",
    selectScenario: "Vyber Počiatočné Podmienky",
    timePressureConfig: "Časová Nestabilita (Časový Limit %)",
    charGiftConfig: "Rezonancia Prázdnoty (Obnova %)",
    timerActive: "HROZÍ ČASOVÝ KOLAPS",
    capacityRestored: "KAPACITA OBNOVENÁ",
    timeOut: "ČAS VYPRŠAL",
    difficultySelect: "Osobnosť Rozprávača",
    diffEasy: "Zhovievavá (Testovanie)",
    diffNormal: "Vyvážená",
    diffChallenging: "Náročná (Predvolená)",
    diffHard: "Nemilosrdná",
    diffJoke: "Absurdná / Meta",
    diffDebug: "Debug Režim",
    waitButton: "Pozorovať / Ticho",
    shareConfig: "Zdieľať Konfiguráciu",
    copyLink: "Kopírovať Odkaz",
    copyLinkAutostart: "Kopírovať Odkaz (Auto-štart)",
    copyLinkButton: "Kopírovať Odkaz (Tlačidlo-štart)",
    linkCopied: "Odkaz skopírovaný!",
    startTheGame: "Spustiť Hru",
    enableNarration: "Hlasové rozprávanie",
    enableSfx: "Zvukové efekty"
  }
};