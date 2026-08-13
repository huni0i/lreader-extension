import { collectComicImages } from "../lib/images";
import type {
  ImageTranslationResult,
  SourceLanguage,
  SupportedLanguage,
  TranslateImageMessage,
} from "../lib/messages";
import { renderTranslationOverlays } from "../lib/overlay";

type LanguageCode = "auto" | "ja" | "en" | "zh" | "ko";

function resolveSourceLanguage(value: LanguageCode): SourceLanguage {
  if (value !== "auto") return value;
  if (window.location.hostname === "comic.naver.com") return "ko";
  return "auto";
}

function createOption(value: LanguageCode, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

async function readBlobImage(url: string): Promise<string | undefined> {
  if (!url.startsWith("blob:")) return undefined;

  const image = [...document.images].find((element) => {
    const candidates = [
      element.currentSrc,
      element.src,
      element.getAttribute("data-src"),
      element.getAttribute("data-original"),
      element.getAttribute("data-lazy-src"),
    ];
    return candidates.includes(url);
  });
  if (image) {
    try {
      await image.decode();
    } catch {
      // 이미 화면에 표시된 이미지는 decode 실패 후에도 캔버스에 복사할 수 있다.
    }
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width && height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("이미지 캔버스를 만들지 못했습니다.");
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    }
  }

  throw new Error("화면에 표시된 blob 이미지를 찾지 못했습니다.");
}

function mountWidget(): void {
  if (document.getElementById("lreader-root")) return;

  const host = document.createElement("div");
  host.id = "lreader-root";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483647;
      font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #f8fafc;
    }
    * { box-sizing: border-box; }
    button, select { font: inherit; }
    .launcher {
      width: 56px;
      height: 56px;
      border: 0;
      border-radius: 18px;
      background: #7c3aed;
      color: white;
      box-shadow: 0 14px 35px rgba(15, 23, 42, .35);
      cursor: pointer;
      font-size: 24px;
    }
    .panel {
      display: none;
      width: 320px;
      margin-bottom: 12px;
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, .12);
      border-radius: 20px;
      background: rgba(15, 23, 42, .96);
      box-shadow: 0 18px 50px rgba(15, 23, 42, .4);
      backdrop-filter: blur(18px);
    }
    .panel[data-open="true"] { display: block; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .title { font-size: 17px; font-weight: 750; }
    .badge {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(124, 58, 237, .2);
      color: #c4b5fd;
      font-size: 11px;
      font-weight: 700;
    }
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    label {
      display: grid;
      gap: 6px;
      color: #94a3b8;
      font-size: 12px;
    }
    select {
      width: 100%;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 9px 10px;
      background: #1e293b;
      color: #f8fafc;
    }
    .action {
      width: 100%;
      border: 0;
      border-radius: 12px;
      padding: 11px 14px;
      background: #7c3aed;
      color: white;
      cursor: pointer;
      font-weight: 750;
    }
    .action:hover { background: #6d28d9; }
    .action:disabled { cursor: wait; opacity: .65; }
    .secondary {
      margin-top: 8px;
      background: #334155;
    }
    .secondary:hover { background: #475569; }
    .status {
      min-height: 18px;
      margin: 12px 2px 0;
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  `;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.dataset.open = "false";

  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <span class="title">Lreader</span>
    <span class="badge">LOCAL FIRST</span>
  `;

  const fields = document.createElement("div");
  fields.className = "fields";

  const sourceLabel = document.createElement("label");
  sourceLabel.textContent = "원문 언어";
  const sourceSelect = document.createElement("select");
  sourceSelect.append(
    createOption("auto", "자동 감지"),
    createOption("ja", "일본어"),
    createOption("en", "영어"),
    createOption("zh", "중국어"),
    createOption("ko", "한국어"),
  );
  sourceLabel.append(sourceSelect);

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "번역 언어";
  const targetSelect = document.createElement("select");
  targetSelect.append(
    createOption("ko", "한국어"),
    createOption("en", "영어"),
    createOption("ja", "일본어"),
    createOption("zh", "중국어"),
  );
  targetLabel.append(targetSelect);
  fields.append(sourceLabel, targetLabel);

  const action = document.createElement("button");
  action.className = "action";
  action.type = "button";
  action.textContent = "이 화 이미지 찾기";

  const status = document.createElement("p");
  status.className = "status";
  status.textContent = "페이지 구조를 먼저 확인해 이미지 수집 가능성을 테스트합니다.";

  let images = collectComicImages();
  let isTranslatingChapter = false;
  let stopRequested = false;

  action.addEventListener("click", () => {
    images = collectComicImages();
    status.textContent = images.length
      ? `번역 후보 이미지 ${images.length}개를 찾았습니다.`
      : "300px 이상인 번역 후보 이미지를 찾지 못했습니다.";

    console.info("[Lreader] collected images", {
      sourceLanguage: sourceSelect.value,
      targetLanguage: targetSelect.value,
      images,
    });
  });

  const translateAction = document.createElement("button");
  translateAction.className = "action secondary";
  translateAction.type = "button";
  translateAction.textContent = "이 화 전체 번역";
  translateAction.addEventListener("click", async () => {
    if (isTranslatingChapter) {
      stopRequested = true;
      translateAction.textContent = "현재 이미지 처리 후 중지합니다…";
      status.textContent = "번역 중지를 요청했습니다.";
      return;
    }

    const sourceLanguage = resolveSourceLanguage(
      sourceSelect.value as LanguageCode,
    );

    images = collectComicImages();
    if (!images.length) {
      status.textContent = "이 화에서 번역할 이미지를 찾지 못했습니다.";
      return;
    }

    isTranslatingChapter = true;
    stopRequested = false;
    action.disabled = true;
    sourceSelect.disabled = true;
    targetSelect.disabled = true;
    translateAction.textContent = "번역 중지";
    let completed = 0;
    let rendered = 0;
    let activeSourceLanguage = sourceLanguage;
    const failures: string[] = [];

    try {
      for (const image of images) {
        if (stopRequested) break;

        status.textContent =
          `전체 ${images.length}장 중 ${completed + 1}번째 이미지를 ` +
          "번역하고 있습니다…";

        let response: ImageTranslationResult | { error: string };
        try {
          const message: TranslateImageMessage = {
            type: "translate-image",
            payload: {
              url: image.url,
              imageData: await readBlobImage(image.url),
              referrer: window.location.href,
              sourceLanguage: activeSourceLanguage,
              targetLanguage: targetSelect.value as SupportedLanguage,
              quality: "ocr",
              inpaint: true,
              inpaintMethod: "opencv",
            },
          };
          response = (await browser.runtime.sendMessage(message)) as
            | ImageTranslationResult
            | { error: string };
        } catch (error) {
          response = {
            error: error instanceof Error ? error.message : String(error),
          };
        }

        if ("error" in response) {
          failures.push(`${image.index + 1}번: ${response.error}`);
        } else {
          activeSourceLanguage = response.source_language;
          rendered += renderTranslationOverlays(
            image,
            response.regions,
            response.inpainted_image,
          );
        }
        completed += 1;

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0);
        });
      }

      const stopped = stopRequested ? "사용자 요청으로 중지했습니다. " : "";
      status.textContent =
        `${stopped}${completed}/${images.length}장 처리, ` +
        `번역문 ${rendered}개 표시, 실패 ${failures.length}장.` +
        (failures.length ? `\n${failures.slice(0, 3).join("\n")}` : "");
    } catch (error) {
      status.textContent = `번역 실패: ${
        error instanceof Error ? error.message : String(error)
      }`;
    } finally {
      isTranslatingChapter = false;
      stopRequested = false;
      action.disabled = false;
      sourceSelect.disabled = false;
      targetSelect.disabled = false;
      translateAction.textContent = "이 화 전체 번역";
    }
  });

  panel.append(header, fields, action, translateAction, status);

  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.type = "button";
  launcher.textContent = "文";
  launcher.title = "Lreader 열기";
  launcher.addEventListener("click", () => {
    panel.dataset.open = String(panel.dataset.open !== "true");
  });

  shadow.append(style, panel, launcher);
  document.documentElement.append(host);
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main: mountWidget,
});
