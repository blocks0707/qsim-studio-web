// AI Provider abstraction — pluggable LLM backends

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIContext {
  /** Current editor code */
  code?: string;
  /** Programming language */
  language?: string;
  /** Last simulation result (counts) */
  result?: Record<string, number>;
  /** Last error message */
  error?: string;
  /** Circuit info from dry-run */
  circuit?: {
    numQubits: number;
    numBits: number;
    gates: { name: string; qubits: number[] }[];
  };
}

export interface AIStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export interface AIProviderConfig {
  apiUrl: string;
  apiToken: string;
  model?: string;
  /** Provider-specific options */
  [key: string]: unknown;
}

export interface AIProvider {
  readonly name: string;

  /**
   * Send a message and stream the response.
   * Returns an AbortController to cancel the stream.
   */
  chat(
    messages: AIMessage[],
    context: AIContext,
    callbacks: AIStreamCallbacks,
  ): AbortController;

  /** Check if the provider is configured and reachable */
  healthCheck(): Promise<boolean>;
}

/** Action the AI suggests to perform on the editor */
export interface AIAction {
  type: "insert" | "replace" | "explain";
  /** Code to insert or replace */
  code?: string;
  /** Explanation text */
  explanation?: string;
}

/**
 * Parse code blocks from AI response.
 * Returns the first ```python or ``` block found.
 */
export function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:python|qasm)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
