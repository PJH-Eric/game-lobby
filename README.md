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

## 讓 Google 收錄（SEO）

`npm run build:pages` 產生 `dist` 時會自動加上：canonical 網址、Open Graph／Twitter 分享標籤、JSON-LD（WebSite＋遊戲 ItemList）、無 JavaScript 也能看到的遊戲連結清單（`<noscript>`），以及 `sitemap.xml`。網址來源是 `config/games.json` 的 `siteUrl`，遊戲清單則直接從同一份設定檔產生，上架新遊戲不必另外改 SEO。

部署後在 Google Search Console 完成一次設定：

1. 新增資源 → 選 **網址前置字元**，輸入 `https://pjh-eric.github.io/game-lobby/`。
2. 驗證擁有權（建議 **HTML 標記**）：複製 `content="…"` 裡那串字，填進 `config/games.json` 的 `googleSiteVerification`（也可改用 GitHub Actions 變數 `GOOGLE_SITE_VERIFICATION`，優先於設定檔），推上 `main` 部署完成後回 Search Console 按驗證。
3. 左側 **Sitemap** 輸入 `sitemap.xml` 並提交。
4. 到 **網址檢查** 貼上大廳網址，按 **要求建立索引**，可加快第一次收錄。

注意：GitHub Pages 專案頁的 `/game-lobby/robots.txt` 不會被 Google 讀取（只認網域根目錄），沒有 robots.txt 代表全部允許抓取，所以不需要。各遊戲是各自的 repo，要被收錄請在各遊戲專案另外做同樣設定；sitemap 只能列出所屬路徑底下的網址。

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

目前 `icon` 可用 `cards`、`sudoku`、`market`、`catdog`、`mole`、`stairs`、`caterpillar`、`fruit`、`drawguess`、`heartattack`、`bubble`、`bomb`、`rainbow`；若使用未知值會回退成卡牌圖示。`accent` 可用 `sky`、`pink`、`lilac`、`mint`、`peach`、`lemon`、`lime`。若要加入新的圖示或分類，再修改 `app.js` 對應的圖示與色彩映射。

### 分類、標籤與徽章規則

- `category` 目前有 `brain`（動動腦）、`board`（棋盤策略）、`action`（反應派）。新增分類要同時改 `index.html` 的篩選鈕與 `app.js` 的 `categoryLabels`，而且每個分類至少要有一款遊戲（測試會檢查）。
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
