// ElevenLabs Text-to-Speech Service
// API Reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Default voice ID - "George" (a clear, narrative voice)
// You can find more voices at: https://elevenlabs.io/docs/api-reference/voices/search
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

// Get API key from environment variables
const getApiKey = () => process.env.ELEVENLABS_API_KEY || '';

interface TextToSpeechOptions {
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}

// Track current audio for stopping
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

/**
 * Stop any currently playing narration
 */
export const stopNarration = (): void => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
};

/**
 * Check if ElevenLabs API key is configured
 */
export const isElevenLabsConfigured = (): boolean => {
  return !!getApiKey();
};

/**
 * Convert text to speech using ElevenLabs API
 * @param text - The text to convert to speech
 * @param options - Optional configuration
 * @returns Audio blob or null if failed
 */
export const textToSpeech = async (
  text: string,
  options: TextToSpeechOptions = {}
): Promise<Blob | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in environment.');
    return null;
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = 'eleven_multilingual_v2',
    outputFormat = 'mp3_44100_128'
  } = options;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/${voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: modelId
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return null;
    }

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
};

/**
 * Play text as speech using ElevenLabs API
 * @param text - The text to speak
 * @param options - Optional configuration
 * @returns Promise that resolves when audio starts playing
 */
export const speakText = async (
  text: string,
  options: TextToSpeechOptions = {}
): Promise<void> => {
  // Stop any current narration first
  stopNarration();

  const audioBlob = await textToSpeech(text, options);
  
  if (!audioBlob) {
    console.error('Failed to generate speech');
    return;
  }

  currentAudioUrl = URL.createObjectURL(audioBlob);
  currentAudio = new Audio(currentAudioUrl);
  
  currentAudio.onended = () => {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
    currentAudio = null;
  };

  await currentAudio.play();
};

/**
 * Narrate game text - cleans up the text and speaks it
 * @param text - The game text to narrate
 */
export const narrateGameText = async (text: string): Promise<void> => {
  if (!isElevenLabsConfigured()) {
    console.log('ElevenLabs not configured, skipping narration');
    return;
  }

  // Clean up text for narration (remove system messages in brackets, etc.)
  let cleanText = text
    .replace(/\[.*?\]/g, '') // Remove text in square brackets
    .replace(/\n{2,}/g, '. ') // Replace multiple newlines with period
    .replace(/\n/g, ' ') // Replace single newlines with space
    .replace(/GOAL:/g, 'Your goal is:') // Make GOAL more natural
    .trim();

  if (cleanText) {
    await speakText(cleanText);
  }
};

/**
 * Simple test function to verify ElevenLabs API is working
 * @returns true if test passed, false otherwise
 */
export const testElevenLabs = async (): Promise<boolean> => {
  console.log('Testing ElevenLabs Text-to-Speech API...');
  
  if (!isElevenLabsConfigured()) {
    console.error('ElevenLabs API key not configured');
    return false;
  }
  
  const testText = "Hello! This is a test of the ElevenLabs text to speech system. If you can hear this, the integration is working correctly.";
  
  try {
    await speakText(testText);
    console.log('ElevenLabs test successful!');
    return true;
  } catch (error) {
    console.error('ElevenLabs test failed:', error);
    return false;
  }
};
