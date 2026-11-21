# 遊戲後端三級備援實作計畫書

## 目標

先以 Cloudflare 今日請求數前五名驗證 **Oracle 東京 → Render → Cloudflare**。新連線按順序選擇可用的後端。房間、邀請與重連沿用原後端，且玩家能在原後端重新啟動後回到同一房號、原座位及最後已確認的局面。每款遊戲各自完成這項驗收後，才將其新連線導向 Oracle。

| 遊戲 | 試點期間的路由 |
| --- | --- |
| 你畫我猜、猜 AB、碰碰車大亂鬥、箭頭解密、水果連連看 | 個別驗收後啟用 Oracle 東京 → Render → Cloudflare |
| 炸彈小隊 | Oracle 東京 → Cloudflare |
| 其他 10 款 | Render → Cloudflare |

Cloudflare `workersInvocationsAdaptive` 於 2026-11-20 台灣時間 00:00 至 20:18 的 Worker 請求數，依請求數排序。這是後端流量指標，包含健康檢查及連線探測，無法從這個數字得出獨立玩家數。第六名疊疊高樓為 52 次，第五名只領先 1 次。

| 排名 | 遊戲 | Worker 請求 | 通訊協定 | 重啟回房驗收重點 |
| ---: | --- | ---: | --- | --- |
| 1 | 你畫我猜 (`draw-guess`) | 1,977 | Socket.IO | 恢復房主、座位、模式、計時與已確認的筆畫或提交。 |
| 2 | 密碼鎖 1A2B (`guess-ab`) | 91 | WebSocket | 恢復已確認的猜測、輪次、倒數與原座位。 |
| 3 | 碰碰車大亂鬥 (`bumper-sumo`) | 88 | Socket.IO | 恢復原席位、回合與遊戲狀態，特別量測物理迴圈及快照負載。 |
| 4 | 箭頭解密 (`amaze-go`) | 70 | WebSocket | 恢復原席位、棋盤與目前回合。 |
| 5 | 水果連連看 (`fruit-link`) | 53 | Socket.IO | 恢復原成員、棋盤配對進度、分數與倒數。 |

現有東京 VM 的規格是 `VM.Standard.E2.1.Micro`。本次唯讀檢查約有 383 MiB 可用記憶體且 CPU 低負載，前次量測約有 41 GB 可用磁碟。從同一條網路對炸彈小隊各測 10 次，Oracle 與 Cloudflare 的 WebSocket 往返時間中位數分別為 42 ms 與 252 ms。這是試點的參考基準，五款遊戲的延遲與併發容量需另測。本次檢查的五個 Render 端點均回傳 `503` 與 `x-render-routing: suspend`。

## 影響範圍

| 位置 | 預計調整 |
| --- | --- |
| `game-lobby/cloudflare/backend-router.js` | `createBackendRouter()` 接收有順序的 `endpoints`，依序探測，沿用同頁併發共用選擇結果及邀請固定後端的行為。 |
| `game-lobby/cloudflare/site-backend.js` | 更新 `guess-ab` 的後端順序，讓 `GameBackend` 可識別三個服務網址。其他遊戲使用現有順序。 |
| `game-lobby/cloudflare/backend-router.test.cjs` | 加入三級路由、逾時、同時連線、既有邀請與回滾後邀請的回歸測試。 |
| `guess-ab/deploy/oracle/server.env` | 新增 Oracle 站點的部署設定。`guess-ab/server.js` 已讀取 `PORT`，並提供 `/health` 與 `/ws`。 |
| `guess-ab/lib/rooms.js`、`guess-ab/server.js` | 建立可持久化的房間快照、啟動復原及回房確認。復原完成後開放健康檢查及玩家連線。 |
| `game-lobby/cloudflare/worker.mjs`、`game-lobby/cloudflare/runtime.mjs` | 讓猜 AB 的 Durable Object 在接受連線前還原房間，並以其持久儲存提交房間變更。 |
| `guess-ab/public/js/online.js`、`guess-ab/public/js/modes/online-ui.js` | 傳遞喚醒進度、取消訊號及固定後端的回房請求。服務暫時離線時，在同一分頁保留回房資料。 |

黑白棋使用自己的路由程式，試點期間依舊走 Render → Cloudflare。共用腳本由 `game-lobby/scripts/build-pages.js` 產出 `dist/backend-routing.js`，經既有 GitHub Pages workflow 發佈。

### 本機預覽

建置時可用 `ORACLE_PILOT_ORIGINS` 指定五款中的任意子集。設定值為遊戲代號對應到 HTTPS origin 的 JSON 物件。每個值只接受協定、主機和選用的埠。以下是使用測試網址的 PowerShell 範例，供路由測試使用。

```powershell
$env:ORACLE_PILOT_ORIGINS = '{"guess-ab":"https://guess-ab.oracle.example"}'
npm run build:pages
Remove-Item Env:ORACLE_PILOT_ORIGINS
```

沒有指定試點網址時，建置沿用各遊戲原本的兩級順序。正式工作流程等候各款的真實端點、容量與重啟回房驗收，再加入相應的試點設定。

## 實作步驟

1. **逐款準備 Oracle 端點。** 五款共用本機路由原型，Oracle 先以猜 AB 驗證，再加入一套 Socket.IO 後端驗證。每款使用獨立 systemd 服務、Caddy 站點、埠、網域及儲存。猜 AB 的候選埠為 `3100`，來源為 `https://pjh-eric.github.io`，候選網域 `guess-ab.duckdns.org` 待確認可用。用 `/health` 與各遊戲對應的 `/ws` 或 `/socket.io/` 測試直連，並驗證同台炸彈小隊的延遲與對局。每增加一款都重測資源，決定下一款是否留在同一台 VM。
2. **擴充共用路由並保留喚醒時間。** Oracle 的初始探測上限為 **5 秒**。Oracle 失敗後嘗試 Render，從首次嘗試起最多等 **45 秒**，包含每次探測與重試間隔。單次 WebSocket 探測最多 3 秒，在總時間內每 3 秒重試，每次探測最多使用剩餘時間，並沿用現有喚醒提示。Render 免費服務冷啟動約需 1 分鐘，所以完整冷啟動可能超過這次設定的等待上限。Render 在時限內可連線就選用，逾時後試 Cloudflare。Cloudflare 探測上限為 5 秒。現有的其他遊戲保留各自的逾時與順序。 [Render 免費服務喚醒說明](https://render.com/docs/free#spinning-down-on-idle)
   - **Render 已確認暫停。** 使用 Render 控制台或部署端的唯讀健康檢查確認暫停，例如猜 AB 目前可測得的 `503` 搭配 `x-render-routing: suspend`，再以有到期時間的設定暫時跳過 Render。Oracle 失敗後直接試 Cloudflare，到期後自動恢復嘗試 Render。瀏覽器 WebSocket 錯誤和一般 `503` 都可能出現在啟動期間，單憑這兩種訊號無法判定暫停。
   - **進度、取消與重連。** `Net.wake()` 等待 `GameBackend.select()` 時就更新喚醒秒數。玩家離開連線畫面時取消探測與重試計時。同一頁的同時連線請求共用一次喚醒。當三級端點這一輪都失敗，就顯示原有連線失敗提示並等待使用者重試，避免既有迴圈再等一次 45 秒。已固定後端的房間重連沿用該房間的重連規則。
3. **保留同一房間的後端。** 房間邀請寫入 `backend=oracle`、`backend=render` 或 `backend=cloudflare`。開啟有效的固定後端邀請時連回該端點，端點故障就呈現原有的連線失敗提示。已入房的玩家依現有重連流程回原端點，重新載入遊戲後的新連線才重新選擇順序。維持既有 `?server=` 測試入口及邀請格式。舊邀請若缺少 `backend`，會走新連線的探索順序，原房主可從房內重新產生邀請。
4. **完成房間持久化與重啟復原。** 依下節實作三個後端的儲存與回房流程，先在測試環境覆蓋重啟情境，再發佈支援復原的後端與前端。從目前的純記憶體版本升級時，先等既有房間結束，再切換至有持久化的版本。
5. **發佈並觀測。** 先驗證三個端點的重啟回房，再推送共用路由變更，等 GitHub Pages 部署成功後從正式頁面驗證。保留 Render 的既有 `GAME_SERVER_URL` 作為猜 AB 頁面的注入值，由共用路由選擇 Oracle。記錄首次進大廳耗時、對局 RTT P50／P95、切換時間、重連結果，以及兩款遊戲同時遊玩時的 VM 資源。

## 重啟後回到原房間

目前 `guess-ab/lib/rooms.js` 用 `Map` 保存房間，既有 30 秒寬限只涵蓋伺服器還在運行的短暫斷線。重新啟動會清空房間。回房分為兩種情境：

| 情境 | 回房規則 |
| --- | --- |
| 網路短暫中斷，原後端仍存活 | 沿用 30 秒斷線寬限，以原玩家身分回原座位。 |
| 原後端重啟或冷啟動 | 保留未結束房間的快照。伺服器從房間復原完成起算，提供 **120 秒回房寬限**。這段時間保留原座位並暫停對局倒數，等符合對局規則的玩家回房後繼續。寬限到期則依既有離線處置收尾。 |

- **持久化範圍。** 快照保存房號、玩家識別與席位、房主、房間設定、邀請狀態、已確認的猜測與結果、目前輪次及剩餘時間。完成寫入後才確認操作，寫入失敗就回傳錯誤。啟動時重建 `rooms` 與 `where` 索引，將已存席位標記為待重連。主動離開、踢人、撤銷邀請及關房都要記錄，避免重啟後復活舊房間或舊權限。房間快照與答案只供後端存取，健康檢查與日誌不輸出這些內容。
- **每個後端各自保存自己的房間。** Oracle 使用 VM 持久磁碟上的 SQLite。Render 免費服務的本機檔案會在休眠或重啟時消失，須先取得獨立於服務生命週期的持久儲存，例如具持久化與備份的外部 PostgreSQL。Cloudflare 使用現有 Durable Object 的 SQLite 持久儲存。Render 的儲存可用性、費用及冷啟動加上還原所需時間，列為上線前驗證項目。 [Render 檔案系統限制](https://render.com/docs/free#local-files-lost-on-redeploy) · [Cloudflare Durable Object 持久儲存](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- **固定回房目標。** 客戶端在同一分頁保存 `roomId` 與 `backend`，沿用 `clientId`。重連或重新整理只向原後端送回房請求，由伺服器核對原玩家身分和房號後回傳該玩家可見的房間狀態。收到一般大廳清單或一次連線失敗時，保留回房資料。主動放棄回房，或收到伺服器確認的關房、身分失效及寬限到期結果時，才清除並顯示對應狀態。
- **等待方式。** Oracle 5 秒和 Render 45 秒適用於選擇新連線的後端。已有房間時，前端持續嘗試固定的原後端，初始重試上限設為 **3 分鐘**，包含該次等待啟動的時間。介面顯示「等待原房間恢復」並允許取消。這 3 分鐘是前端重試窗口，服務端另自復原完成起算 120 秒保留席位。自動重試用完時，仍提供「再試一次」，讓玩家也能在服務恢復後重新嘗試回原房。

## 相關程式碼片段

`game-lobby/cloudflare/backend-router.js` 的候選端點及邀請解析方向。

```js
function createBackendRouter({ endpoints, pinOnly = [], pin, probe = socketProbe }) {
  const pinned = [...endpoints, ...pinOnly].find(endpoint => endpoint.id === pin);
  let selected = pinned;

  async function choose() {
    for (const endpoint of endpoints) {
      if (endpoint.skipUntil > Date.now()) continue;
      try {
        if (await checkEndpoint(probe, endpoint)) {
          selected = endpoint;
          return endpoint.url;
        }
      } catch {
        // 繼續檢查下一個端點。
      }
    }
    return null;
  }

  // 沿用現有 select() 的 pending 共用機制與 pinInvite()。
}
```

`game-lobby/cloudflare/site-backend.js` 的猜 AB 設定方向。`guessAbOracle` 使用驗證過的 HTTPS 網址與 `/ws`，`origin` 是既有 Render 端點。`guessAbRender` 的 `wakeTimeoutMs` 交給探測函式處理，`skipUntil` 只在已確認暫停時設定，值為 Unix 毫秒時間。

```js
const guessAbRender = { ...origin, timeoutMs: 3000, wakeTimeoutMs: 45000 };
const endpoints = game === 'guess-ab'
  ? [{ ...guessAbOracle, timeoutMs: 5000 }, guessAbRender, cloudflare]
  : [origin, cloudflare];

const pinOnly = [];
const route = window.createBackendRouter({ endpoints, pinOnly, pin: query.get('backend') });
const hosts = new Set([...endpoints, ...pinOnly].map(endpoint => new URL(endpoint.url).host));
```

`guess-ab/public/js/online.js` 的重連訊息方向。重連前已用 `savedRoom.backend` 固定連線，伺服器依 `clientId` 驗證 `resumeRoomId` 的原座位。

```js
ws.send(JSON.stringify({
  type: 'hello', name: this.name, clientId: root.Store.clientId(), cue: 0,
  ...(savedRoom && { resumeRoomId: savedRoom.id })
}));
```

## 驗證與擴大條件

| 驗證項目 | 通過條件 |
| --- | --- |
| 單元測試與建置 | 在 `game-lobby` 執行 `node --test cloudflare/backend-router.test.cjs` 和 `npm run verify`。在 `guess-ab` 執行 `npm test`。 |
| 路由順序 | 在受控測試覆蓋 Oracle 可用、Render 已啟動、Render 在 40 秒時喚醒、Render 在 45 秒時仍未就緒、已確認暫停、暫停設定到期，以及全數失敗後重試。驗證喚醒期間顯示進度，離開時停止重試。 |
| 正式連線 | Oracle 正常時收到遊戲 `welcome`。以瀏覽器阻擋指定測試連線驗證備援。Render 已確認暫停時，最多等 Oracle 的 5 秒探測就開始連 Cloudflare。Oracle 與 Render 都用完時限時，約 50 秒開始連 Cloudflare。正式 Render 仍暫停時，在受控測試中驗證成功喚醒的分支。同時檢查炸彈小隊和至少一款原本走 Render → Cloudflare 的遊戲。 |
| 房間與邀請 | 驗證建房、邀請加入、觀戰、重連及 Oracle 恢復後的新連線。固定後端的邀請要回到原房間，端點故障時顯示可理解的提示。 |
| 重啟復原（上線門檻） | 兩位玩家開始猜 AB 對局並完成至少一手，逐一對 Oracle、Render、Cloudflare 的測試環境執行重啟或替換執行個體。先驗證原端點停機超過 50 秒時客戶端仍保留房間，恢復後以同一分頁重連及重新整理，核對房號、房主、座位、輪次、剩餘時間與最後已確認的猜測。另測強制終止、超過寬限、主動離開、撤銷邀請與已關房，確認只有有效的房間與身分能復原。Render 尚未能部署持久儲存或未通過重啟驗收時，維持現有正式路由。 |
| 容量與延遲 | 從同一條台灣網路比較猜 AB 在 Oracle 與 Cloudflare 的延遲，並讓猜 AB 和炸彈小隊同時對戰做試跑。先以 30 分鐘為觀測窗口，暫定至少保留 200 MiB 可用記憶體，兩個服務無重啟，炸彈小隊 RTT P95 相對同網路基準增加不超過 20 ms。通過後再評估加入第二款。 |

## 回滾方式

如果 Oracle 試點影響炸彈小隊、猜 AB 重連失敗或記憶體低於試點門檻，將猜 AB 的新連線順序調回 **Render → Cloudflare**，重新部署共用腳本。當 Oracle 仍健康時，把猜 AB 的 Oracle 端點保留在 `pinOnly`，讓既有邀請和房間可以用到自然結束。同步將它納入 `GameBackend` 的受管理網址，並驗證固定 Oracle 的邀請仍能入房。若 Oracle 已故障，新連線仍分流到其他可用端點，既有 Oracle 對局等服務恢復或由玩家重開房間。

## 2026-11-20 試點結果

- 猜 AB 的 Oracle 獨立站使用本機 SQLite 保存房間。公開 WebSocket 測試強制終止 `guess-ab-pilot`，等 55 秒再使用原玩家身分重連。兩人回到同一房號、席位、輪次及已確認的猜測，炸彈小隊健康檢查正常。另以瀏覽器對公開試點建房並重新整理，驗證原後端、玩家身分、房號與座位都能保留。 [Oracle 試點](https://guess-ab.bomb-squad.duckdns.org/) · [猜 AB 試點分支](https://github.com/PJH-Eric/guess-ab/tree/oracle-room-pilot)
- 五個 Render 端點仍處於暫停狀態。CLI 授權過期，Render 的持久儲存與重啟回房等待驗證。
- 猜 AB 的 Cloudflare 復原版已上傳至獨立試點。測試時 Durable Objects 免費執行時長用完，Worker 回傳 `1101`。正式備援未切到試點版本。 [Cloudflare 免費額度](https://developers.cloudflare.com/durable-objects/platform/pricing/)

四款後續試點依序部署至同一台東京 VM。每款都先通過本機回歸與獨立程序復原測試，再透過公開 WebSocket 建立雙人對局，強制終止該款程序，等 55 秒後驗證兩位原玩家可以回到同一房號、席位與對局。測試期間炸彈小隊持續服務。

| Oracle 試點 | GitHub 試點版本 | 重啟後核對的進度 | 該階段最低可用記憶體 |
| --- | --- | --- | --- |
| [你畫我猜](https://draw-guess.bomb-squad.duckdns.org/) | [`a6560db`](https://github.com/PJH-Eric/draw-guess/commit/a6560db) | 房主、作畫輪次與已確認筆畫 | 323 MiB |
| [箭頭解密](https://amaze-go.bomb-squad.duckdns.org/) | [`1ea43ef`](https://github.com/PJH-Eric/amaze-go/commit/1ea43ef) | 已移除的箭頭、棋盤與得分 | 264 MiB |
| [水果連連看](https://fruit-link.bomb-squad.duckdns.org/) | [`2762084`](https://github.com/PJH-Eric/fruit-link/commit/2762084) | 已配對的格子、棋盤與得分 | 267 MiB |
| [碰碰車大亂鬥](https://bumper-sumo.bomb-squad.duckdns.org/) | [`5ea794a`](https://github.com/PJH-Eric/bumper-sumo/commit/5ea794a) | 同一回合、已確認事件與已寫入的物理狀態 | 222 MiB |

碰碰車大亂鬥在有遊戲事件時先存檔再推送。純移動狀態約每 250 毫秒寫入一次，復原以前一份成功寫入的狀態為準。水果連連看既有生產依賴仍有 npm 稽核項目，這次試點未升級依賴。

五款各開一局雙人對局。第一次同時測試的最低可用記憶體為 213 MiB，延長至 40 秒後最低為 207 MiB，清理測試房後一度降到 184 MiB。確認沒有連線後，依序調整箭頭解密與碰碰車的 systemd 試點服務，在 `memory.conf` 設定 `NODE_OPTIONS=--max-semi-space-size=4`，限制 V8 年輕代的半空間大小。調整後再次讓五款同時對局 40 秒，最低可用記憶體為 232 MiB。結束對局後再觀察 40 秒，最低 221 MiB，兩個窗口均通過 200 MiB 門檻，六個 Oracle 服務的重啟次數都沒有增加。炸彈小隊的 WebSocket 延遲在各次抽測間有波動，五局同時對局的結果適用於這次容量抽測。

水果連連看與碰碰車大亂鬥另外在公開試點用瀏覽器建房並重新整理，確認回到原房。水果連連看的本機瀏覽器全套檢查有 247 項通過，兩項因獨立站原先引用的 GitHub Pages 共用腳本回 `404` 而失敗。

五款正式入口都維持既有路由。當天複測五個 Render 健康檢查皆回 `503 suspend`，五個既有 Cloudflare 健康檢查皆回 `500`。三級切換在共用路由測試通過，Render 與 Cloudflare 的正式復原仍待驗證。

## 2026-11-21 路由調整

- 水果連連看移除 Oracle，入口依序嘗試 Render、Cloudflare。已在官方入口確認連到 Cloudflare，也用兩位玩家驗證配對得分同步。Oracle 舊服務等到房間與連線都歸零後停用，SQLite 檔案保留。
- 小朋友下樓梯、疊疊高樓加入 Oracle → Render → Cloudflare。兩款都在 Oracle 真實雙人對局中強制重啟，等 55 秒後驗證原房、原席位及遊戲進度。小朋友下樓梯在對局中與復原後的最低可用記憶體為 325 與 318 MiB，疊疊高樓為 283 與 279 MiB。
- 兩款各開一個雙人房同時抽測，最低剩 289 MiB。當時炸彈小隊和前四個 Oracle 遊戲服務均為執行中。
- 主機的韌體更新服務 `fwupd` 設為閒置 30 秒後退出，週期更新計時器仍啟用。原設定留存於 `/var/backups/fwupd.conf.before-game-capacity`。
- Render 的兩個端點仍回 `503`。Cloudflare 兩款備援已驗證雙人開局與操作同步。
