import { MODEL_CONFIGS, WHISPER_CONFIG } from '@/src/infrastructure/downloads/modelConfig';
import { File, Paths } from 'expo-file-system';

/** Removes GGUF and Whisper binaries from the app documents `models/` folder. */
export async function deleteDownloadedModelFiles(): Promise<void> {
  for (const config of MODEL_CONFIGS) {
    const file = new File(Paths.document, 'models', config.filename);
    if (file.exists) {
      await file.delete();
    }
  }

  const whisperFile = new File(Paths.document, 'models', WHISPER_CONFIG.filename);
  if (whisperFile.exists) {
    await whisperFile.delete();
  }
}
