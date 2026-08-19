import type {
  ImageTranslationResult,
  TranslateImageMessage,
} from "../lib/messages";

const ENGINE_URL = "http://100.107.63.5:8765";

function dataUrlToBlob(dataUrl: string): Blob {
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("잘못된 이미지 데이터입니다.");

  const metadata = dataUrl.slice(0, separator);
  const mimeType = metadata.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
  const encoded = dataUrl.slice(separator + 1);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    async (
      message: TranslateImageMessage,
    ): Promise<ImageTranslationResult | { error: string }> => {
      if (message.type !== "translate-image") {
        return { error: "지원하지 않는 확장 프로그램 메시지입니다." };
      }

      try {
        let response: Response;
        if (message.payload.imageData) {
          const image = dataUrlToBlob(message.payload.imageData);
          const body = new FormData();
          body.append("file", image, "comic-image");
          const query = new URLSearchParams({
            source_language: message.payload.sourceLanguage,
            target_language: message.payload.targetLanguage,
            quality: message.payload.quality,
            inpaint: String(message.payload.inpaint),
            inpaint_method: message.payload.inpaintMethod,
          });
          response = await fetch(
            `${ENGINE_URL}/v1/images/translate?${query.toString()}`,
            {
              method: "POST",
              body,
            },
          );
        } else {
          response = await fetch(`${ENGINE_URL}/v1/images/translate-url`, {
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
        }

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
