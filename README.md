# 遊戲小小島

一個以 JSON 設定檔驅動的可愛遊戲連結大廳，集中入口到工作區裡的六個遊戲：

- 跳棋小島
- 翻牌配對碰
- 數獨小學堂
- 貓狗大戰
- 打地鼠大亂鬥
- 水果連連看

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

GitHub Pages 只會公開這個大廳的靜態頁面，不會執行 `server.js`。目前六個 `launchUrl` 已指向各遊戲的公開 GitHub Pages；如果日後改用其他主機，只要更新對應的 `launchUrl` 即可。

## 啟動既有遊戲

大廳的正式遊戲連結集中在 `config/games.json` 的 `launchUrl`，目前指向六個遊戲各自的 GitHub Pages。`presenceUrl` 指向對應後端的 `/api/presence`，`localPort` 只供本機開發時使用，不會影響正式連結：

| 遊戲 | 正式入口 | 本機測試埠 |
| --- | --- | ---: |
| 跳棋小島 | `github.io/chinese-checkers` | 3000 |
| 翻牌配對碰 | `github.io/flip-match` | 3001 |
| 數獨小學堂 | `github.io/sudoku` | 3010 |
| 貓狗大戰 | `github.io/cat-dog-war` | 3020 |
| 打地鼠大亂鬥 | `github.io/whack-a-mole` | 3030 |
| 水果連連看 | `github.io/fruit-link` | 3040 |

如果你的遊戲使用不同網址，只要同步修改 `launchUrl` 與 `presenceUrl`；卡片標題、分類、色彩、圖示、標籤、玩法與操作說明也都由同一份 JSON 驅動。

## 統一在線人數 API

六個遊戲伺服器都提供 `GET /api/presence`，回應格式固定如下：

```json
{
  "gameId": "cat-dog-war",
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

目前 `icon` 可用 `checkers`、`cards`、`sudoku`、`market`、`catdog`、`mole`；若使用未知值會回退成卡牌圖示。`accent` 可用 `sky`、`pink`、`lilac`、`mint`、`peach`、`lemon`。若要加入新的圖示或分類，再修改 `app.js` 對應的圖示與色彩映射。

## 設計與範圍

- 手機、平板直向／橫向與桌機皆採內容驅動的響應式版面。
- 遊戲卡片可搜尋、依分類篩選、收藏、查看玩法詳情，並顯示各遊戲目前在線人數。
- 右上角設定為 Modal，支援背景音樂、按鈕音效、減少動態、恢復預設、Escape、點擊遮罩與焦點循環；偏好保存於瀏覽器 localStorage。
- 圖示使用本地 inline SVG/CSS，沒有外部圖片依賴。Google Fonts 只作為可選字型，離線時會回退到系統字型。
- 既有遊戲仍由各自專案的設定、音訊、線上房間與伺服器負責。

本專案提供 GitHub Actions 的自動部署設定；GitHub repository 的 Pages 開關與各個遊戲的正式公開網址仍需由專案擁有者設定。
