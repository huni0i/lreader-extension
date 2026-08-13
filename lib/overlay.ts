import type { ComicImage } from "./images";
import type { TranslationRegion } from "./messages";

const OVERLAY_CLASS = "lreader-translation-overlay";
const CLEAN_IMAGE_CLASS = "lreader-inpainted-image";

function findImageElement(image: ComicImage): HTMLImageElement | null {
  return (
    [...document.images].find((element) => {
      const candidates = [
        element.currentSrc,
        element.src,
        element.getAttribute("data-src"),
        element.getAttribute("data-original"),
        element.getAttribute("data-lazy-src"),
      ];
      return candidates.includes(image.url);
    }) ?? null
  );
}

function fitText(element: HTMLDivElement, initialSize: number): void {
  let fontSize = initialSize;
  element.style.fontSize = `${fontSize}px`;

  while (
    fontSize > 9 &&
    (element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth)
  ) {
    fontSize -= 1;
    element.style.fontSize = `${fontSize}px`;
  }
}

function estimateFontSize(text: string, width: number, height: number): number {
  const glyphCount = Math.max(1, [...text.replace(/\s/g, "")].length);
  const areaBasedSize = Math.sqrt((width * height) / glyphCount) * 0.72;
  const regionLimit = Math.min(42, height * 0.3, width * 0.12);
  return Math.max(10, Math.min(areaBasedSize, regionLimit));
}

interface RegionBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boundsOf(points: Array<{ x: number; y: number }>): RegionBounds {
  return {
    left: Math.min(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}

function selectRegionBounds(region: TranslationRegion): RegionBounds {
  const detected = boundsOf(region.polygon);
  const textPoints = region.text_polygons?.flat() ?? [];
  if (!textPoints.length) return detected;

  const text = boundsOf(textPoints);
  const detectedWidth = detected.right - detected.left;
  const detectedHeight = detected.bottom - detected.top;
  const textWidth = Math.max(1, text.right - text.left);
  const textHeight = Math.max(1, text.bottom - text.top);
  const oversized =
    detectedWidth * detectedHeight > textWidth * textHeight * 8 ||
    detectedWidth > textWidth * 3.5 ||
    detectedHeight > textHeight * 4;
  if (!oversized) return detected;

  const horizontalPadding = Math.max(12, textWidth * 0.28);
  const verticalPadding = Math.max(10, textHeight * 0.22);
  return {
    left: Math.max(detected.left, text.left - horizontalPadding),
    top: Math.max(detected.top, text.top - verticalPadding),
    right: Math.min(detected.right, text.right + horizontalPadding),
    bottom: Math.min(detected.bottom, text.bottom + verticalPadding),
  };
}

export function renderTranslationOverlays(
  image: ComicImage,
  regions: TranslationRegion[],
  inpaintedImage: string | null = null,
): number {
  const imageElement = findImageElement(image);
  if (!imageElement) return 0;

  document
    .querySelectorAll(`.${OVERLAY_CLASS}[data-image-index="${image.index}"]`)
    .forEach((element) => element.remove());
  document
    .querySelectorAll(`.${CLEAN_IMAGE_CLASS}[data-image-index="${image.index}"]`)
    .forEach((element) => element.remove());

  const rect = imageElement.getBoundingClientRect();
  const naturalWidth = imageElement.naturalWidth || image.width;
  const naturalHeight = imageElement.naturalHeight || image.height;
  const scaleX = rect.width / naturalWidth;
  const scaleY = rect.height / naturalHeight;

  if (inpaintedImage) {
    const cleanImage = document.createElement("img");
    cleanImage.className = CLEAN_IMAGE_CLASS;
    cleanImage.dataset.imageIndex = String(image.index);
    cleanImage.src = inpaintedImage;
    cleanImage.alt = "";
    Object.assign(cleanImage.style, {
      position: "absolute",
      left: `${window.scrollX + rect.left}px`,
      top: `${window.scrollY + rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: "2147482999",
      display: "block",
      pointerEvents: "none",
    });
    document.body.append(cleanImage);
  }

  for (const region of regions) {
    const bounds = selectRegionBounds(region);
    const left = window.scrollX + rect.left + bounds.left * scaleX;
    const top = window.scrollY + rect.top + bounds.top * scaleY;
    const width = (bounds.right - bounds.left) * scaleX;
    const height = (bounds.bottom - bounds.top) * scaleY;
    const inset = Math.max(2, Math.min(width, height) * 0.035);
    const innerWidth = Math.max(12, width - inset * 2);
    const innerHeight = Math.max(12, height - inset * 2);
    const padding = Math.max(2, Math.min(innerWidth, innerHeight) * 0.03);

    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.dataset.imageIndex = String(image.index);
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${left + inset}px`,
      top: `${top + inset}px`,
      width: `${innerWidth}px`,
      height: `${innerHeight}px`,
      zIndex: "2147483000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: `${padding}px`,
      borderRadius: "10%",
      background: "transparent",
      color: "#111827",
      fontFamily: '"AppleMyungjo", "Nanum Myeongjo", Georgia, serif',
      fontWeight: "600",
      lineHeight: "1.18",
      letterSpacing: "-0.02em",
      textAlign: "center",
      whiteSpace: "normal",
      overflowWrap: "break-word",
      pointerEvents: "none",
      boxSizing: "border-box",
    });
    overlay.textContent = region.translated_text;
    document.body.append(overlay);

    fitText(
      overlay,
      estimateFontSize(region.translated_text, innerWidth, innerHeight),
    );
  }

  return regions.length;
}
