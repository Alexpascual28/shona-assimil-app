export interface DiffToken {
  text: string;
  type: 'correct' | 'missing' | 'extra';
}

function tokenize(text: string): string[] {
  // Split on whitespace while preserving words
  return text.trim().split(/\s+/).filter(Boolean);
}

function cleanWord(word: string): string {
  // Strip punctuation for comparison
  return word.toLowerCase().replace(/[.,!?:;'"(){}\[\]]/g, '');
}

/**
 * Computes a word-by-word diff between user typed Shona and reference Shona using LCS
 */
export function computeWordDiff(userInput: string, reference: string): {
  tokens: DiffToken[];
  matchRate: number;
} {
  const userWords = tokenize(userInput);
  const refWords = tokenize(reference);

  if (userWords.length === 0) {
    return {
      tokens: refWords.map(w => ({ text: w, type: 'missing' })),
      matchRate: 0
    };
  }

  const m = userWords.length;
  const n = refWords.length;

  // LCS Matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (cleanWord(userWords[i - 1]) === cleanWord(refWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to construct diff
  let i = m;
  let j = n;
  const tokens: DiffToken[] = [];
  let matches = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cleanWord(userWords[i - 1]) === cleanWord(refWords[j - 1])) {
      tokens.unshift({ text: userWords[i - 1], type: 'correct' });
      matches++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: refWords[j - 1], type: 'missing' });
      j--;
    } else if (i > 0) {
      tokens.unshift({ text: userWords[i - 1], type: 'extra' });
      i--;
    }
  }

  const matchRate = n > 0 ? Math.round((matches / n) * 100) : 0;
  return { tokens, matchRate };
}
