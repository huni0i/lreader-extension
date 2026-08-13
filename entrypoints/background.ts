import type {
  ImageTranslationResult,
  TranslateImageMessage,
} from "../lib/messages";

const ENGINE_URL = "http://127.0.0.1:8765";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    async (
      message: TranslateImageMessage,
    ): Promise<ImageTranslationResult | { error: string }> => {
      if (message.type !== "translate-image") {
        return { regions: [], inpainted_image: null };
      }

      try {
        const response = await fetch(`${ENGINE_URL}/v1/images/translate-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: message.payload.url,
            referrer: message.payload.referrer,
            source_language: message.payload.sourceLanguage,
            target_language: message.payload.targetLanguage,
            quality: message.payload.quality,
            inpaint: message.payload.inpaint,
            inpaint_method: message.payload.inpaintMethod,
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`엔진 오류 ${response.status}: ${detail}`);
        }

        return (await response.json()) as ImageTranslationResult;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
});
