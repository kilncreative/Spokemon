

export type PackTheme = 'jungle' | 'ocean' | 'magma' | 'electric' | 'space' | 'robo';

export interface WordPack {
  id: string;
  name: string;
  words: string[];
  theme?: PackTheme;
}

export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'normal';

export interface CreatureState {
  id: string; // Unique ID for storing in collection
  speciesId?: string; // The folder name for local assets (e.g., "dragon")
  level: number;
  imageUrl: string | null;
  name: string;
  element: ElementType; // New field
  description?: string; // New field for flavor text
  history: string[]; // Keep track of previous forms
  potions: number; // New: Number of evolution potions collected
}

export interface GameState {
  currentPackId: string;
  currentWordIndex: number;
  xp: number; // 0 to 100 (Progress to next potion)
  isListening: boolean;
  lastSpokenWord: string;
}

export enum AppView {
  HOME = 'HOME',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS',
  COLLECTION = 'COLLECTION',
  SYNC = 'SYNC',
  CREATURE_DETAILS = 'CREATURE_DETAILS'
}