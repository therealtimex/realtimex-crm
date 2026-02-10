import { SSEEvent } from "./types";

/**
 * Parses Server-Sent Events (SSE) stream with proper buffering
 * Handles incomplete chunks that may split mid-line or mid-JSON
 */
export class SSEStreamParser {
  private buffer: string = "";

  /**
   * Process a chunk of data from the stream
   * Returns array of parsed events
   */
  processChunk(chunk: string): SSEEvent[] {
    const events: SSEEvent[] = [];

    // Add chunk to buffer
    this.buffer += chunk;

    // Split by newlines but keep the last incomplete line
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          const event = JSON.parse(jsonStr) as SSEEvent;
          events.push(event);
        } catch (error) {
          console.warn("[SSEParser] Failed to parse event:", line, error);
          // Log parse errors but continue processing other events
        }
      }
    }

    return events;
  }

  /**
   * Flush any remaining data in buffer (call when stream ends)
   */
  flush(): SSEEvent[] {
    if (!this.buffer.trim()) return [];

    const events: SSEEvent[] = [];
    if (this.buffer.startsWith("data: ")) {
      try {
        const jsonStr = this.buffer.slice(6);
        const event = JSON.parse(jsonStr) as SSEEvent;
        events.push(event);
      } catch (error) {
        console.warn(
          "[SSEParser] Failed to parse final buffer:",
          this.buffer,
          error,
        );
      }
    }

    this.buffer = "";
    return events;
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.buffer = "";
  }
}

/**
 * Reads a streaming response with timeout and proper error handling
 */
export async function readStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  options: {
    timeout?: number;
    onError?: (error: Error) => void;
  } = {},
): Promise<void> {
  const { timeout = 300000, onError } = options; // 5 min default timeout

  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEStreamParser();

  // Setup timeout
  const timeoutId = setTimeout(() => {
    reader.cancel("Timeout");
  }, timeout);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // Process any remaining buffered data
        const finalEvents = parser.flush();
        finalEvents.forEach(onEvent);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const events = parser.processChunk(chunk);
      events.forEach(onEvent);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (onError) {
      onError(err);
    } else {
      throw err;
    }
  } finally {
    clearTimeout(timeoutId);
    parser.reset();
  }
}
