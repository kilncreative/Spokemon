import { GoogleGenAI } from "@google/genai";
import { ElementType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';

// Helper to convert base64 to data URL
const toDataUrl = (base64: string, mimeType: string = 'image/png') => 
  `data:${mimeType};base64,${base64}`;

// Helper to clean base64 for API
const cleanBase64 = (dataUrl: string) => dataUrl.replace(/^data:image\/\w+;base64,/, "");

// --- IMPROVED BACKGROUND REMOVAL (FLOOD FILL) ---
const removeWhiteBackground = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(toDataUrl(base64)); 
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      
      // Configuration
      const threshold = 50; // Distance from white (0-441). 50 is conservative but good.
      const targetR = 255;
      const targetG = 255;
      const targetB = 255;

      // Iterative DFS to avoid stack overflow on recursion
      // Start from 4 corners
      const stack: number[] = [
        0,                 // Top-left
        width - 1,         // Top-right
        (height - 1) * width, // Bottom-left
        (height * width) - 1  // Bottom-right
      ];

      const visited = new Uint8Array(width * height);
      
      while (stack.length > 0) {
        const pixelIndex = stack.pop()!;
        
        if (visited[pixelIndex]) continue;
        visited[pixelIndex] = 1;
        
        const dataIndex = pixelIndex * 4;
        const r = data[dataIndex];
        const g = data[dataIndex + 1];
        const b = data[dataIndex + 2];
        
        // Calculate Euclidean distance from pure white
        const dist = Math.sqrt(
          (targetR - r) ** 2 + 
          (targetG - g) ** 2 + 
          (targetB - b) ** 2
        );

        // If this pixel is "white enough" (background)
        if (dist < threshold) {
          // Make Transparent
          data[dataIndex + 3] = 0; 

          // Add neighbors to stack
          const x = pixelIndex % width;
          const y = Math.floor(pixelIndex / width);

          if (x > 0) stack.push(pixelIndex - 1); // Left
          if (x < width - 1) stack.push(pixelIndex + 1); // Right
          if (y > 0) stack.push(pixelIndex - width); // Up
          if (y < height - 1) stack.push(pixelIndex + width); // Down
        }
      }
      
      // Optional: Second pass to clean up semi-transparent edges ("halos")
      // Loop through all pixels, if adjacent to transparency and very light, reduce opacity
      // For now, the flood fill is usually cleaner for pixel/cartoon art.
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(toDataUrl(base64));
    img.src = toDataUrl(base64);
  });
};

// Generate Name and Description based on the image
const generateCreatureDetails = async (imageBase64: string): Promise<{name: string, description: string, element: ElementType}> => {
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          { text: 'You are a Pokedex. Analyze this creature. Give it a creative, unique Pokemon-style name, a 10-word flavor text, and determine its Element Type (fire, water, grass, electric, psychic, or normal). Return ONLY raw JSON: { "name": "...", "description": "...", "element": "fire" }' }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });
    
    const text = response.text || "{}";
    const json = JSON.parse(text);
    return {
      name: json.name || "Unknown",
      description: json.description || "A mysterious creature.",
      element: (json.element || "normal").toLowerCase() as ElementType
    };
  } catch (e) {
    console.error("Name gen failed", e);
    return { name: "Unknown Species", description: "A mysterious creature found in the wild.", element: 'normal' };
  }
};

export const generateInitialCreature = async (): Promise<{imageUrl: string, name: string, description: string, element: ElementType}> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            text: 'Create a pokemon style creature. IMPORTANT: The background must be SOLID PURE WHITE (#FFFFFF). No shadows, no gradients, no scenery. Just the character centered on flat white. Make the baby version or the first stage of evolution. Make it look like a Fire, Water, Grass, Electric, or Psychic type.',
          },
        ],
      },
    });

    let rawBase64 = "";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        rawBase64 = part.inlineData.data;
        break;
      }
    }

    if (!rawBase64) throw new Error("No image generated");

    // Remove background and get details
    const [imageUrl, details] = await Promise.all([
        removeWhiteBackground(rawBase64),
        generateCreatureDetails(rawBase64)
    ]);

    return {
      imageUrl,
      name: details.name,
      description: details.description,
      element: details.element
    };

  } catch (error) {
    console.error("Failed to generate creature:", error);
    return { 
      imageUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/1.svg", 
      name: "Glitchmon", 
      description: "A wild glitch appeared.",
      element: 'normal'
    }; 
  }
};

export const evolveCreature = async (currentImageBase64: string): Promise<{imageUrl: string, name: string, description: string, element: ElementType}> => {
  try {
    const base64Data = cleanBase64(currentImageBase64);

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            text: 'Role You are an expert Pokemon Concept Artist and Evolutionary Biologist Task Analyze the attached input image of a creature determine its current evolutionary stage based on the 5 Stage Taxonomy below and generate an image of its immediate next evolutionary stage Phase 1 The 5 Stage Taxonomy Reference these definitions to classify the input 1 Baby Stage Small rounded head large cute eyes stubby limbs looks weak innocent 2 Basic Stage The standard wild form Proportioned like a typical animal creature capable but not armored 3 Stage 1 The Teenager Larger size angrier sharper eyes the sugar to spice shift developed claws fangs signs of emerging elemental powers 4 Stage 2 Final Form Massive complex design highly angular heavy armor weaponry fully developed elemental features like wings cannons flames 5 Mega G Max Exaggerated features floating distinct energy auras hyper detailed Phase 2 Analysis and Logic Step A Look at the input image Analyze its complexity eye shape and body proportions Step B Identify the current stage Step C Select the Target Output Stage using this logic IF input is Baby generate Basic Stage Growth Less round more defined limbs slightly tougher IF input is Basic generate Stage 1 Growth Angrier eyes distinctive horn spike fin growth potential shift to bipedal posture IF input is Stage 1 generate Stage 2 Growth Significant size increase heavy armor weaponry complex facial features maximum elemental display IF input is Stage 2 generate Mega Evolution Growth Exaggerated spikes fur glowing energy burst mode aesthetic Phase 3 Generation Parameters Generate the Target Output Stage adhering to these strict constraints 1 Aesthetic Consistency You MUST retain the exact drawing style linework thickness and rendering technique of the input image 2 Color Palette Use the exact same color palette as the input but you may darken or saturate specific accents to indicate maturity 3 Biological Consistency The Eyes If moving up a stage apply the Sugar to Spice rule eyes become narrower sharper fiercer The Body Increase complexity example Simple skin becomes Scales Plates Smooth becomes Spiked The Element If the creature has an elemental feature fire leaf water make it physically larger and more volatile Action Based on the image provided generate the SINGLE NEXT STAGE of this creature now CRITICAL: Use a SOLID PURE WHITE BACKGROUND (#FFFFFF). No shadows or effects on background. Maintain color palette.',
          },
        ],
      },
    });

    let rawBase64 = "";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        rawBase64 = part.inlineData.data;
        break;
      }
    }
    
    if (!rawBase64) throw new Error("No image generated");

    // Remove background and get details
    const [imageUrl, details] = await Promise.all([
        removeWhiteBackground(rawBase64),
        generateCreatureDetails(rawBase64)
    ]);

    return {
        imageUrl,
        name: details.name,
        description: details.description,
        element: details.element
    };
    
  } catch (error) {
    console.error("Failed to evolve creature:", error);
    return { imageUrl: currentImageBase64, name: "Stunted Evolution", description: "It refused to evolve.", element: 'normal' };
  }
};