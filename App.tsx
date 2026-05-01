import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { WordPack, CreatureState, GameState, AppView, ElementType, PackTheme } from './types';
import { generateInitialCreature, evolveCreature, getAvailableSpecies, refreshCreatureImage } from './services/creatureService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { ProgressBar } from './components/ProgressBar';
import { CreatureDisplay, EvolutionPhase } from './components/CreatureDisplay';
import { PotionBottle } from './components/PotionBottle';
import { saveGameData, loadGameData, saveAsset, saveConfig, loadConfig } from './utils/db';

// --- CONSTANTS ---
const LEVEL_1_WORDS = [
  "a", "in", "run", "the", "you", "and", "hand", "had", "is", "let", 
  "to", "at", "for", "I", "one", "said", "can", "it", "not", "up", 
  "yes", "an", "do", "jump", "look", "make", "down", "go", "out", "so", 
  "two", "find", "my", "no", "red", "see", "come", "funny", "little", "me", 
  "sit", "big", "help", "play", "three", "yellow", "away", "blue", "here", "us"
];

const LEVEL_2_WORDS = [
  "ate", "he", "of", "that", "we", "was", "are", "green", "on", "please", 
  "they", "be", "have", "or", "pretty", "this", "all", "but", "ride", "saw", 
  "what", "about", "like", "she", "under", "black", "into", "made", "ran", "white", 
  "am", "did", "get", "now", "well", "fast", "good", "him", "take", "will", 
  "came", "going", "say", "too", "with", "brown", "does", "eat", "must", "went"
];

const LEVEL_3_WORDS = [
  "again", "each", "from", "may", "stop", "than", "when", "after", "best", "gave", 
  "has", "once", "them", "were", "as", "by", "four", "her", "more", "some", 
  "think", "way", "every", "could", "how", "over", "put", "there", "who", "ask", 
  "five", "just", "long", "read", "then", "want", "any", "give", "his", "new", 
  "open", "sleep", "wish", "also", "fly", "know", "live", "old", "soon", "why"
];

const EVOLUTION_COSTS: Record<number, number> = {
    0: 1, // Egg -> Level 1 needs 1 potion to Hatch
    1: 3, // Level 1 -> 2 needs 3 potions
    2: 5, // Level 2 -> 3 needs 5 potions
    3: 7, // Level 3 -> 4 needs 7 potions
    4: 99 // Max level
};

const INITIAL_PACKS: WordPack[] = [
    {
      id: 'level1',
      name: 'LEVEL 1',
      words: LEVEL_1_WORDS,
      theme: 'jungle'
    },
    { 
      id: 'level2', 
      name: 'LEVEL 2', 
      words: LEVEL_2_WORDS,
      theme: 'electric' 
    },
    { 
      id: 'level3', 
      name: 'LEVEL 3', 
      words: LEVEL_3_WORDS,
      theme: 'space' 
    }
];

// Image Assets for Specific Levels
const PACK_IMAGES: Record<string, string> = {
  'level1': 'https://triune.raummusic.com/img/Level1.png',
  'level2': 'https://triune.raummusic.com/img/Level2.png',
  'level3': 'https://triune.raummusic.com/img/Level3.png',
};
const NEW_PACK_IMAGE = 'https://triune.raummusic.com/img/NewLevel.png';

const ELEMENT_THEMES: Record<ElementType, { bg: string, border: string, icon: string, color: string, cardBg: string, gradient: string, potionColor: 'green'|'blue'|'purple'|'orange' }> = {
  fire: { bg: 'bg-orange-600', border: 'border-orange-700', icon: '🔥', color: 'text-orange-900', cardBg: 'bg-orange-100', gradient: 'from-orange-500 to-red-600', potionColor: 'orange' },
  water: { bg: 'bg-blue-600', border: 'border-blue-700', icon: '💧', color: 'text-blue-900', cardBg: 'bg-blue-100', gradient: 'from-blue-500 to-cyan-600', potionColor: 'blue' },
  grass: { bg: 'bg-green-600', border: 'border-green-700', icon: '🍃', color: 'text-green-900', cardBg: 'bg-green-100', gradient: 'from-green-500 to-emerald-600', potionColor: 'green' },
  electric: { bg: 'bg-yellow-500', border: 'border-yellow-600', icon: '⚡', color: 'text-yellow-900', cardBg: 'bg-yellow-100', gradient: 'from-yellow-400 to-orange-500', potionColor: 'orange' },
  psychic: { bg: 'bg-purple-600', border: 'border-purple-700', icon: '🔮', color: 'text-purple-900', cardBg: 'bg-purple-100', gradient: 'from-purple-500 to-indigo-600', potionColor: 'purple' },
  normal: { bg: 'bg-slate-500', border: 'border-slate-600', icon: '⭐', color: 'text-slate-900', cardBg: 'bg-slate-200', gradient: 'from-slate-400 to-slate-600', potionColor: 'blue' },
};

const THEME_GLOWS: Record<string, string> = {
  jungle: 'shadow-[0_0_30px_rgba(74,222,128,0.6)] hover:shadow-[0_0_40px_rgba(74,222,128,0.8)]', // Green
  electric: 'shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:shadow-[0_0_40px_rgba(250,204,21,0.8)]', // Yellow
  space: 'shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:shadow-[0_0_40px_rgba(168,85,247,0.8)]', // Purple
  ocean: 'shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:shadow-[0_0_40px_rgba(59,130,246,0.8)]', // Blue
  magma: 'shadow-[0_0_30px_rgba(248,113,113,0.6)] hover:shadow-[0_0_40px_rgba(248,113,113,0.8)]', // Red
  robo: 'shadow-[0_0_30px_rgba(148,163,184,0.6)] hover:shadow-[0_0_40px_rgba(148,163,184,0.8)]', // Slate
};

// --- HELPER: PROCESS ZIP ---
const processZipData = async (fileBlob: Blob, onProgress?: (count: number) => void): Promise<string[]> => {
    const zip = new JSZip();
    const content = await zip.loadAsync(fileBlob);
    
    const newSpecies = new Set<string>();
    const entries = Object.values(content.files);
    let processedCount = 0;

    for (const entry of entries) {
        const zipEntry = entry as any;
        if (zipEntry.dir) continue;
        if (zipEntry.name.includes('__MACOSX') || zipEntry.name.includes('.DS_Store')) continue;

        const parts = zipEntry.name.split('/');
        const cleanParts = parts.filter((p: string) => p && p !== '.');
        
        if (cleanParts.length > 0 && cleanParts[0].toLowerCase() === 'creatures') {
            cleanParts.shift();
        }

        let speciesId = '';
        let fileName = '';

        if (cleanParts.length >= 2) {
            speciesId = cleanParts[0].toLowerCase();
            fileName = cleanParts[cleanParts.length - 1].toLowerCase();
        } else if (cleanParts.length === 1) {
            fileName = cleanParts[0].toLowerCase();
            if (fileName.includes('-')) {
                speciesId = fileName.split('-')[0];
            } else if (fileName.match(/[a-z]+/)) {
                const match = fileName.match(/^([a-z]+)/);
                if (match) speciesId = match[1];
                else speciesId = 'unknown';
            } else {
                speciesId = 'unknown';
            }
        } else {
            continue;
        }

        if (!fileName || !speciesId || speciesId === 'unknown') continue;
        if (!fileName.match(/\.(png|jpg|jpeg|txt|json)$/i)) continue;
        
        const dbKey = `${speciesId}/${fileName}`;
        const blob = await zipEntry.async('blob');
        
        await saveAsset(dbKey, blob);
        newSpecies.add(speciesId);
        processedCount++;
        if (onProgress) onProgress(processedCount);
    }
    return Array.from(newSpecies);
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [customSpeciesList, setCustomSpeciesList] = useState<string[]>([]);
  const [view, setView] = useState<AppView>(AppView.HOME);
  
  // Game State
  const [packs, setPacks] = useState<WordPack[]>(INITIAL_PACKS);
  const [creature, setCreature] = useState<CreatureState>({
    id: 'starter',
    speciesId: undefined,
    level: 0, // START AS EGG
    imageUrl: null,
    name: 'Mystery Egg',
    element: 'normal',
    description: 'A mysterious egg waiting to hatch.',
    history: [],
    potions: 0
  });
  const [collection, setCollection] = useState<CreatureState[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentPackId: 'level1',
    currentWordIndex: 0,
    xp: 0,
    isListening: false,
    lastSpokenWord: ''
  });

  // Transient View State
  const [viewingCreature, setViewingCreature] = useState<CreatureState | null>(null);
  const [interactionState, setInteractionState] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Visual Effects State
  const [evolutionPhase, setEvolutionPhase] = useState<EvolutionPhase>('idle');
  const [rewardType, setRewardType] = useState<'potion' | 'evolution' | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState<{title: string, sub: string}>({title: '', sub: ''});
  
  // Transient Input State
  const [newPackName, setNewPackName] = useState('');
  const [newPackWords, setNewPackWords] = useState('');

  // --- INIT & SYNC ---
  useEffect(() => {
    const init = async () => {
      try {
          if (navigator.storage && navigator.storage.persist) {
            await Promise.race([
                navigator.storage.persist(),
                new Promise(r => setTimeout(r, 1000))
            ]);
          }

          const savedPacks = await loadGameData('packs');
          const savedCreature = await loadGameData('creature');
          const savedCollection = await loadGameData('collection');
          const savedGame = await loadGameData('gameState');
          
          let availableSpecies = await getAvailableSpecies();

          // AUTO IMPORT CHECK
          if (!availableSpecies || availableSpecies.length === 0) {
              console.log("No species found. Pre-populating...");
              try {
                  const resp = await fetch('https://triune.raummusic.com/img/creatures.zip');
                  if (resp.ok) {
                      const blob = await resp.blob();
                      const imported = await processZipData(blob);
                      if (imported.length > 0) {
                          await saveConfig('customSpeciesList', imported);
                          availableSpecies = imported;
                      }
                  }
              } catch (err) {
                  console.error("Failed to prepopulate creatures:", err);
              }
          }

          if (savedPacks && savedPacks.length > 0) setPacks(savedPacks);
          
          if (savedCreature) {
              const refreshed = await refreshCreatureImage(savedCreature);
              setCreature(refreshed);
          }
          
          if (savedCollection) {
              const refreshedCollection = await Promise.all(
                  savedCollection.map((c: CreatureState) => refreshCreatureImage(c))
              );
              setCollection(refreshedCollection);
          } else {
              setCollection([]);
          }

          if (savedGame) setGameState(savedGame);
          if (availableSpecies) setCustomSpeciesList(availableSpecies);

      } catch (e) {
          console.error("Initialization error:", e);
      } finally {
          setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    saveGameData('packs', packs);
    saveGameData('creature', creature);
    saveGameData('collection', collection);
    saveGameData('gameState', gameState);
  }, [packs, creature, collection, gameState, isLoading]);

  // --- COMPUTED ---
  const currentPack = packs.find(p => p.id === gameState.currentPackId) || packs[0];
  const currentWord = currentPack.words[gameState.currentWordIndex];
  
  // --- GAMEPLAY HANDLERS ---
  const handlePlayLevel = (packId: string) => {
    setGameState(prev => ({
        ...prev,
        currentPackId: packId,
        currentWordIndex: 0,
        isListening: false
    }));
    setView(AppView.GAME);
  };

  const handleMatch = useCallback(async () => {
    if (interactionState !== 'idle' || evolutionPhase !== 'idle') return;

    setInteractionState('correct');
    
    setTimeout(async () => {
        const xpGain = 17; 
        const nextXp = gameState.xp + xpGain;
        const earnedPotion = nextXp >= 100;
        
        setGameState(prev => ({
          ...prev,
          xp: earnedPotion ? 0 : nextXp,
          currentWordIndex: (prev.currentWordIndex + 1) % currentPack.words.length,
          lastSpokenWord: ''
        }));

        if (earnedPotion) {
             const newPotionCount = (creature.potions || 0) + 1;
             const evolutionCost = EVOLUTION_COSTS[creature.level] || 99;
             const canEvolve = newPotionCount >= evolutionCost;

             setCreature(prev => ({ ...prev, potions: newPotionCount }));

             if (canEvolve) {
                const isHatching = creature.level === 0;
                setEvolutionPhase('charging');
                
                const minChargeTime = new Promise(resolve => setTimeout(resolve, 2500));
                
                const evolutionTask = isHatching 
                    ? generateInitialCreature()
                    : evolveCreature(
                        creature.speciesId, 
                        creature.level, 
                        { name: creature.name, description: creature.description || '', element: creature.element }
                      );

                const [_, evolved] = await Promise.all([minChargeTime, evolutionTask]);

                setEvolutionPhase('flashing');

                setTimeout(() => {
                   setCreature(prevC => ({
                      ...prevC,
                      potions: 0,
                      level: prevC.level + 1,
                      imageUrl: evolved.imageUrl,
                      name: evolved.name,
                      description: evolved.description,
                      element: evolved.element,
                      speciesId: evolved.speciesId,
                      history: prevC.imageUrl ? [...prevC.history, prevC.imageUrl] : prevC.history
                  }));
                  
                  setEvolutionPhase('celebrating');
                  setRewardType('evolution');
                  setOverlayMessage({ 
                      title: isHatching ? 'HATCHED!' : 'EVOLVED!', 
                      sub: isHatching ? `It's a ${evolved.name}!` : `${creature.name} grew stronger!` 
                  });
                  setShowSuccessOverlay(true);

                  setTimeout(() => {
                     setEvolutionPhase('idle');
                     setShowSuccessOverlay(false);
                     setRewardType(null);
                  }, 4000);

                }, 700);

             } else {
                setRewardType('potion');
                setOverlayMessage({ title: 'POTION BREWED!', sub: 'Keep going to evolve!' });
                setShowSuccessOverlay(true);
                setTimeout(() => {
                    setShowSuccessOverlay(false);
                    setRewardType(null);
                }, 2500);
             }
        }
        
        setInteractionState('idle');

    }, 800); 

  }, [interactionState, evolutionPhase, gameState, currentPack.words, creature]);

  const handleMismatch = useCallback((spokenWord: string) => {
    if (interactionState !== 'idle' || evolutionPhase !== 'idle') return;
    setInteractionState('wrong');
    setGameState(prev => ({ ...prev, lastSpokenWord: spokenWord, xp: Math.max(0, prev.xp - 5) }));
    setTimeout(() => setInteractionState('idle'), 500);
  }, [interactionState, evolutionPhase]);

  const handleSkip = useCallback(() => {
    setInteractionState('idle');
    setGameState(prev => ({
        ...prev,
        xp: Math.max(0, prev.xp - 10), // Penalty for skipping
        currentWordIndex: (prev.currentWordIndex + 1) % currentPack.words.length,
        lastSpokenWord: ''
    }));
  }, [currentPack.words.length]);

  const { status, startListening, error: micError } = useSpeechRecognition(
    currentWord,
    handleMatch,
    handleMismatch
  );

  useEffect(() => {
    if (!isLoading && !creature.imageUrl && evolutionPhase === 'idle') {
      if (creature.level > 0 && (!creature.speciesId || creature.speciesId === 'unknown')) {
         setEvolutionPhase('charging'); 
         generateInitialCreature().then(data => {
            setCreature(prev => ({ 
                ...prev, 
                imageUrl: data.imageUrl, 
                name: data.name, 
                description: data.description, 
                element: data.element, 
                speciesId: data.speciesId,
                potions: 0
            }));
            setEvolutionPhase('idle');
         });
      }
    }
  }, [creature.id, isLoading, creature.speciesId, creature.imageUrl, creature.level]);

  // --- ACTIONS ---
  const handleStoreAndNew = () => {
    setCollection(prev => {
      const exists = prev.find(c => c.id === creature.id);
      if (exists) return prev.map(c => c.id === creature.id ? creature : c);
      return [...prev, creature];
    });
    // Reset to Egg (Level 0)
    setCreature({ id: Date.now().toString(), level: 0, imageUrl: null, name: 'Mystery Egg', element: 'normal', description: 'Waiting to hatch...', history: [], speciesId: undefined, potions: 0 });
    setGameState(prev => ({ ...prev, xp: 0 }));
    setView(AppView.GAME);
  };

  const handleOpenDetails = (target: CreatureState) => {
    setViewingCreature(target);
    setView(AppView.CREATURE_DETAILS);
  };

  const handleDeployCreature = (target: CreatureState) => {
    if (target.id === creature.id) {
       setView(AppView.GAME);
       return;
    }
    setCollection(prev => {
        const others = prev.filter(c => c.id !== target.id);
        if (creature.imageUrl) {
            const currentInBox = others.find(c => c.id === creature.id);
            if (!currentInBox) return [...others, creature];
        }
        return others;
    });
    setCreature(target);
    setGameState(prev => ({ ...prev, xp: 0 }));
    setView(AppView.GAME);
  };

  const handleCreatePack = () => {
    if(!newPackName || !newPackWords) return;
    const themes: PackTheme[] = ['ocean', 'electric', 'space', 'robo', 'magma', 'jungle'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const newPack: WordPack = {
      id: Date.now().toString(),
      name: newPackName,
      words: newPackWords.split(/[,\n]/).map(s=>s.trim()).filter(Boolean),
      theme: randomTheme
    };
    setPacks([...packs, newPack]);
    setView(AppView.HOME);
    setNewPackName('');
    setNewPackWords('');
  };

  const handleSaveGame = () => {
      const data = { packs, creature, collection, gameState };
      const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      a.download = `Spokemon_BACKUP_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      alert("BACKUP SECURED!\n\nThis file contains ALL your Images, Packs, and Monsters.\n\nSave it to a safe place (like a Cloud folder)!");
  };

  const handleDownloadImage = (target: CreatureState) => {
    if (!target.imageUrl) return;
    const link = document.createElement('a');
    link.href = target.imageUrl;
    link.download = `Spokemon_${target.name.replace(/\s/g, '_')}_Lvl${target.level}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportStatus('Scanning Zip...');

      try {
        const newSpecies = await processZipData(file, (count) => {
            setImportStatus(`Importing... (${count})`);
        });

        if (newSpecies.length === 0) {
            alert("No valid creature files found. \nSupported: \n- Folder: /Dragon/dragon-1.png\n- Flat: dragon-1.png\n- Supports PNG and JPG");
            return;
        }

        const existingSpecies = await loadConfig('customSpeciesList') || [];
        const updatedList = Array.from(new Set([...existingSpecies, ...newSpecies]));
        await saveConfig('customSpeciesList', updatedList);
        setCustomSpeciesList(updatedList); 
        
        setCreature({ id: Date.now().toString(), level: 0, imageUrl: null, name: 'Mystery Egg', element: 'normal', description: 'Waiting to hatch...', history: [], speciesId: undefined, potions: 0 });
        setGameState(prev => ({ ...prev, xp: 0 }));

        alert(`Success! Imported assets for ${newSpecies.length} species.`);
        
      } catch (err) {
          console.error(err);
          alert('Failed to process Zip file. Check console for details.');
      } finally {
          setIsImporting(false);
          setImportStatus('');
      }
  };

  // --- LOADING ---
  if (isLoading) {
    return <div className="h-[100dvh] w-full bg-blue-900 flex items-center justify-center text-white text-4xl font-retro animate-bounce tracking-widest uppercase">LOADING...</div>;
  }

  // --- SHARED COMPONENTS ---
  const BottomNav = () => (
      <div className="absolute bottom-0 left-0 right-0 h-24 z-50 pointer-events-none flex items-end justify-center">
          <div className="absolute inset-x-0 bottom-0 h-20 bg-slate-900/60 backdrop-blur-xl border-t border-white/30 rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto"></div>
          <div className="relative z-10 w-full max-w-lg flex items-center justify-between px-10 pb-5 pointer-events-auto">
              <button onClick={() => setView(AppView.COLLECTION)} className="group transform transition-transform active:scale-95">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="https://triune.raummusic.com/img/pokeball.png" className="w-14 h-14 drop-shadow-lg relative z-10" alt="Collection" />
                  </div>
              </button>
              <button onClick={() => setView(AppView.HOME)} className="transform transition-transform active:scale-95 -translate-y-4">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-[5px] border-white shadow-[0_5px_20px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.4)] flex items-center justify-center">
                     <div className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-300 to-blue-500 border-2 border-blue-300/50 flex items-center justify-center shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white drop-shadow-md">
                            <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.632 8.632a.75.75 0 0 1 1.06 0l.93 1.287a.75.75 0 0 1-1.135.845l-8.47-5.929a.75.75 0 0 0-.87 0l-8.468 5.929a.75.75 0 0 1-1.135-.845l.928-1.287L11.47 3.84Z" />
                            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
                        </svg>
                     </div>
                 </div>
              </button>
              <button onClick={() => setView(AppView.SETTINGS)} className="group transform transition-transform active:scale-95">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="https://triune.raummusic.com/img/disk.png" className="w-14 h-14 drop-shadow-lg relative z-10" alt="Save" />
                  </div>
              </button>
          </div>
      </div>
  );

  // --- HOME VIEW ---
  if (view === AppView.HOME) {
     return (
        <div className="relative w-full h-[100dvh] max-w-lg mx-auto bg-slate-900 flex flex-col items-center p-6 overflow-hidden">
            
            {/* Background Layer (Forest) - Darker than Game */}
            <div className="absolute inset-0 z-0 pointer-events-none">
               <img 
                  src="https://triune.raummusic.com/img/forestBackground.jpeg" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40" 
                  alt="Forest Background"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/20 to-slate-900/90"></div>
            </div>

            {/* Logo Area */}
            <div className="relative z-10 mt-8 mb-4 flex flex-col items-center shrink-0">
                 <img src="https://triune.raummusic.com/img/spokemonLogo.png" alt="Spokemon" className="w-64 drop-shadow-[0_0_25px_rgba(59,130,246,0.5)] animate-float" />
            </div>

            {/* Level Selector - VERTICAL SCROLL with IMAGES */}
            <div className="relative z-10 w-full flex-1 min-h-0 overflow-y-auto no-scrollbar px-10">
               <div className="min-h-full flex flex-col items-center justify-center py-10 pb-32 space-y-8">
                 {packs.map(pack => {
                    const imageSrc = PACK_IMAGES[pack.id] || NEW_PACK_IMAGE;
                    const glowStyle = THEME_GLOWS[pack.theme || 'jungle'] || THEME_GLOWS['jungle'];

                    return (
                      <button 
                          key={pack.id} 
                          onClick={() => handlePlayLevel(pack.id)}
                          className={`w-auto mx-auto min-w-[280px] max-w-xs transition-all duration-300 active:scale-95 hover:scale-105 rounded-[32px] ${glowStyle}`}
                      >
                           <img 
                              src={imageSrc} 
                              alt={pack.name} 
                              className="w-full rounded-[32px] block"
                           />
                      </button>
                    );
                 })}
               </div>
            </div>
            
            <BottomNav />
        </div>
     );
  }

  // --- COLLECTION VIEW ---
  if (view === AppView.COLLECTION) {
      return (
        <div className="relative w-full h-[100dvh] max-w-lg mx-auto bg-slate-900 flex flex-col">
            <div className="p-6 pb-2 flex justify-between items-center bg-slate-800/50 backdrop-blur-md z-10 border-b border-white/10">
                <button onClick={() => setView(AppView.HOME)} className="text-white p-2 bg-white/10 rounded-full">←</button>
                <h2 className="text-white font-retro text-xl">BOX 1</h2>
                <div className="w-10"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3 content-start">
                 {/* Active Creature First */}
                 <div onClick={() => handleOpenDetails(creature)} className="aspect-square bg-slate-800 rounded-xl border-2 border-green-500 relative overflow-hidden cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                      <div className="absolute top-1 left-1 bg-green-500 text-[8px] font-bold text-black px-1 rounded">ACTIVE</div>
                      {creature.imageUrl ? (
                          <img src={creature.imageUrl} className="w-full h-full object-contain p-2" style={{imageRendering:'pixelated'}}/>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🥚</div>
                      )}
                      <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] text-center py-1 truncate px-1">{creature.name}</div>
                 </div>

                 {/* Storage */}
                 {collection.map(c => (
                     <div key={c.id} onClick={() => handleOpenDetails(c)} className="aspect-square bg-slate-800 rounded-xl border border-slate-700 relative overflow-hidden cursor-pointer hover:border-blue-400 transition-colors">
                        {c.imageUrl ? (
                            <img src={c.imageUrl} className="w-full h-full object-contain p-2" style={{imageRendering:'pixelated'}}/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🥚</div>
                        )}
                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] text-center py-1 truncate px-1">{c.name}</div>
                     </div>
                 ))}

                 {/* Empty Slots */}
                 {Array.from({length: Math.max(0, 15 - collection.length - 1)}).map((_,i) => (
                     <div key={`empty-${i}`} className="aspect-square bg-slate-800/30 rounded-xl border border-slate-800 flex items-center justify-center opacity-50">
                         <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                     </div>
                 ))}
            </div>
            <BottomNav />
        </div>
      );
  }

  // --- SETTINGS VIEW ---
  if (view === AppView.SETTINGS) {
      return (
        <div className="relative w-full h-[100dvh] max-w-lg mx-auto bg-slate-900 flex flex-col p-6 text-white">
            <h2 className="text-2xl font-retro mb-8 text-center text-blue-400">SETTINGS</h2>
            
            <div className="space-y-6">
                {/* Pack Creator */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-bold mb-3 text-orange-400 flex items-center gap-2">
                        <span>📦</span> CREATE WORD PACK
                    </h3>
                    <input 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 mb-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        placeholder="Pack Name (e.g. 'Dino Names')"
                        value={newPackName}
                        onChange={(e) => setNewPackName(e.target.value)}
                    />
                    <textarea 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 mb-3 h-24 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        placeholder="Words separated by commas..."
                        value={newPackWords}
                        onChange={(e) => setNewPackWords(e.target.value)}
                    />
                    <button 
                        onClick={handleCreatePack}
                        disabled={!newPackName || !newPackWords}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        ADD PACK
                    </button>
                </div>

                {/* Import */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <span>💾</span> IMPORT CREATURES
                    </h3>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".zip"
                            onChange={handleZipImport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center ${isImporting ? 'animate-pulse' : ''}`}>
                            {isImporting ? importStatus : "Tap to upload .ZIP file"}
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Zip should contain images (e.g., "Dragon/1.png") or be flat ("dragon-1.png").
                    </p>
                </div>

                {/* Data Management */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                     <h3 className="font-bold mb-3 text-red-400">DATA & SAVES</h3>
                     <button onClick={handleSaveGame} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg mb-3">
                         BACKUP SAVE FILE
                     </button>
                     <button onClick={() => {
                         if(confirm("Start fresh? This deletes your current progress but keeps your collection.")) {
                             handleStoreAndNew();
                         }
                     }} className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-bold py-3 rounded-lg">
                         HATCH NEW EGG
                     </button>
                </div>
            </div>
            
            <BottomNav />
        </div>
      );
  }

  // --- CREATURE DETAILS VIEW ---
  if (view === AppView.CREATURE_DETAILS && viewingCreature) {
      const theme = ELEMENT_THEMES[viewingCreature.element] || ELEMENT_THEMES['normal'];
      
      return (
        <div className={`relative w-full h-[100dvh] max-w-lg mx-auto bg-slate-900 flex flex-col ${theme.bg}`}>
             {/* Header */}
             <div className="p-4 flex justify-between items-center z-10">
                 <button onClick={() => setView(AppView.HOME)} className="bg-black/20 text-white p-2 rounded-full backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                 </button>
                 <div className="font-retro text-white tracking-widest opacity-50">DATADEX</div>
                 <button onClick={() => handleDownloadImage(viewingCreature)} className="bg-black/20 text-white p-2 rounded-full backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                 </button>
             </div>

             {/* Illustration */}
             <div className="flex-1 flex flex-col items-center justify-center relative -mt-10">
                 <div className="text-[200px] absolute opacity-10 blur-xl select-none">{theme.icon}</div>
                 {viewingCreature.imageUrl ? (
                     <img 
                        src={viewingCreature.imageUrl} 
                        className="w-72 h-72 object-contain drop-shadow-2xl z-10 animate-float"
                        style={{imageRendering:'pixelated'}}
                     />
                 ) : (
                     <div className="text-9xl z-10 animate-float">🥚</div>
                 )}
             </div>

             {/* Card Info */}
             <div className="bg-white rounded-t-[40px] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-pop">
                  <div className="flex justify-between items-end mb-4">
                      <div>
                          <div className={`font-bold text-sm uppercase tracking-wider mb-1 ${theme.color} opacity-60`}>
                             {viewingCreature.element} TYPE
                          </div>
                          <h1 className="text-4xl font-retro text-slate-800 leading-none">{viewingCreature.name}</h1>
                      </div>
                      <div className="text-4xl font-black text-slate-200">
                          Lv.{viewingCreature.level}
                      </div>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-4 mb-6 text-slate-600 italic leading-relaxed border-l-4 border-slate-300">
                      "{viewingCreature.description || "No data available."}"
                  </div>
                  
                  {/* Action Button */}
                  <button 
                    onClick={() => handleDeployCreature(viewingCreature)}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all
                        ${viewingCreature.id === creature.id 
                            ? 'bg-slate-400 cursor-default' 
                            : `bg-gradient-to-r ${theme.gradient}`
                        }
                    `}
                  >
                      {viewingCreature.id === creature.id ? "CURRENTLY DEPLOYED" : "CHOOSE PARTNER"}
                  </button>
             </div>
        </div>
      );
  }

  // --- GAME VIEW ---
  if (view === AppView.GAME) {
    const cardStyles = interactionState === 'correct' 
      ? 'border-green-500 bg-green-50 scale-105 shadow-[0_0_40px_rgba(34,197,94,0.4)] ring-4 ring-green-200' 
      : interactionState === 'wrong'
      ? 'border-red-500 bg-red-50 animate-shake shadow-[0_0_40px_rgba(239,68,68,0.4)] ring-4 ring-red-200'
      : 'border-slate-200 bg-white shadow-[0_12px_0_#cbd5e1]'; // Thicker 3D border

    const textStyles = interactionState === 'correct' 
      ? 'text-green-600' 
      : interactionState === 'wrong'
      ? 'text-red-600'
      : 'text-slate-800';

    const evolutionCost = EVOLUTION_COSTS[creature.level] || 99;
    const potionTheme = ELEMENT_THEMES[creature.element]?.potionColor || 'blue';
    const isBusy = evolutionPhase !== 'idle';

    return (
      <div className="relative w-full h-[100dvh] max-w-lg mx-auto md:rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans select-none bg-slate-900">
        
        {/* FLASH OVERLAY (For Evolution) */}
        {evolutionPhase === 'flashing' && (
           <div className="absolute inset-0 z-[60] bg-white animate-flash pointer-events-none"></div>
        )}

        {/* REWARD/EVOLUTION MODAL (Sunburst) */}
        {showSuccessOverlay && (
           <div className="absolute inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]"></div>
              
              {/* Spinning Sunburst Background */}
              <div className={`absolute inset-0 bg-sunburst animate-spin-slow opacity-20 ${rewardType === 'evolution' ? 'text-yellow-400' : 'text-blue-400'}`}></div>

              <div className="relative z-10 flex flex-col items-center animate-pop">
                 <div className="text-8xl mb-4 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                    {rewardType === 'evolution' ? '⚡' : <PotionBottle color={potionTheme} className="w-32 h-32" />}
                 </div>
                 <div className="text-white text-3xl md:text-5xl font-retro uppercase tracking-wider mb-2 drop-shadow-lg text-center leading-relaxed">
                    {overlayMessage.title}
                 </div>
                 <div className="text-blue-200 text-sm md:text-xl font-bold bg-blue-900/50 px-4 py-1 rounded-full border border-blue-500/30">
                    {overlayMessage.sub}
                 </div>
              </div>
           </div>
        )}

        {/* Background Layer (Forest) */}
        <div className="absolute inset-0 z-0 bg-slate-900">
           <img 
              src="https://triune.raummusic.com/img/forestBackground.jpeg" 
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              alt="Forest Background"
           />
           {/* Vertical gradient to darken top/bottom for legibility */}
           <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-transparent to-slate-900/90"></div>
        </div>

        {/* Header - Fixed Height */}
        <div className="relative z-10 px-6 py-4 flex justify-between items-center h-28 shrink-0">
             {/* Back */}
             <button onClick={() => setView(AppView.HOME)} className="bg-white/10 backdrop-blur-md border border-white/30 rounded-full p-2.5 text-white hover:bg-white/20 transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
             </button>
             
             <img 
               src="https://triune.raummusic.com/img/spokemonLogo.png" 
               alt="Spokemon" 
               className="h-20 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]" 
             />

             {/* Details */}
             <button onClick={() => handleOpenDetails(creature)} className="bg-white/10 backdrop-blur-md border border-white/30 rounded-full p-2.5 text-white hover:bg-white/20 transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
             </button>
        </div>

        {/* Content Container - Flex layout with better distribution */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pb-6 w-full min-h-0 justify-between">
            
            {/* 1. Word Card Area - Primary Focus */}
            <div className="mt-4 shrink-0 w-full">
                <div className={`w-full bg-white rounded-3xl p-10 flex flex-col items-center justify-center relative transition-all duration-300 border-b-[8px] min-h-[14rem] ${cardStyles}`}>
                   <h1 className={`text-6xl md:text-8xl font-sans font-black tracking-tight text-center drop-shadow-sm ${textStyles}`}>
                        {isBusy ? "..." : currentWord}
                   </h1>
                   
                   {/* Skip button inside card to clear up outside UI */}
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                      disabled={isBusy}
                      className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 active:scale-95 transition-colors"
                   >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
                      </svg>
                   </button>
                </div>
            </div>

            {/* 2. Creature Stage Area - Constrained Size */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full h-auto min-h-0">
               {/* Name Tag */}
               <div className={`
                    bg-slate-900/80 backdrop-blur-xl px-4 py-1.5 rounded-xl 
                    text-white font-retro text-xs md:text-base tracking-widest border border-white/20 shadow-lg 
                    mb-2 transform -rotate-2 shrink-0
                    ${evolutionPhase === 'charging' ? 'opacity-0' : 'opacity-100 transition-opacity'}
               `}>
                  {creature.name}
               </div>

               {/* Creature Image Container - Max Height Restricted */}
               <div className="relative w-full flex items-center justify-center max-h-[30vh]">
                   <CreatureDisplay 
                       imageUrl={creature.imageUrl}
                       level={creature.level}
                       evolutionPhase={evolutionPhase}
                       onClick={() => handleOpenDetails(creature)}
                   />
                   {/* Ground Shadow */}
                   <div className="absolute -bottom-2 w-32 h-4 bg-black/40 rounded-[100%] blur-xl z-0 pointer-events-none"></div>
               </div>
            </div>

            {/* 3. Bottom Controls */}
            <div className="shrink-0 flex flex-col items-center gap-4">
                
                {/* Potions & Progress Wrapper */}
                <div className="w-full flex flex-col gap-2">
                    <div className="flex justify-center">
                        <div className={`flex gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg transition-opacity duration-500 ${isBusy ? 'opacity-0' : 'opacity-100'}`}>
                            {Array.from({ length: evolutionCost }).map((_, i) => (
                                <PotionBottle 
                                key={i} 
                                color={i < creature.potions ? potionTheme : 'empty'} 
                                className="w-6 h-6 drop-shadow-md"
                                />
                            ))}
                        </div>
                    </div>
                    <div className={`${isBusy ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
                        <ProgressBar xp={gameState.xp} />
                    </div>
                </div>

                {/* Mic Button */}
                <div className="relative flex flex-col items-center justify-end h-20">
                   <button
                      onClick={startListening}
                      disabled={status === 'listening' || status === 'connecting' || isBusy}
                      className={`
                         w-16 h-16 rounded-full border-[5px] border-white/10 bg-clip-padding backdrop-filter backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.4)]
                         flex items-center justify-center transition-all duration-300 transform
                         ${(status === 'listening' || status === 'connecting') && !isBusy
                            ? 'bg-red-500 scale-110 ring-4 ring-red-500/30' 
                            : isBusy
                            ? 'bg-slate-500 opacity-50 cursor-not-allowed'
                            : 'bg-blue-500 hover:scale-105 active:scale-95 ring-4 ring-blue-500/30'}
                      `}
                   >
                      {isBusy ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white drop-shadow-lg">
                          <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                          <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.509l-.24 3.005a.75.75 0 0 1-1.5 0l-.24-3.005A6.751 6.751 0 0 1 5.25 12.75v-1.5a.75.75 0 0 1 .75-.75Z" />
                        </svg>
                      )}
                   </button>
                   
                   {/* Status Label */}
                   <div className="absolute -bottom-2 font-bold text-white text-[9px] uppercase tracking-[0.2em] drop-shadow-lg bg-black/60 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap">
                      {status === 'connecting' ? 'Connecting...' : (
                        micError ? micError : (
                          status === 'listening' && !isBusy ? 'Listening...' : (
                            isBusy ? 'Thinking...' : 'Tap to Start'
                          )
                        )
                      )}
                   </div>
                </div>
            </div>

        </div>
      );
  }

  // Fallback if no view matches
  return null;
}