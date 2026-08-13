export type SupportedLanguage = "ja" | "en" | "zh" | "ko";
export type SourceLanguage = "auto" | SupportedLanguage;

export interface TranslationRegion {
  polygon: Array<{ x: number; y: number }>;
  text_polygons?: Array<Array<{ x: number; y: number }>>;
  text: string;
  confidence: number;
  translated_text: string;
}

export interface ImageTranslationResult {
  source_language: SupportedLanguage;
  regions: TranslationRegion[];
  inpainted_image: string | null;
}

export interface TranslateImageMessage {
  type: "translate-image";
  payload: {
    url: string;
    imageData?: string;
    referrer: string;
    sourceLanguage: SourceLanguage;
    targetLanguage: SupportedLanguage;
    quality: "fast" | "ocr" | "balanced";
    inpaint: boolean;
    inpaintMethod: "opencv" | "lama";
  };
}
