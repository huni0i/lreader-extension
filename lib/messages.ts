export type SupportedLanguage = "ja" | "en" | "zh" | "ko";

export interface TranslationRegion {
  polygon: Array<{ x: number; y: number }>;
  text_polygons?: Array<Array<{ x: number; y: number }>>;
  text: string;
  confidence: number;
  translated_text: string;
}

export interface ImageTranslationResult {
  regions: TranslationRegion[];
  inpainted_image: string | null;
}

export interface TranslateImageMessage {
  type: "translate-image";
  payload: {
    url: string;
    referrer: string;
    sourceLanguage: SupportedLanguage;
    targetLanguage: SupportedLanguage;
    quality: "fast" | "balanced";
    inpaint: boolean;
    inpaintMethod: "opencv" | "lama";
  };
}
