export interface ComicImage {
  index: number;
  url: string;
  width: number;
  height: number;
  top: number;
}

const IMAGE_ATTRIBUTES = [
  "src",
  "data-src",
  "data-original",
  "data-lazy-src",
] as const;

function toAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value, document.baseURI).href;
  } catch {
    return null;
  }
}

function srcsetUrls(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .map(toAbsoluteUrl)
    .filter((url): url is string => Boolean(url));
}

export function collectComicImages(): ComicImage[] {
  const candidates = new Map<string, HTMLImageElement | null>();

  for (const image of document.images) {
    const urls = [
      toAbsoluteUrl(image.currentSrc),
      ...IMAGE_ATTRIBUTES.map((attribute) =>
        toAbsoluteUrl(image.getAttribute(attribute)),
      ),
      ...srcsetUrls(image.getAttribute("srcset")),
    ];

    for (const url of urls) {
      if (url && !url.startsWith("data:")) candidates.set(url, image);
    }
  }

  for (const source of document.querySelectorAll("source")) {
    const urls = [
      ...srcsetUrls(source.getAttribute("srcset")),
      ...srcsetUrls(source.getAttribute("data-srcset")),
    ];

    for (const url of urls) {
      if (url && !url.startsWith("data:")) candidates.set(url, null);
    }
  }

  return [...candidates.entries()]
    .map(([url, image]) => {
      const rect = image?.getBoundingClientRect();
      return {
        url,
        width: image?.naturalWidth || Math.round(rect?.width ?? 0),
        height: image?.naturalHeight || Math.round(rect?.height ?? 0),
        top: Math.round((rect?.top ?? 0) + window.scrollY),
      };
    })
    .filter(({ width, height }) => width >= 300 || height >= 300)
    .sort((a, b) => a.top - b.top)
    .map((image, index) => ({ ...image, index }));
}
