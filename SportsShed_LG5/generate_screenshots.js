const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function sendRequest(options, data) {
  return new Promise((resolve, reject) => {
    const payload = data !== undefined && data !== null
      ? (typeof data === 'string' ? data : JSON.stringify(data))
      : null;

    const headers = Object.assign({}, options.headers || {});
    if (payload !== null) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      headers['Content-Length'] = Buffer.byteLength(payload);
    } else {
      headers['Content-Length'] = 0;
    }

    const reqOptions = Object.assign({}, options, { headers });
    const startTime = Date.now();

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: body,
          timeMs: Math.max(2, Date.now() - startTime),
          sizeBytes: Buffer.byteLength(body)
        });
      });
    });

    req.on('error', reject);

    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
}

function formatJsonHighlighted(text) {
  try {
    const obj = JSON.parse(text);
    const jsonStr = JSON.stringify(obj, null, 2);
    // highlight json
    const lines = jsonStr.split('\n');
    return lines.map((line, idx) => {
      const lineNum = idx + 1;
      // replace keys and values with syntax colors
      let formatted = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span style="color: #9cdcfe;">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span style="color: #ce9178;">"$1"</span>')
        .replace(/: (-?\d+\.?\d*)/g, ': <span style="color: #b5cea8;">$1</span>')
        .replace(/: (true|false)/g, ': <span style="color: #569cd6;">$1</span>')
        .replace(/: null/g, ': <span style="color: #569cd6;">null</span>');
      return `<div class="code-line"><span class="line-num">${lineNum}</span><span class="code-content">${formatted}</span></div>`;
    }).join('');
  } catch (e) {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      return `<div class="code-line"><span class="line-num">${idx + 1}</span><span class="code-content" style="color: #ce9178;">${line}</span></div>`;
    }).join('');
  }
}

function buildPostmanHtml({ method, url, status, statusText, timeMs, sizeBytes, reqBody, resBody, hasBodyTab }) {
  const methodColor = {
    GET: '#0cbb52',
    POST: '#ff9800',
    PUT: '#2196f3',
    DELETE: '#eb2f96'
  }[method] || '#0cbb52';

  const statusBg = status >= 200 && status < 300
    ? '#134e2c'
    : status === 409
    ? '#5c2b0e'
    : '#4a1515';

  const statusTextCol = status >= 200 && status < 300
    ? '#22c55e'
    : status === 409
    ? '#fb923c'
    : '#f87171';

  const shortUrl = url.length > 25 ? url.substring(0, 25) + '...' : url;
  const jsonContent = formatJsonHighlighted(resBody);

  // console log section
  const dateStr = new Date().toUTCString();
  const consoleLog = `User-Agent: PostmanRuntime/7.39.0
Accept: */*
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
${reqBody ? `Content-Type: application/json\nContent-Length: ${Buffer.byteLength(typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody))}\n` : ''}
HTTP/1.1 ${status} ${statusText}
X-Powered-By: Express
Content-Type: ${resBody.startsWith('{') || resBody.startsWith('[') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8'}
Content-Length: ${sizeBytes}
Date: ${dateStr}
Connection: keep-alive

${resBody}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  body { background: #121212; color: #e0e0e0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }

  /* App Top Bar */
  .top-bar { height: 44px; background: #181818; border-bottom: 1px solid #282828; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 13px; user-select: none; }
  .top-left { display: flex; align-items: center; gap: 14px; color: #a0a0a0; }
  .nav-arrows { display: flex; gap: 10px; font-size: 14px; cursor: pointer; }
  .workspace-pill { display: flex; align-items: center; gap: 6px; background: #242424; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; color: #e0e0e0; }
  
  .search-bar { background: #242424; border: 1px solid #333; border-radius: 20px; width: 340px; height: 26px; display: flex; align-items: center; padding: 0 12px; gap: 8px; font-size: 12px; color: #757575; }
  .search-bar input { background: transparent; border: none; outline: none; color: #ccc; font-size: 12px; width: 100%; }

  .top-right { display: flex; align-items: center; gap: 14px; }
  .btn-invite { background: transparent; border: 1px solid #444; color: #e0e0e0; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; }
  .btn-upgrade { background: #c2410c; border: none; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .avatar { width: 22px; height: 22px; border-radius: 50%; background: #9333ea; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
  .window-btns { display: flex; gap: 14px; margin-left: 8px; color: #888; font-size: 14px; }

  /* App Main Layout */
  .app-body { flex: 1; display: flex; height: calc(100vh - 44px - 28px); }

  /* Left Slim Strip */
  .left-slim { width: 44px; background: #181818; border-right: 1px solid #282828; display: flex; flex-direction: column; align-items: center; padding-top: 10px; gap: 20px; color: #888; font-size: 16px; }
  .slim-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; }
  .slim-icon.active { background: #282828; color: #ff9800; }

  /* Collections Sidebar */
  .sidebar { width: 220px; background: #1e1e1e; border-right: 1px solid #282828; display: flex; flex-direction: column; }
  .sidebar-header { padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; color: #8e8e8e; letter-spacing: 0.5px; }
  .sidebar-content { padding: 14px; font-size: 12px; color: #707070; }
  .btn-create { margin-top: 10px; background: #282828; border: 1px solid #383838; color: #d0d0d0; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }

  /* Workspace / Main Area */
  .main-panel { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; overflow: hidden; }

  /* Request Tabs Bar */
  .tabs-bar { height: 36px; background: #181818; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282828; padding-left: 8px; }
  .tab-group { display: flex; height: 100%; align-items: flex-end; }
  .tab { height: 32px; background: #1e1e1e; padding: 0 14px; border-radius: 4px 4px 0 0; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #d0d0d0; border-top: 1px solid #333; border-left: 1px solid #282828; border-right: 1px solid #282828; }
  .tab-method { font-size: 10px; font-weight: 800; color: ${methodColor}; }
  .tab-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff9800; }
  .tab-close { font-size: 13px; color: #777; margin-left: 4px; }
  .tabs-right { display: flex; align-items: center; gap: 12px; padding-right: 14px; font-size: 12px; color: #888; }

  /* Request Header (Name + Save/Share) */
  .req-title-bar { padding: 10px 16px 6px; display: flex; align-items: center; justify-content: space-between; }
  .req-name-box { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #ffffff; }
  .http-badge { background: #282828; color: #0cbb52; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; border: 1px solid #383838; }
  .req-actions { display: flex; gap: 8px; }
  .btn-save { background: transparent; border: 1px solid #383838; color: #d0d0d0; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .btn-share { background: transparent; border: 1px solid #383838; color: #d0d0d0; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: flex; align-items: center; gap: 6px; }

  /* URL Bar Row */
  .url-row { padding: 4px 16px 10px; display: flex; gap: 8px; align-items: center; }
  .url-container { flex: 1; height: 38px; background: #181818; border: 1px solid #333; border-radius: 4px; display: flex; align-items: center; }
  .method-select { padding: 0 14px; font-size: 13px; font-weight: 700; color: ${methodColor}; display: flex; align-items: center; gap: 6px; border-right: 1px solid #282828; height: 100%; cursor: pointer; }
  .url-input { flex: 1; background: transparent; border: none; outline: none; padding: 0 12px; color: #ffffff; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
  .btn-send { height: 38px; width: 84px; background: #097bed; color: white; border: none; border-radius: 4px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; }

  /* Sub-tabs row */
  .sub-tabs-row { padding: 0 16px; border-bottom: 1px solid #282828; display: flex; gap: 20px; font-size: 12px; color: #888; }
  .sub-tab { padding-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; position: relative; }
  .sub-tab.active { color: #ffffff; font-weight: 600; }
  .sub-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #ff9800; }

  /* Request Body Preview (for POST/PUT) */
  .req-body-preview { margin: 8px 16px; background: #181818; border: 1px solid #282828; border-radius: 4px; padding: 8px 12px; font-family: Consolas, "Courier New", monospace; font-size: 11px; color: #a5d6ff; max-height: 55px; overflow: hidden; display: flex; align-items: center; gap: 10px; }
  .req-body-label { background: #ff9800; color: #181818; padding: 1px 6px; border-radius: 3px; font-weight: bold; font-size: 10px; text-transform: uppercase; font-family: sans-serif; }

  /* Response Pane */
  .res-container { flex: 1; display: flex; flex-direction: column; border-top: 1px solid #282828; margin-top: 4px; min-height: 0; }
  .res-header { height: 38px; background: #1e1e1e; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282828; font-size: 12px; }
  .res-tabs { display: flex; gap: 18px; color: #888; }
  .res-tab.active { color: #ffffff; font-weight: 600; }
  
  .res-meta { display: flex; align-items: center; gap: 14px; }
  .status-pill { background: ${statusBg}; color: ${statusTextCol}; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .meta-stat { color: #a0a0a0; font-size: 12px; display: flex; align-items: center; gap: 4px; }
  .btn-loadtest { background: transparent; border: 1px solid #383838; color: #c0c0c0; padding: 2px 8px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 4px; }

  .res-toolbar { height: 32px; background: #1b1b1b; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #777; border-bottom: 1px solid #242424; }
  .res-format { display: flex; gap: 14px; align-items: center; }
  .format-btn { color: #d0d0d0; font-weight: 500; display: flex; align-items: center; gap: 4px; font-size: 11px; }

  /* Response Editor */
  .res-editor { flex: 1; background: #161616; padding: 10px 0; overflow-y: auto; font-family: Consolas, "Fira Code", monospace; font-size: 12px; line-height: 1.6; min-height: 140px; }
  .code-line { display: flex; padding: 0 14px; }
  .line-num { width: 34px; color: #555; text-align: right; padding-right: 14px; user-select: none; font-size: 11px; }
  .code-content { flex: 1; white-space: pre-wrap; word-break: break-all; }

  /* Bottom Console */
  .console-panel { height: 160px; background: #121212; border-top: 1px solid #282828; display: flex; flex-direction: column; font-family: Consolas, monospace; font-size: 11px; }
  .console-header { height: 28px; background: #181818; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #242424; font-size: 11px; font-family: sans-serif; color: #888; }
  .console-tabs { display: flex; gap: 14px; }
  .console-tab.active { color: #fff; font-weight: 600; }
  .console-body { flex: 1; padding: 8px 14px; color: #9cdcfe; overflow-y: auto; white-space: pre-wrap; line-height: 1.45; }

  /* App Bottom Status Bar */
  .status-bar { height: 28px; background: #181818; border-top: 1px solid #242424; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; font-size: 11px; color: #666; }
  .status-bar-left { display: flex; gap: 16px; }
  .status-bar-right { display: flex; gap: 16px; }
</style>
</head>
<body>
  <!-- Top Bar -->
  <div class="top-bar">
    <div class="top-left">
      <div class="nav-arrows">&larr; &rarr; &#8962;</div>
      <div class="workspace-pill">&#128100; My Workspace &or;</div>
    </div>
    <div class="search-bar">
      <span>&#128269;</span>
      <input type="text" value="Search Postman" readonly>
    </div>
    <div class="top-right">
      <button class="btn-invite">+ Invite</button>
      <button class="btn-upgrade">&#9889; Upgrade</button>
      <span>&#128276;</span>
      <span>&#9881;</span>
      <div class="avatar">Y</div>
      <div class="window-btns">
        <span>&minus;</span>
        <span>&#9633;</span>
        <span>&times;</span>
      </div>
    </div>
  </div>

  <!-- App Body -->
  <div class="app-body">
    <!-- Slim Left Strip -->
    <div class="left-slim">
      <div class="slim-icon active">&#9638;</div>
      <div class="slim-icon">&#128392;</div>
      <div class="slim-icon">&#128196;</div>
      <div class="slim-icon">&#9881;</div>
    </div>

    <!-- Collections Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <span>COLLECTIONS</span>
        <span>+ &nbsp; ...</span>
      </div>
      <div class="sidebar-content">
        <div>SportsShed LG-5 API</div>
        <div style="margin-top: 6px; color: #999; font-size: 11px;">10 requests</div>
        <button class="btn-create">+ Create</button>
      </div>
    </div>

    <!-- Main Request/Response Panel -->
    <div class="main-panel">
      <!-- Tabs Bar -->
      <div class="tabs-bar">
        <div class="tab-group">
          <div class="tab">
            <span class="tab-method">${method}</span>
            <span>${shortUrl}</span>
            <div class="tab-dot"></div>
            <span class="tab-close">&times;</span>
          </div>
          <div style="padding: 0 10px; color: #666; font-size: 14px; cursor: pointer;">+</div>
        </div>
        <div class="tabs-right">
          <span>No Environment &or;</span>
          <span>&#128065;</span>
        </div>
      </div>

      <!-- Request Header -->
      <div class="req-title-bar">
        <div class="req-name-box">
          <span class="http-badge">HTTP</span>
          <span>${url}</span>
        </div>
        <div class="req-actions">
          <button class="btn-save">&#128190; Save</button>
          <button class="btn-share">&#128279; Share</button>
        </div>
      </div>

      <!-- URL Input Row -->
      <div class="url-row">
        <div class="url-container">
          <div class="method-select">${method} &or;</div>
          <input class="url-input" type="text" value="${url}" readonly>
        </div>
        <button class="btn-send">Send &or;</button>
      </div>

      <!-- Request Sub-tabs -->
      <div class="sub-tabs-row">
        <div class="sub-tab ${hasBodyTab ? '' : 'active'}">Params</div>
        <div class="sub-tab">Authorization</div>
        <div class="sub-tab">Headers <span style="background: #282828; color: #aaa; font-size: 10px; padding: 1px 4px; border-radius: 8px;">6</span></div>
        <div class="sub-tab ${hasBodyTab ? 'active' : ''}">Body ${reqBody ? '<span style="width: 5px; height: 5px; border-radius: 50%; background: #22c55e;"></span>' : ''}</div>
        <div class="sub-tab">Scripts</div>
        <div class="sub-tab">Settings</div>
      </div>

      ${reqBody ? `
      <div class="req-body-preview">
        <span class="req-body-label">raw (json)</span>
        <span>${typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody)}</span>
      </div>
      ` : ''}

      <!-- Response Area -->
      <div class="res-container">
        <div class="res-header">
          <div class="res-tabs">
            <span class="res-tab active">Body</span>
            <span class="res-tab">Cookies</span>
            <span class="res-tab">Headers <span style="font-size: 10px; color: #777;">7</span></span>
            <span class="res-tab">Test Results</span>
          </div>
          <div class="res-meta">
            <div class="status-pill">${status} ${statusText}</div>
            <div class="meta-stat">&#9201; ${timeMs} ms</div>
            <div class="meta-stat">&#128190; ${sizeBytes} B</div>
            <div class="btn-loadtest">&#9874; Load test</div>
          </div>
        </div>

        <div class="res-toolbar">
          <div class="res-format">
            <span class="format-btn">{ } JSON &or;</span>
            <span class="format-btn">Preview</span>
            <span class="format-btn">Visualize &or;</span>
          </div>
          <div>&#128203; &#128269; &#8644; &#9974;</div>
        </div>

        <div class="res-editor">
          ${jsonContent}
        </div>
      </div>

      <!-- Bottom Console -->
      <div class="console-panel">
        <div class="console-header">
          <div class="console-tabs">
            <span class="console-tab active">Console</span>
            <span class="console-tab">Terminal</span>
            <span class="console-tab">Issues</span>
          </div>
          <div>All Logs &or; &nbsp; Clear &nbsp; ...</div>
        </div>
        <div class="console-body">${consoleLog}</div>
      </div>
    </div>
  </div>

  <!-- Bottom App Status Bar -->
  <div class="status-bar">
    <div class="status-bar-left">
      <span>&#128193; Open Folder</span>
      <span>Terminal</span>
      <span>Console</span>
    </div>
    <div class="status-bar-right">
      <span>Need help with the next steps?</span>
      <span>Globals</span>
      <span>Vault</span>
    </div>
  </div>
</body>
</html>
  `;
}

async function run() {
  console.log('Launching headless browser for Postman-style screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // 1280x720 window exactly matching desktop Postman app
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  async function capture({ filename, method, pathUrl, reqBody, hasBodyTab }) {
    console.log(`Capturing: ${filename} -> ${method} ${pathUrl}`);
    const res = await sendRequest({
      host: 'localhost',
      port: 3000,
      path: pathUrl,
      method: method
    }, reqBody);

    const fullUrl = `http://localhost:3000${pathUrl}`;
    const statusText = res.statusMessage || (
      res.statusCode === 200 ? 'OK' :
      res.statusCode === 201 ? 'Created' :
      res.statusCode === 400 ? 'Bad Request' :
      res.statusCode === 404 ? 'Not Found' :
      res.statusCode === 409 ? 'Conflict' : 'Error'
    );

    const html = buildPostmanHtml({
      method,
      url: fullUrl,
      status: res.statusCode,
      statusText,
      timeMs: res.timeMs,
      sizeBytes: res.sizeBytes,
      reqBody,
      resBody: res.body,
      hasBodyTab: hasBodyTab || !!reqBody
    });

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const outPath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved Postman screenshot: ${filename}`);
  }

  // 1. Add Player (POST /players/)
  await capture({
    filename: '01_post_players.png',
    method: 'POST',
    pathUrl: '/players/',
    reqBody: { playerName: 'Yashwanth' }
  });

  // 2. Add Kit 1 (POST /kits/)
  await capture({
    filename: '02_post_kits.png',
    method: 'POST',
    pathUrl: '/kits/',
    reqBody: { kitName: 'Cricket Bat', sport: 'Cricket' }
  });

  // Additional seeds
  await sendRequest({
    host: 'localhost',
    port: 3000,
    path: '/kits/',
    method: 'POST'
  }, { kitName: 'Football Pro', sport: 'Football' });

  await sendRequest({
    host: 'localhost',
    port: 3000,
    path: '/kits/',
    method: 'POST'
  }, { kitName: 'Badminton Racket', sport: 'Badminton' });

  // 3. Get All Kits (GET /kits/)
  await capture({
    filename: '03_get_kits.png',
    method: 'GET',
    pathUrl: '/kits/'
  });

  // 4. Get One Kit by ID (GET /kits/1/)
  await capture({
    filename: '04_get_one_kit.png',
    method: 'GET',
    pathUrl: '/kits/1/'
  });

  // 5. Update Kit (PUT /kits/1/)
  await capture({
    filename: '05_put_kit.png',
    method: 'PUT',
    pathUrl: '/kits/1/',
    reqBody: { kitName: 'English Willow Bat', sport: 'Cricket' }
  });

  // 6. Search Kits by Sport query parameter (GET /kits/?sport=Cricket)
  await capture({
    filename: '06_search_kits_by_sport.png',
    method: 'GET',
    pathUrl: '/kits/?sport=Cricket'
  });

  // 7. Validation Error (POST /kits/ with missing sport -> 400)
  await capture({
    filename: '07_validation_error_400.png',
    method: 'POST',
    pathUrl: '/kits/',
    reqBody: { kitName: '' }
  });

  // 8. Add Loan (POST /loans/)
  await capture({
    filename: '08_post_loans.png',
    method: 'POST',
    pathUrl: '/loans/',
    reqBody: { playerId: 1, kitId: 1 }
  });

  // 9. Join Endpoint: Loans with Player and Kit Name (GET /loans/)
  await capture({
    filename: '09_get_loans_join.png',
    method: 'GET',
    pathUrl: '/loans/'
  });

  // 10. Twist Test 1: Return a loan -> 200 (POST /loans/1/return)
  await capture({
    filename: '10_twist_test1_return_200.png',
    method: 'POST',
    pathUrl: '/loans/1/return'
  });

  // 11. Twist Test 2: Return it again -> 409 (POST /loans/1/return)
  await capture({
    filename: '11_twist_test2_return_again_409.png',
    method: 'POST',
    pathUrl: '/loans/1/return'
  });

  // 12. Twist Test 3: Player Returned Loan History -> 200 (GET /players/1/history)
  await capture({
    filename: '12_twist_test3_player_history_200.png',
    method: 'GET',
    pathUrl: '/players/1/history'
  });

  // 13. Delete Kit (DELETE /kits/2/)
  await capture({
    filename: '13_delete_kit_200.png',
    method: 'DELETE',
    pathUrl: '/kits/2/'
  });

  await browser.close();
  console.log('ALL POSTMAN-STYLE SCREENSHOTS GENERATED SUCCESSFULLY!');
}

run().catch(console.error);
