import { LEGACY_EMBEDDING_FILENAME, MODEL_CONFIGS, WHISPER_CONFIG } from '@/src/infrastructure/downloads/modelConfig';
import { File, Paths } from 'expo-file-system';

/** Deletes the MiniLM file left behind by older versions (semantic memory was removed). */
export async function removeLegacyEmbeddingModel(): Promise<void> {
  const file = new File(Paths.document, 'models', LEGACY_EMBEDDING_FILENAME);
  if (file.exists) {
    await file.delete();
  }
}

/** Removes GGUF and Whisper binaries from the app documents `models/` folder. */
export async function deleteDownloadedModelFiles(): Promise<void> {
  for (const config of MODEL_CONFIGS) {
    const file = new File(Paths.document, 'models', config.filename);
    if (file.exists) {
      await file.delete();
    }
    const partial = new File(Paths.document, 'models', `${config.filename}.part`);
    if (partial.exists) {
      await partial.delete();
    }
  }

  const whisperFile = new File(Paths.document, 'models', WHISPER_CONFIG.filename);
  if (whisperFile.exists) {
    await whisperFile.delete();
  }

  await removeLegacyEmbeddingModel();
}
