# 遊戲小小島

一個以 JSON 設定檔驅動的可愛遊戲連結大廳，集中入口到工作區裡的十個遊戲：

- 翻牌配對碰
- 數獨小學堂
- 打地鼠大亂鬥
- 水果連連看
- 小朋友下樓梯
- 你畫我猜
- 海島心臟病
- 寶島大富翁
- 炸彈小隊
- 彩虹泡泡砲

大廳本身不重寫既有遊戲，也不假裝提供跨遊戲的多人伺服器；每張卡片會在目前分頁帶到對應遊戲的獨立入口，並從各遊戲的統一 presence API 顯示在線狀態。

## 啟動大廳

需要 Node.js 18 以上：

```powershell
npm start
```

瀏覽器開啟 <http://127.0.0.1:3090>。健康檢查位於 `/health`。

也可以執行：

```powershell
npm test
```

測試會檢查 JSON 清單、必要檔案、首頁、健康檢查、設定檔路由與 404 行為。

## GitHub Pages 自動部署

`.github/workflows/pages.yml` 已設定好自動部署：每次 push 到 `main` 時，GitHub Actions 會執行 `npm ci`、`npm run verify`，再把 `dist` 部署到 GitHub Pages。這個 repository 的預期網址是：

```text
https://pjh-eric.github.io/game-lobby/
```

第一次在 GitHub 上需要做一次設定：

1. 開啟 repository 的 **Settings → Pages**。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. 開啟 **Settings → Actions → General**，確認 Workflow permissions 允許 workflow 使用必要的 repository 權限；若目前是唯讀，改成 **Read and write permissions** 後儲存。
4. 到 **Actions** 頁確認「建置並部署遊戲小小島」執行成功；之後每次 push `main` 都會自動重新部署。

GitHub Pages 只會公開這個大廳的靜態頁面，不會執行 `server.js`。目前十個 `launchUrl` 已指向各遊戲的公開 GitHub Pages；如果日後改用其他主機，只要更新對應的 `launchUrl` 即可。

### 頁尾的 GA4 累計不重複訪客數

頁尾讀取 GA4 Data API 的 `totalUsers` 指標，查詢範圍從 `2020-01-01` 到今天；實際數字只會包含 GA 標籤開始收集後的資料，不會匯入舊的 GoatCounter 計數。Pages workflow 在每次部署及每日排程時更新靜態計數檔，GA 報表資料可能有處理延遲。

設定方式：

1. 在 Google Cloud 啟用 **Google Analytics Data API v1**，建立服務帳戶與 JSON 金鑰，並在 GA4 資源的存取管理中授予該服務帳戶「檢視者」權限。
2. 到 GitHub repository 的 **Settings → Secrets and variables → Actions**，新增 Repository secret `GA_SERVICE_ACCOUNT_JSON`（服務帳戶 JSON 金鑰完整內容）。目前 GA4 Property ID `558900909` 已設在 Pages workflow。不要把金鑰提交到 repository。
3. 推送一次 `main` 或手動執行「建置並部署遊戲小小島」workflow；之後會每天自動更新。尚未設定授權時，頁尾會顯示「–」。

## 讓 Google 收錄（SEO）

`npm run build:pages` 產生 `dist` 時會自動加上：canonical 網址、Open Graph／Twitter 分享標籤、JSON-LD（WebSite＋遊戲 ItemList）、無 JavaScript 也能看到的遊戲連結清單（`<noscript>`），以及 `sitemap.xml`。網址來源是 `config/games.json` 的 `siteUrl`，遊戲清單則直接從同一份設定檔產生，上架新遊戲不必另外改 SEO。

部署後在 Google Search Console 完成一次設定：

1. 新增資源 → 選 **網址前置字元**，輸入 `https://pjh-eric.github.io/game-lobby/`。
2. 驗證擁有權（建議 **HTML 標記**）：複製 `content="…"` 裡那串字，填進 `config/games.json` 的 `googleSiteVerification`（也可改用 GitHub Actions 變數 `GOOGLE_SITE_VERIFICATION`，優先於設定檔），推上 `main` 部署完成後回 Search Console 按驗證。
3. 左側 **Sitemap** 輸入 `sitemap.xml` 並提交。
4. 到 **網址檢查** 貼上大廳網址，按 **要求建立索引**，可加快第一次收錄。

關鍵字寫法：標題與說明（`scripts/build-pages.js`、`app.js`、`index.html` 三處要一致）用玩家會搜的詞——「免費」「免下載」「線上多人」「手機平板可玩」「親子／小朋友」，比只寫遊戲名稱好找。GitHub repo 的 About 也要填上網址並加 topics（例如 `browser-game`、`socket-io`、`html5-game`）。

GitHub Pages 專案頁的 `/game-lobby/robots.txt` 不會被 Google 讀取，根層級的 robots.txt 與總 sitemap 改由 `pjh-eric.github.io` 專案提供。根網站的 Search Console 網址前置字元資源可涵蓋大廳及所有遊戲，各遊戲資源可選擇保留。每款遊戲另有一筆 canonical 網址的 sitemap。

### 新遊戲上架 SEO／GA4 檢查清單

- 每款遊戲新增 `seo.config.json`，填入自己的 id、結尾有 `/` 的 siteUrl、獨有標題與 40–120 字說明、genre、players、lobbyUrl。只在有可用圖片時填 ogImage；Google 驗證碼使用對應資源提供的值。
- 共用來源放在 `scripts/seo/`；`node scripts/sync-seo-shared.js --write` 將注入腳本、事件工具及 SEO 測試同步到同工作區的遊戲專案。未帶 `--write` 時只檢查一致性。上架前先加入 `config/games.json`。
- 原始 HTML 放置 `<!--SEO:HEAD-->`，在遊戲程式之前載入 `js/analytics.js`。繁中語系字典的文件標題與說明須與設定相同，英文有各自文案；只更新文件 metadata，不改變畫面標題。
- 部署 job 先 setup-node，再於 artifact 上傳前執行 `node tests/seo.js && node scripts/inject-seo.js`。注入結果與 sitemap 是部署產物，測試使用暫存副本，不覆蓋工作目錄。
- 在實際開局、結算及成功建房／加入入口接上事件。`start`、`end` 可防止重複結算；快照入口須使用穩定對局 key，觀戰者不得算開局。只送 mode、difficulty、players、result 等遊戲參數，避免送暱稱、房號或邀請 token。
- GA4 衡量 ID 預設 `G-PG79WZK8QY`，可用 `GA_MEASUREMENT_ID` 覆寫。`game_id` 由 config 指定。正式 hostname 才載入 GA，本機開啟注入產物也不送資料；page_location 固定為 canonical。
- `node scripts/check-seo-all.js --local` 驗證全遊戲設定、文案不重複、注入及語系一致；部署後執行 `node scripts/check-seo-all.js` 檢查正式網址與 sitemap。遠端檢查需要同工作區各遊戲的設定作為預期值。
- 本機瀏覽器複查：先建置大廳及根網站，並安裝水果連連看既有的 Playwright 開發依賴，再執行 `node scripts/check-seo-browser.js`。此腳本使用工作區內全部遊戲，驗證中英文 metadata、本機不送 GA、試點完整一局與重玩、大廳點擊及四種尺寸，截圖輸出到 `verification/seo-shots/`。
- 根網站每日建置從已上線大廳同步清單；首次部署根網站後，再完成 Search Console 驗證、提交總 sitemap，並在 GA4 建立 game_id、mode 自訂維度及確認即時事件。

## 啟動既有遊戲

大廳的正式遊戲連結集中在 `config/games.json` 的 `launchUrl`，目前指向十個遊戲各自的 GitHub Pages。`presenceUrl` 指向對應後端的 `/api/presence`，`localPort` 只供本機開發時使用，不會影響正式連結：

| 遊戲 | 正式入口 | 本機測試埠 |
| --- | --- | ---: |
| 翻牌配對碰 | `github.io/flip-match` | 3001 |
| 數獨小學堂 | `github.io/sudoku` | 3010 |
| 打地鼠大亂鬥 | `github.io/whack-a-mole` | 3030 |
| 水果連連看 | `github.io/fruit-link` | 3040 |
| 小朋友下樓梯 | `github.io/stair-kids` | 3060 |
| 你畫我猜 | `github.io/draw-guess` | 3030 |
| 海島心臟病 | `github.io/heart-attack` | 3080 |
| 寶島大富翁 | `github.io/richman` | 3100 |
| 炸彈小隊 | `github.io/bomb-squad` | 3120 |
| 彩虹泡泡砲 | `github.io/rainbow-bubble` | 3140 |
| 彈珠籃球 | `github.io/pinball-hoops` | 3200 |
| 射氣球 | `github.io/shoot-balloon` | 3220 |

你畫我猜與打地鼠的本機預設埠同為 3030；若要同時啟動，請透過 `PORT` 調整其中一個服務。

如果你的遊戲使用不同網址，只要同步修改 `launchUrl` 與 `presenceUrl`；卡片標題、分類、色彩、圖示、標籤、玩法與操作說明也都由同一份 JSON 驅動。

## 統一在線人數 API

大廳中各遊戲伺服器都提供 `GET /api/presence`，回應格式固定如下：

```json
{
  "gameId": "flip-match",
  "online": 3,
  "players": 2,
  "spectators": 1,
  "lobby": 0,
  "rooms": 1,
  "updatedAt": "2026-09-02T00:00:00.000Z"
}
```

`online` 是目前連到該遊戲後端的瀏覽器連線數；`players` 是房間內真人玩家，`spectators` 是觀戰者，`lobby` 是停在遊戲大廳的連線，`rooms` 是目前有連線成員的房間。AI 不會算進真人玩家。沒有登入系統時，同一個人開兩個分頁會算兩條連線。大廳每 30 秒重新查詢一次，後端的 WebSocket、Socket.IO 或 SSE 心跳／斷線清理會讓數字自動回落。

## 擴充遊戲

在 `config/games.json` 的 `games` 陣列加入一個物件即可。最小設定如下：

```json
{
  "id": "new-game",
  "title": "新遊戲",
  "eyebrow": "新冒險",
  "description": "一段顯示在卡片上的簡介。",
  "icon": "cards",
  "accent": "sky",
  "category": "brain",
  "tags": ["單機"],
  "modes": ["單機練習"],
  "controls": "點擊畫面開始",
  "launchUrl": "http://localhost:4000",
  "localPort": 4000,
  "projectFolder": "new-game",
  "badge": "新加入"
}
```

目前 `icon` 可用 `cards`、`sudoku`、`market`、`catdog`、`mole`、`stairs`、`caterpillar`、`fruit`、`drawguess`、`heartattack`、`bubble`、`bomb`、`rainbow`、`balloon`；若使用未知值會回退成卡牌圖示。`accent` 可用 `sky`、`pink`、`lilac`、`mint`、`peach`、`lemon`、`lime`。若要加入新的圖示或分類，再修改 `app.js` 對應的圖示與色彩映射。

### 分類、標籤與徽章規則

- `category` 目前有 `brain`（動動腦）、`turn`（回合策略：棋類、大富翁、撞球這類輪流行動的遊戲）、`action`（反應派）。新增分類要同時改 `index.html` 的篩選鈕與 `app.js` 的 `categoryLabels`，而且每個分類至少要有一款遊戲（測試會檢查）。
- `tags` 最多 5 個，順序固定為：玩法類型（記憶、邏輯、消除、畫畫、策略、棋類、卡牌、反應、闖關、動作、射擊、運動，可加 `3D`）→ `幼幼班`（有支援才加）→ 遊玩模式（`單機`、`電腦對戰`、`線上多人`、`觀戰`）；線上只能 2 人的遊戲寫 `線上雙人` 取代 `線上多人`。只能用這份詞彙，新增標籤請同步更新 `tests/verify.js` 的 `allowedTags`。
- `badge` 寫一句短的特色（例如「耐玩」「快手」）；「新遊戲」只給最新上架的最多兩款，之後有新遊戲上架時，把較舊的改成特色徽章。

### 大廳自己的名字也吃設定檔

`config/games.json` 最上層的 `title` 就是大廳的名字，`app.js` 的 `applyLobbyTitle()`
會把它套到分頁標題、左上角品牌、頁尾與 `<meta name="description">`，**遊戲數量是數出來的**。

以前這四處各寫死一份「遊戲小小島」，改 `title` 不會有任何反應；分頁標題那句
「六個可愛小遊戲」在上架第七款（小朋友下樓梯）之後就數錯了，說明文字也一直漏掉新遊戲。
`index.html` 裡留的那一份只是設定檔還沒讀到前的備援，所以**不寫數量、也不列遊戲名字**
（`tests/verify.js` 會擋：備援字串一出現「N 個遊戲」或任何一款遊戲的名字就紅）。

## 設計與範圍

- 手機、平板直向／橫向與桌機皆採內容驅動的響應式版面。
- 遊戲卡片可搜尋、依分類篩選、收藏、查看玩法詳情，並顯示各遊戲目前在線人數。
- 右上角設定為 Modal，支援背景音樂、按鈕音效、減少動態、恢復預設、Escape、點擊遮罩與焦點循環；偏好保存於瀏覽器 localStorage。
- 圖示使用本地 inline SVG/CSS，沒有外部圖片依賴。Google Fonts 只作為可選字型，離線時會回退到系統字型。
- 既有遊戲仍由各自專案的設定、音訊、線上房間與伺服器負責。

本專案提供 GitHub Actions 的自動部署設定；GitHub repository 的 Pages 開關與各個遊戲的正式公開網址仍需由專案擁有者設定。
