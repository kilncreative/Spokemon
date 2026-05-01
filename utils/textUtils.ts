// Calculate Levenshtein distance between two strings
// This measures how many single-character edits are required to change one word into the other
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const isFuzzyMatch = (target: string, input: string): boolean => {
    // 1. Normalize: Lowercase and remove all non-alphanumeric characters
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInput = input.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 2. Direct inclusion check (e.g., "The lion" contains "lion")
    if (cleanInput.includes(cleanTarget) || cleanTarget.includes(cleanInput)) return true;
    
    // 3. Levenshtein Distance Check
    const dist = levenshteinDistance(cleanTarget, cleanInput);
    
    // Determine allowed errors based on word length
    // Short words (cat) need strict matching. Long words (elephant) allow for slur/accent.
    let allowedErrors = 0;
    if (cleanTarget.length > 3) allowedErrors = 1;
    if (cleanTarget.length > 6) allowedErrors = 2;
    if (cleanTarget.length > 9) allowedErrors = 3;
    
    return dist <= allowedErrors;
};