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
    const xs = region.polygon.map((point) => point.x);
    const ys = region.polygon.map((point) => point.y);
    const left = window.scrollX + rect.left + Math.min(...xs) * scaleX;
    const top = window.scrollY + rect.top + Math.min(...ys) * scaleY;
    const width = (Math.max(...xs) - Math.min(...xs)) * scaleX;
    const height = (Math.max(...ys) - Math.min(...ys)) * scaleY;
    const padding = Math.max(3, Math.min(width, height) * 0.04);

    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.dataset.imageIndex = String(image.index);
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${left - padding}px`,
      top: `${top - padding}px`,
      width: `${width + padding * 2}px`,
      height: `${height + padding * 2}px`,
      zIndex: "2147483000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: `${padding}px`,
      borderRadius: "10%",
      background: inpaintedImage ? "transparent" : "rgba(255, 255, 255, 0.98)",
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

    const sourceLineCount = Math.max(1, region.text.split(/\r?\n/).length);
    fitText(overlay, Math.max(11, height / (sourceLineCount * 1.2)));
  }

  return regions.length;
}
