import { collectComicImages } from "../lib/images";

type LanguageCode = "auto" | "ja" | "en" | "zh" | "ko";

function createOption(value: LanguageCode, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
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
    .status {
      min-height: 18px;
      margin: 12px 2px 0;
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.5;
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

  action.addEventListener("click", () => {
    const images = collectComicImages();
    status.textContent = images.length
      ? `번역 후보 이미지 ${images.length}개를 찾았습니다.`
      : "300px 이상인 번역 후보 이미지를 찾지 못했습니다.";

    console.info("[Lreader] collected images", {
      sourceLanguage: sourceSelect.value,
      targetLanguage: targetSelect.value,
      images,
    });
  });

  panel.append(header, fields, action, status);

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
