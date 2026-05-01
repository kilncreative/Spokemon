import { ElementType, CreatureState } from "../types";
import { loadAsset, loadConfig, listAssetKeys } from "../utils/db";

// --- CONFIGURATION ---
const DEFAULT_SPECIES: string[] = []; 

// Helper to sanitize element type
const parseElement = (raw: string): ElementType => {
  const normalized = raw.toLowerCase().trim();
  const valid: ElementType[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'normal'];
  if (valid.includes(normalized as ElementType)) return normalized as ElementType;
  
  // Fuzzy mapping
  if (normalized.includes('fire') || normalized.includes('flame')) return 'fire';
  if (normalized.includes('water') || normalized.includes('ice') || normalized.includes('sea')) return 'water';
  if (normalized.includes('grass') || normalized.includes('leaf') || normalized.includes('plant')) return 'grass';
  if (normalized.includes('electric') || normalized.includes('spark') || normalized.includes('volt')) return 'electric';
  if (normalized.includes('psychic') || normalized.includes('magic') || normalized.includes('mind')) return 'psychic';
  
  return 'normal';
};

interface CreatureMetadata {
  name: string;
  element: ElementType;
  description: string;
}

// Fetch and parse the metadata file
const fetchMetadata = async (speciesId: string): Promise<CreatureMetadata> => {
  try {
    const normalizedId = speciesId.toLowerCase();
    
    // Get all files for this species
    const allKeys = await listAssetKeys(`${normalizedId}/`);
    
    // Look for text files
    const textFiles = allKeys.filter(k => k.endsWith('.txt') || k.endsWith('.json'));
    
    // Priority list for metadata filenames
    const priorities = ['info', 'metadata', 'stats', 'data', speciesId];
    
    let targetKey = textFiles.find(k => priorities.some(p => k.includes(p)));
    
    // If no specific match, just take the first text file found
    if (!targetKey && textFiles.length > 0) targetKey = textFiles[0];
    
    let text = "";
    if (targetKey) {
        const asset = await loadAsset(targetKey);
        if (asset instanceof Blob) {
            text = await asset.text();
        } else if (typeof asset === 'string') {
            text = asset;
        }
    }
    
    if (!text) {
        return {
            name: speciesId.charAt(0).toUpperCase() + speciesId.slice(1),
            element: 'normal',
            description: 'A mysterious creature found in your collection.'
        };
    }
    
    // Parse the text file
    const lines = text.split('\n');
    let name = speciesId;
    let element: ElementType = 'normal';
    let description = "A mysterious creature.";

    for (const line of lines) {
        if (line.match(/^Name:/i)) {
            name = line.replace(/^Name:\s*/i, '').trim();
        } else if (line.match(/^Type:/i)) {
            element = parseElement(line.replace(/^Type:\s*/i, '').trim());
        } else if (line.match(/^(Fun Fact|Description):/i)) {
            description = line.replace(/^(Fun Fact|Description):\s*/i, '').trim();
        }
    }

    return { name, element, description };

  } catch (e) {
    console.warn(`Could not load metadata for ${speciesId}.`);
    return {
      name: speciesId.toUpperCase(),
      element: 'normal',
      description: 'Data corrupted. Creature analysis failed.'
    };
  }
};

const resolveImageUrl = async (speciesId: string, stage: number): Promise<string | null> => {
    const validStage = Math.max(1, Math.min(4, stage));
    const normalizedId = speciesId.toLowerCase();

    // 1. Get all files for this species
    const allKeys = await listAssetKeys(`${normalizedId}/`);
    
    // 2. Filter for images
    const imageKeys = allKeys.filter(k => k.match(/\.(png|jpg|jpeg)$/i));
    
    if (imageKeys.length === 0) return null;

    // 3. Find match for stage
    // Strategy: Look for the number '1', '2' etc in the filename. 
    // We prioritize filenames that look like "dragon-1.png" over "11.png" or "dragon.png"
    
    const stageStr = validStage.toString();
    
    // Exactish matches first
    const exactMatches = [
        `${speciesId}-${stageStr}`,
        `${speciesId}${stageStr}`,
        `stage${stageStr}`,
        `stage-${stageStr}`,
        `/${stageStr}.`, // e.g. /1.png
    ];

    let match = imageKeys.find(k => exactMatches.some(p => k.toLowerCase().includes(p.toLowerCase())));
    
    // Loose match: just contains the number (danger of matching "10" for "1")
    if (!match) {
        // Regex to match the digit as a standalone number or at end of string
        // e.g. "dragon1.png", "dragon-1.png", "1.png"
        const regex = new RegExp(`[^0-9]${stageStr}[^0-9]|^${stageStr}[^0-9]|[^0-9]${stageStr}$`);
        match = imageKeys.find(k => {
             // strip extension and path for check
             const baseName = k.split('/').pop()?.split('.')[0] || "";
             return baseName.includes(stageStr); // simplistic fallback
        });
    }

    // Fallback: if requesting stage 1 and we can't find it, return ANY image to prevent broken egg loop
    if (!match && validStage === 1 && imageKeys.length > 0) {
        // Try to find the 'smallest' number image? or just the first one.
        match = imageKeys.sort()[0];
    }

    if (match) {
        const asset = await loadAsset(match);
        if (asset instanceof Blob) {
            return URL.createObjectURL(asset);
        }
    }
    
    return null;
};

// --- PUBLIC API ---

export const getAvailableSpecies = async (): Promise<string[]> => {
    const customSpecies = await loadConfig('customSpeciesList');
    if (Array.isArray(customSpecies) && customSpecies.length > 0) {
        return customSpecies;
    }
    return DEFAULT_SPECIES;
};

export const generateInitialCreature = async (): Promise<{imageUrl: string | null, name: string, description: string, element: ElementType, speciesId: string}> => {
  // Pick random species
  const speciesList = await getAvailableSpecies();

  if (speciesList.length === 0) {
      return {
          imageUrl: null, // Will show egg
          name: "No Data Found",
          description: "Please import a creature zip pack in settings.",
          element: 'normal',
          speciesId: 'unknown'
      };
  }

  const speciesId = speciesList[Math.floor(Math.random() * speciesList.length)];
  
  // Load data
  const meta = await fetchMetadata(speciesId);
  const imageUrl = await resolveImageUrl(speciesId, 1);

  return {
    imageUrl,
    name: meta.name,
    description: meta.description,
    element: meta.element,
    speciesId
  };
};

export const evolveCreature = async (
    currentSpeciesId: string | undefined, 
    currentLevel: number, 
    currentMeta: {name: string, description: string, element: ElementType}
): Promise<{imageUrl: string | null, name: string, description: string, element: ElementType, speciesId: string}> => {
  
  // If we don't know the species (old save?), generate a new one
  if (!currentSpeciesId || currentSpeciesId === 'unknown') {
      return generateInitialCreature();
  }

  const nextStage = Math.min(4, currentLevel + 1);
  const imageUrl = await resolveImageUrl(currentSpeciesId, nextStage);

  return {
    imageUrl,
    name: currentMeta.name,
    description: currentMeta.description,
    element: currentMeta.element,
    speciesId: currentSpeciesId
  };
};

/**
 * Re-generates the Blob URL for a creature's image.
 * This is crucial because Blob URLs are revoked on page refresh.
 */
export const refreshCreatureImage = async (creature: CreatureState): Promise<CreatureState> => {
    if (!creature.speciesId || creature.speciesId === 'unknown') return creature;
    
    // Only resolve if level > 0 (Egg doesn't need image)
    if (creature.level === 0) return creature;

    const newUrl = await resolveImageUrl(creature.speciesId, creature.level);
    
    if (newUrl) {
        return { ...creature, imageUrl: newUrl };
    }
    
    // If resolution fails but we expect an image, we return null, which shows MysticEgg?
    // Or we keep old logic? Better to show Egg than broken image.
    return { ...creature, imageUrl: null };
};