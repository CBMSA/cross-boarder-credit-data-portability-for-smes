can you please write a backend for these html files 

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PhotoChat Meeting Platform</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      padding: 2rem;
      background-color: #f4f4f4;
    }
    .logo {
      max-height: 80px;
      margin-bottom: 1rem;
    }
    .video-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    video {
      width: 300px;
      height: 200px;
      border: 2px solid #333;
    }
    .controls, .presentation, .voice-message, .chat-box {
      margin-top: 20px;
    }
    #meetingLink {
      margin-top: 10px;
      font-weight: bold;
      word-break: break-word;
    }
    .chat-box {
      border: 1px solid #ccc;
      padding: 10px;
      background-color: white;
      max-height: 300px;
      overflow-y: auto;
    }
    .chat-input {
      display: flex;
      margin-top: 10px;
    }
    .chat-input input {
      flex: 1;
      margin-right: 10px;
    }
    footer {
      margin-top: 40px;
      text-align: center;
      font-size: 0.9rem;
      color: #666;
    }
    #chatbot-response {
      font-style: italic;
      color: #007BFF;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="file_00000000a29461f8b024cd6dbdc42bcf (1).png" alt="Photo Chat Logo" class="logo">
    <h2>📷 PhotoChat Video Conference</h2>
    <a href="index.html" class="btn">Home</a> |
    <a href="photo-chatbusiness.html" class="btn">Chat Business</a> |
    <a href="sadccbdc.html" class="btn">Treasures Portal</a> |
    <a href="tradecbdc.html" class="btn">Tokenized Trading</a> |
    <a href="transactions.html" class="btn">SADC Gov SMEs Grants</a> |
    <a href="citizenswallet.html" class="btn">Citizens Wallet</a> |
    <a href="trade.html" class="btn">SADI Trading</a>

   <div id="exchange" class="mt-5">
    <h4>Live Exchange Rates</h4>
    <div id="rates">Loading...</div>
  </div>


    <!-- Meeting Join/Create -->
    <div class="controls">
      <input type="text" id="meetingId" class="form-control" placeholder="Enter or create Meeting ID">
      <button onclick="startMeeting()" class="btn btn-primary mt-2">Start/Join Meeting</button>
      <div id="meetingLink"></div>
    </div>

    <!-- Video Conference -->
    <div class="video-container mt-4" id="videoContainer">
      <video id="localVideo" autoplay muted></video>
      <video id="remoteVideo" autoplay></video>
    </div>

    <!-- Presentation Upload -->
    <div class="presentation">
      <h4>Upload Presentation</h4>
      <input type="file" accept="application/pdf,.ppt,.pptx" onchange="uploadPresentation(event)">
      <iframe id="presentationViewer" style="width: 100%; height: 400px; border: 1px solid gray;"></iframe>
    </div>

    <!-- Voice Message -->
    <div class="voice-message">
      <h4>Send Voice Message (Internet-Free Mode)</h4>
      <button onclick="startRecording()" class="btn btn-secondary">Start</button>
      <button onclick="stopRecording()" class="btn btn-danger">Stop</button>
      <audio id="audioPlayback" controls></audio>
    </div>
  </div>

  <script>
    let localStream;
    let mediaRecorder;
    let audioChunks = [];
    let recordingChunks = [];
    let fullRecorder;

    async function startMeeting() {
      const meetingId = document.getElementById('meetingId').value || generateMeetingId();
      document.getElementById('meetingId').value = meetingId;

      const link = `${window.location.origin}/meet/${meetingId}`;
      document.getElementById('meetingLink').innerHTML = `Meeting Link: <a href="${link}" target="_blank">${link}</a>`;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('localVideo').srcObject = stream;
      localStream = stream;

      fullRecorder = new MediaRecorder(stream);
      fullRecorder.ondataavailable = e => recordingChunks.push(e.data);
      fullRecorder.onstop = () => {
        const blob = new Blob(recordingChunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'meeting-recording.webm';
        a.click();
      };
      fullRecorder.start();

      // WebRTC signaling would go here
    }

    function generateMeetingId() {
      return 'meet-' + Math.random().toString(36).substring(2, 10);
    }

    function uploadPresentation(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('presentationViewer').src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    }

    function startRecording() {
      if (!localStream) return alert('Start the meeting first.');
      mediaRecorder = new MediaRecorder(localStream);
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        document.getElementById('audioPlayback').src = url;
      };
      audioChunks = [];
      mediaRecorder.start();
    }

    function stopRecording() {
      if (mediaRecorder) mediaRecorder.stop();
      if (fullRecorder) fullRecorder.stop();
    }

        // 🔁 Live Exchange Rates from EODHD
    const eodhdToken = "67b2d451e5b8a8.90504186";  // <- Replace this with your real API key
    const currencySymbols = ["ZAR", "USD", "BWP", "MZN", "XDR", "XAU"];

    async function fetchExchangeRates() {
      const ratesDiv = document.getElementById("rates");
      let output = "<ul class='list-group'>";
      for (let symbol of currencySymbols) {
        try {
          const res = await fetch(`https://eodhd.com/api/live/${symbol}.FOREX?api_token=${eodhdToken}&fmt=json`);
          const data = await res.json();
          const rate = data.close || data.price;
          output += `<li class="list-group-item"><strong>${symbol}</strong>: ${rate}</li>`;
        } catch (error) {
          output += `<li class="list-group-item text-danger">${symbol}: Error</li>`;
        }
      }
      output += "</ul>";
      ratesDiv.innerHTML = output;
    }

    window.onload = fetchExchangeRates;
  </script>
</body>
</html>


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SADC CBDC Wallet Portal</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    body { background-color: #f7f7f9; }
    .container { max-width: 450px; margin-top: 48px; }
    .qrcode { margin: 12px auto; width: fit-content; }
    .logo { height: 40px; margin-left: 12px; }
  </style>
</head>
<body>

  <header class="d-flex align-items-center justify-content-between mb-4">
    <img src="file_00000000968061f89abd9d3d435098f1.png" alt="SCB Logo" class="logo">
    <h3>SADC Wallet</h3>
  </header>

  <nav>
    <a href="index.html" class="btn">Credit Data</a>|
    <a href="transactions.html" class="btn">Transactions Payments</a>|
    <a href="sadccbdc.html" class="btn">SADC CBDC</a>|
  <a href="index.html" class="btn">Home</a>|
  <a href="photo-chatbusiness.html"class="btn">Chat Business</a>|
  <a href="transactions.html" class="btn">SADC Gov SMEs Grants</a>
  </nav>

  <div class="container">
    <h2 class="text-center mb-4">SADC CBDC Wallet Portal</h2>

    <!-- Registration Section -->
    <div class="card mb-3 p-3">
      <h5>Register Wallet</h5>
      <input type="text" class="form-control mb-2" placeholder="Full Name" id="regName" />
      <input type="text" class="form-control mb-2" placeholder="National ID" id="regNationalId" />
      <input type="text" class="form-control mb-2" placeholder="Biometric Hash (simulate)" id="regBio" />
      <button class="btn btn-primary w-100" onclick="registerWallet()">Register</button>
      <div id="regResult" class="text-success mt-2"></div>
    </div>

    <!-- Login Section -->
    <div class="card mb-3 p-3">
      <h5>Biometric Login</h5>
      <input type="text" class="form-control mb-2" placeholder="National ID" id="loginNationalId" />
      <input type="text" class="form-control mb-2" placeholder="Biometric Hash (simulate)" id="loginBio" />
      <button class="btn btn-dark w-100" onclick="biometricLogin()">Login</button>
      <div id="loginResult" class="text-success mt-2"></div>
      <div id="loginError" class="text-danger mt-1"></div>
    </div>

    <!-- Wallet Section -->
    <div id="walletSection" style="display:none;">
      <div class="card mb-3 p-3">
        <h5>Wallet Actions</h5>
        <button class="btn btn-outline-info mb-2" onclick="checkBalance()">Check Balance</button>
        <div id="balanceResult" class="mb-2"></div>
        <input type="text" class="form-control mb-2" placeholder="Recipient Wallet ID" id="toWallet" />
        <input type="number" class="form-control mb-2" placeholder="Amount (ZAR)" id="transferAmount" />
        <button class="btn btn-success w-100" onclick="transferFunds()">Transfer</button>
        <div id="transferResult" class="text-success mt-2"></div>
        <div class="qrcode" id="walletQR"></div>
        <div class="small text-muted text-center" id="walletIdLabel"></div>
      </div>
    </div>

    <!-- USSD Section -->
    <div class="card p-3 mb-4">
      <h6>USSD Demo</h6>
      <input type="text" class="form-control mb-2" id="ussdInput" placeholder="Type USSD input e.g. 1, 2" />
      <button class="btn btn-secondary w-100 mb-2" onclick="sendUSSD()">Send USSD</button>
      <div id="ussdResult" style="white-space:pre-line;"></div>
      <div class="small text-muted mt-2">Dial <span class="text-success fw-bold">*134*CBDC#</span> on your phone for real USSD</div>
    </div>

    <!-- CoinMarketCap Price Section -->
    <div class="card p-3 mb-4">
      <h6>Market Price (via CoinMarketCap)</h6>
      <button class="btn btn-outline-primary w-100 mb-2" onclick="getMarketPrice()">Get SADICoin/ZAR</button>
      <div id="cmcPriceResult" class="text-primary fw-bold text-center"></div>
    </div>

    <footer class="text-center small mt-4 text-muted">&copy; 2025 SADC CBDC Wallet Portal</footer>
  </div>

  <script>
    let walletId = null;
    let privateKey = null;

    function registerWallet() {
      const name = document.getElementById('regName').value;
      const nationalId = document.getElementById('regNationalId').value;
      const biometricHash = document.getElementById('regBio').value;
      fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nationalId, biometricHash })
      })
      .then(r => r.json())
      .then(data => {
        if(data.walletId){
          walletId = data.walletId;
          privateKey = data.privateKey;
          document.getElementById('regResult').innerHTML = `Registered!<br>Wallet ID: <b>${walletId}</b><br><span class="small">Save your private key safely.</span>`;
          showWallet(walletId);
        } else {
          document.getElementById('regResult').innerText = "Registration failed.";
        }
      });
    }

    function biometricLogin() {
      const nationalId = document.getElementById('loginNationalId').value;
      const biometricHash = document.getElementById('loginBio').value;
      fetch('http://localhost:3000/auth/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId, biometricHash })
      })
      .then(r => r.json())
      .then(data => {
        if(data.walletId){
          walletId = data.walletId;
          document.getElementById('loginResult').innerText = `Login successful!`;
          document.getElementById('loginError').innerText = '';
          showWallet(walletId);
        } else {
          document.getElementById('loginError').innerText = data.error || "Login failed.";
        }
      });
    }

    function showWallet(wid) {
      document.getElementById('walletSection').style.display = '';
      document.getElementById('walletIdLabel').innerHTML = `<span class="fw-bold">Wallet ID:</span> <span class="text-primary">${wid}</span>`;
      // Generate QR
      document.getElementById('walletQR').innerHTML = '';
      new QRCode(document.getElementById('walletQR'), wid);
    }

    function checkBalance() {
      if(!walletId) return;
      fetch(`http://localhost:3000/balance/${walletId}`)
      .then(r => r.json())
      .then(data => {
        if(data.balance !== undefined) {
          document.getElementById('balanceResult').innerHTML = `<b>Balance:</b> ZAR ${data.balance}`;
        } else {
          document.getElementById('balanceResult').innerText = "Balance fetch error.";
        }
      });
    }

    function transferFunds() {
      const toWallet = document.getElementById('toWallet').value;
      const amount = parseFloat(document.getElementById('transferAmount').value);
      if(!walletId || !toWallet || !amount) {
        document.getElementById('transferResult').innerText = "Please fill all fields.";
        return;
      }
      fetch('http://localhost:3000/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWallet: walletId, toWallet, amount })
      })
      .then(r => r.json())
      .then(data => {
        if(data.message){
          document.getElementById('transferResult').innerText = data.message;
        } else {
          document.getElementById('transferResult').innerText = data.error || "Transfer failed";
        }
      });
    }

    function sendUSSD() {
      const text = document.getElementById('ussdInput').value;
      const phoneNumber = "testUser"; // Simulate MSISDN
      fetch('http://localhost:3000/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, phoneNumber })
      })
      .then(r => r.text())
      .then(data => {
        document.getElementById('ussdResult').innerText = data;
      });
    }

    function getMarketPrice() {
      const apiKey = '0b53aa75-9da6-41c8-bbba-eb33bf350d3a'; // Replace with your actual key
      fetch('https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=1&symbol=BTC&convert=ZAR', {
        method: 'GET',
        headers: {
          'X-CMC_PRO_API_KEY': apiKey
        }
      })
      .then(response => response.json())
      .then(data => {
        if(data && data.data && data.data.quote && data.data.quote.ZAR) {
          const price = data.data.quote.ZAR.price.toFixed(2);
          document.getElementById('cmcPriceResult').innerText = `1 BTC = ZAR ${price}`;
        } else {
          document.getElementById('cmcPriceResult').innerText = 'Price fetch failed.';
        }
      })
      .catch(err => {
        document.getElementById('cmcPriceResult').innerText = 'Error contacting CoinMarketCap.';
        console.error(err);
      });
    }
  </script>
</body>
</html>


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sadicoin Wallet (SADI)</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://cdn.moonpay.com https://unpkg.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://unpkg.com; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:;">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <script src="https://unpkg.com/@moonpay/moonpay-js"></script>
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Ubuntu,"Helvetica Neue",Arial,sans-serif;margin:20px;background:#f9fafb;color:#333;line-height:1.6;}
    h1{text-align:center;color:#0055aa;margin-bottom:24px;font-weight:700;}
    .box{background:#fff;border:1px solid #ddd;padding:20px 24px 24px;border-radius:12px;margin-bottom:20px;max-width:480px;margin-left:auto;margin-right:auto;box-shadow:0 4px 10px rgba(0,0,0,.05);}
    h3{margin-top:0;margin-bottom:12px;color:#004080;font-weight:600;border-bottom:2px solid #0055aa;padding-bottom:6px;}
    input,select{width:100%;padding:10px 14px;margin:6px 0 12px;border:1.5px solid #bbb;border-radius:8px;font-size:1rem;}
    input:focus,select:focus{border-color:#0055aa;outline:none;box-shadow:0 0 6px #85baffaa;}
    button{background:#0055aa;color:#fff;border:none;border-radius:8px;padding:12px 18px;cursor:pointer;font-size:1.1rem;font-weight:600;width:100%;margin-top:6px;}
    button:hover{background:#003f7f;}
    #wallet_info,#conv_res,#disb_res,#send_res{background:#eef6ff;border:1px solid #bbe0ff;padding:12px 16px;border-radius:8px;font-family:monospace;white-space:pre-wrap;color:#003366;margin-top:10px;min-height:50px;}
    @media (max-width:520px){body{margin:10px}.box{max-width:100%;padding:16px 18px 18px}button{font-size:1rem;padding:10px 14px}}
  </style>
</head>
<body>
  <h1>Sadicoin Wallet (SADI)</h1>

  <div class="box">
    <h3>Register</h3>
    <input id="r_name" placeholder="Full name" type="text">
    <input id="r_email" placeholder="Email" type="email">
    <input id="r_phone" placeholder="Phone" type="text">
    <input id="r_pass" placeholder="Password" type="password">
    <button onclick="register()">Register (airdrop 100 SADI)</button>
  </div>

  <div class="box">
    <h3>Login</h3>
    <input id="l_email" placeholder="Email" type="email">
    <input id="l_pass" placeholder="Password" type="password">
    <button onclick="login()">Login</button>
  </div>

  <div class="box">
    <h3>Wallet</h3>
    <div id="wallet_info">Not logged in</div>
    <button onclick="loadWallet()">Refresh Wallet</button>
  </div>

  <div class="box">
    <h3>Send SADI</h3>
    <input id="to_addr" placeholder="Recipient EVM address (0x...)" type="text">
    <input id="to_amt" placeholder="Amount (SADI)" type="number" step="0.000000000000000001">
    <button onclick="send()">Send</button>
    <div id="send_res"></div>
  </div>

  <div class="box">
    <h3>Swap via MoonPay</h3>
    <input id="swap_from" placeholder="From currency (btc, eth, usdt)" type="text">
    <input id="swap_to" placeholder="To currency (eth, btc, usdc)" type="text">
    <input id="swap_amt" placeholder="Amount" type="number" min="0.0001" step="0.0001">
    <button onclick="openSwap()">Swap Now</button>
  </div>

  <script>
    // Mock user database (in localStorage for prototype)
    const USERS_KEY = "sadi_users";
    const TOKEN_KEY = "sadi_token";

    function getUsers() {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    }

    function saveUsers(users) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function generateAddress() {
      const hex = Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');
      return "0x" + hex;
    }

    function register() {
      const name = document.getElementById("r_name").value.trim();
      const email = document.getElementById("r_email").value.trim().toLowerCase();
      const phone = document.getElementById("r_phone").value.trim();
      const password = document.getElementById("r_pass").value;

      if (!name || !email || !phone || !password) return alert("Please fill all fields.");

      const users = getUsers();

      if (users[email]) {
        alert("User already exists.");
        return;
      }

      const wallet = {
        address: generateAddress(),
        balance: 100.0
      };

      users[email] = {
        name, email, phone, password, wallet
      };

      saveUsers(users);
      localStorage.setItem(TOKEN_KEY, email);
      alert("Registered! Wallet created and credited.");
      loadWallet();
    }

    function login() {
      const email = document.getElementById("l_email").value.trim().toLowerCase();
      const password = document.getElementById("l_pass").value;

      const users = getUsers();

      if (!users[email] || users[email].password !== password) {
        alert("Invalid email or password.");
        return;
      }

      localStorage.setItem(TOKEN_KEY, email);
      alert("Login successful.");
      loadWallet();
    }

    function loadWallet() {
      const walletEl = document.getElementById("wallet_info");
      const email = localStorage.getItem(TOKEN_KEY);
      const users = getUsers();

      if (!email || !users[email]) {
        walletEl.innerText = "Not logged in";
        return;
      }

      const user = users[email];
      walletEl.innerText = `Address: ${user.wallet.address}\nBalance: ${user.wallet.balance.toFixed(6)} SADI`;
    }

    function send() {
      const to = document.getElementById("to_addr").value.trim();
      const amount = parseFloat(document.getElementById("to_amt").value);
      const email = localStorage.getItem(TOKEN_KEY);
      const users = getUsers();
      const res = document.getElementById("send_res");

      if (!email || !users[email]) return alert("Login first.");
      if (!to || isNaN(amount) || amount <= 0) return alert("Enter valid recipient and amount.");

      const user = users[email];

      if (user.wallet.balance < amount) {
        res.innerText = "Insufficient balance.";
        return;
      }

      user.wallet.balance -= amount;

      // Optionally simulate receiving wallet
      res.innerText = `Sent ${amount} SADI to ${to}`;
      saveUsers(users);
      loadWallet();
    }

    async function openSwap() {
      const from = document.getElementById("swap_from").value.trim().toLowerCase();
      const to = document.getElementById("swap_to").value.trim().toLowerCase();
      const amt = document.getElementById("swap_amt").value;

      if (!from || !to || !amt) return alert("Enter from, to, and amount.");

      try {
        const moonPay = await loadMoonPay();
        const moonPaySdk = moonPay({
          flow: 'buy', // or 'swap'
          environment: 'sandbox',
          variant: 'overlay',
          params: {
            apiKey: 'pk_test_txsJargoBKFPE73J06Myz1mYLqlwwssb',
            baseCurrencyCode: from,
            baseCurrencyAmount: amt,
            defaultCurrencyCode: to,
            theme: 'dark'
          }
        });
        moonPaySdk.show();
      } catch (err) {
        console.error("MoonPay failed:", err);
        alert("Could not open MoonPay widget.");
      }
    }

    // On load
    window.addEventListener("load", loadWallet);
  </script>
</body>
</html>



<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sadicoin Treasures Wallet</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    body { font-family: 'Segoe UI'; padding: 20px; background-color: #f9f9f9; }
    nav a { margin-right: 15px; text-decoration: none; color: #0d6efd; font-weight: bold; }
    .logo { height: 60px; }
  </style>
</head>
<body>
  <header class="d-flex align-items-center justify-content-between mb-4">
    <img src="file_00000000968061f89abd9d3d435098f1.png" alt="SCB Logo" class="logo">
    <h3>SADC Wallet</h3>
  </header>

  <nav class="mb-4">
    <a href="#register" class="btn">Register</a>
    <a href="#login" class="btn">Login</a>
    <a href="#transactions" class="btn">Transactions</a>
    <a href="#exchange" class="btn">Exchange Rates</a>
    <a href="index.html" class="btn">Home</a>|
    <a href="photochatmeetings.html"class="btn">Chat Business</a>|
    <a href="sadccbdc.html" class="btn">Treasures PORTAL </a>|
    <a href="transactions.html" class="btn">SADC Gov SMEs Grants</a>|
    <a href="tokenizedbond.html">Tokenized Bond Wallet</a> |  
    <a href="sad banknotes.html">Our Banknotes and coins</a>
  </nav>

  <!-- Registration -->
  <div id="register">
    <h4>Account Registration</h4>
    <select id="role" class="form-control mb-2">
      <option value="user">User</option>
      <option value="srb_admin">SRB Admin</option>
      <option value="regional_bank">Regional Central Bank</option>
      <option value="national_treasury">National Treasury</option>
    </select>
    <input type="text" id="name" class="form-control mb-2" placeholder="Full Name">
    <input type="text" id="idNumber" class="form-control mb-2" placeholder="National ID">
    <input type="text" id="walletAddress" class="form-control mb-2" placeholder="Wallet Address">
    <input type="password" id="password" class="form-control mb-2" placeholder="Create Password">
    <button class="btn btn-primary w-100" onclick="registerUser()">Register</button>
  </div>

  <!-- Login -->
  <div id="login" class="mt-5">
    <h4>Login</h4>
    <input type="text" id="loginId" class="form-control mb-2" placeholder="ID Number">
    <input type="password" id="loginPassword" class="form-control mb-2" placeholder="Password">
    <button class="btn btn-success w-100" onclick="loginUser()">Login</button>
    <p id="loginError" class="text-danger"></p>
  </div>

  <!-- Transactions -->
  <div id="transactions" class="mt-5" style="display:none;">
    <h4>Send SADICOIN</h4>
    <p>Balance: <span id="balance">SADICOIN 0</span></p>
    <input type="text" id="toAccount" class="form-control mb-2" placeholder="Recipient Wallet Address">
    <input type="number" id="amount" class="form-control mb-2" placeholder="Amount (SADICOIN)">
    <button class="btn btn-dark w-100 mb-2" onclick="sendTransaction()">Send</button>
    <div id="txResult" class="alert alert-info mt-3" style="display:none;"></div>
    <div id="qr"></div>
    <button class="btn btn-outline-secondary mt-3" onclick="generatePDF()">Download PDF Report</button>

    <hr>
    <div id="conversion" class="mt-4">
      <h5>Currency & Asset Conversion</h5>
      <p>USD Value: <strong id="usdValue">-</strong></p>
      <p>SPY ETF Units: <strong id="spyValue">-</strong></p>
      <p>Gold (Ounces): <strong id="goldValue">-</strong></p>
    </div>
  </div>

  <!-- MoonPay Swap -->
  <div id="swap" class="mt-5">
    <h4>Swap SADICOIN</h4>
    <div class="mb-2">
      <input type="text" id="swap_from" class="form-control mb-2" placeholder="From Currency (e.g., SADI)">
      <input type="text" id="swap_to" class="form-control mb-2" placeholder="To Currency (e.g., USD)">
      <input type="number" id="swap_amt" class="form-control mb-2" placeholder="Amount">
      <button class="btn btn-warning w-100" onclick="openSwap()">Swap via MoonPay</button>
    </div>
  </div>

  <!-- CoinMarketCap Price -->
  <div class="card p-3 mb-4">
    <h6>Market Price (via CoinMarketCap)</h6>
    <button class="btn btn-outline-primary w-100 mb-2" onclick="getMarketPrice()">Get SADICoin/ZAR</button>
    <div id="cmcPriceResult" class="text-primary fw-bold text-center"></div>
  </div>

  <!-- Live Exchange Rates -->
  <div id="exchange" class="mt-5">
    <h4>Live Exchange Rates</h4>
    <div id="rates"></div>
  </div>

  <footer class="mt-5 text-center">
    <p>&copy; 2025 SCB - SadiCoin. All rights reserved. Licensed and regulated by SCB.</p>
  </footer>

  <script>
    let users = {};
    let currentUser = null;
    let txHistory = [];
    const apiKey = '67b2d451e5b8a8.90504186';

    function registerUser() {
      const role = document.getElementById("role").value;
      const name = document.getElementById("name").value;
      const id = document.getElementById("idNumber").value;
      const wallet = document.getElementById("walletAddress").value;
      const password = document.getElementById("password").value;
      if (!name || !id || !wallet || !password) return alert("All fields required");
      if (users[id]) return alert("User already exists");

      users[id] = { id, name, role, wallet, password, balance: 1000000 };
      alert("Registered. Login to continue.");
    }

    function loginUser() {
      const id = document.getElementById("loginId").value;
      const password = document.getElementById("loginPassword").value;
      if (!users[id] || users[id].password !== password) {
        document.getElementById("loginError").innerText = "Login failed. Check credentials.";
        return;
      }
      currentUser = users[id];
      document.getElementById("transactions").style.display = "block";
      document.getElementById("balance").innerText = `SADICOIN ${currentUser.balance.toLocaleString()}`;
      fetchConversions(currentUser.balance);
      fetchExchangeRates();
    }

    function sendTransaction() {
      const to = document.getElementById("toAccount").value;
      const amount = parseFloat(document.getElementById("amount").value);
      if (!to || isNaN(amount)) return alert("Invalid input");
      if (amount > currentUser.balance) return alert("Insufficient funds");

      const tax = amount * 0.02;
      const net = amount - tax;
      const txId = Math.floor(Math.random() * 1e12).toString(16);
      currentUser.balance -= amount;

      const tx = { id: txId, from: currentUser.id, to, amount, tax, net, timestamp: new Date().toISOString() };
      txHistory.push(tx);
      document.getElementById("balance").innerText = `SADICOIN ${currentUser.balance.toLocaleString()}`;
      document.getElementById("txResult").style.display = 'block';
      document.getElementById("txResult").innerText = `Tx ID: ${tx.id}\nSent: ${net.toFixed(2)} SADICOIN (Tax: ${tax.toFixed(2)})`;
      document.getElementById("qr").innerHTML = "";
      new QRCode(document.getElementById("qr"), JSON.stringify(tx));
      fetchConversions(currentUser.balance);
    }

    async function fetchConversions(balance) {
      try {
        const fxRes = await fetch(`https://eodhd.com/api/real-time/ZARUSD.FOREX?api_token=${apiKey}&fmt=json`);
        const usdRate = (await fxRes.json()).close;
        const usdValue = balance * usdRate;

        const spyRes = await fetch(`https://eodhd.com/api/real-time/SPY.US?api_token=${apiKey}&fmt=json`);
        const goldRes = await fetch(`https://eodhd.com/api/real-time/XAUUSD.FOREX?api_token=${apiKey}&fmt=json`);

        document.getElementById("usdValue").innerText = `USD ${usdValue.toFixed(2)}`;
        document.getElementById("spyValue").innerText = `${(usdValue / (await spyRes.json()).close).toFixed(4)} SPY`;
        document.getElementById("goldValue").innerText = `${(usdValue / (await goldRes.json()).close).toFixed(4)} oz`;
      } catch (err) {
        console.error(err);
      }
    }

    async function fetchExchangeRates() {
      const currencies = ["USDZAR","ZARUSD","USDEUR","USDGBP","USDJPY","USDCNY","USDAED","USDKES"];
      const container = document.getElementById("rates");
      container.innerHTML = "";
      for (let code of currencies) {
        const res = await fetch(`https://eodhd.com/api/real-time/${code}.FOREX?api_token=${apiKey}&fmt=json`);
        const data = await res.json();
        const el = document.createElement("p");
        el.innerText = `${code}: ${data.close}`;
        container.appendChild(el);
      }
    }

    async function generatePDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("SADC Wallet Transaction History", 10, 10);
      txHistory.forEach((tx,i)=>{
        doc.text(`${i+1}. ID: ${tx.id}, Amount: ${tx.amount}, Tax: ${tx.tax}, To: ${tx.to}`,10,20+(i*10));
      });
      doc.save("SADC_Transactions.pdf");
    }

    function getMarketPrice() {
      const cmcKey='0b53aa75-9da6-41c8-bbba-eb33bf350d3a';
      fetch('https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=1&symbol=SADI&convert=ZAR',{
        method:'GET',
        headers:{'X-CMC_PRO_API_KEY':cmcKey}
      })
      .then(response=>response.json())
      .then(data=>{
        if(data?.data?.quote?.ZAR){
          const price=data.data.quote.ZAR.price.toFixed(2);
          document.getElementById('cmcPriceResult').innerText=`1 SADICOIN = ZAR ${price}`;
        }else{
          document.getElementById('cmcPriceResult').innerText='Price fetch failed.';
        }
      })
      .catch(err=>{
        document.getElementById('cmcPriceResult').innerText='Error contacting CoinMarketCap.';
        console.error(err);
      });
    }

    // 🌐 Load MoonPay SDK
    async function loadMoonPay() {
      if(window.MoonPay) return window.MoonPay;
      return new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src="https://buy.moonpay.com/js/sdk/latest.js";
        script.onload=()=>resolve(window.MoonPay);
        script.onerror=reject;
        document.body.appendChild(script);
      });
    }

    // 🌐 MoonPay Swap Handler
    async function openSwap(){
      const from=document.getElementById("swap_from").value.trim().toUpperCase();
      const to=document.getElementById("swap_to").value.trim().toUpperCase();
      const amt=document.getElementById("swap_amt").value;
      if(!from||!to||!amt) return alert("Enter from, to, and amount.");

      try{
        const MoonPaySDK=await loadMoonPay();
        const moonPayInstance=new MoonPaySDK({
          flow:'swap',
          environment:'sandbox', // change to 'production' later
          variant:'overlay',
          params:{
            apiKey:'pk_live_OUYBz1syIA4A3AdJ47IQr0Rkx6dCWB4k', // replace with your publishable key
            baseCurrencyCode:from,
            baseCurrencyAmount:amt,
            defaultCurrencyCode:to,
            theme:'dark'
          }
        });
        moonPayInstance.show();

        // 🔹 Simulation of real-time balance update (replace with webhook in production)
        setTimeout(()=>{
          const received=(to==="SADI")?amt:amt*0.95; // mock conversion
          moonPayWebhookCallback({fromCurrency:from,toCurrency:to,amount:amt,receivedAmount:received.toFixed(2)});
        },5000);

      }catch(err){
        console.error("MoonPay init failed:",err);
        alert("MoonPay swap could not be launched.");
      }
    }

    // Simulated webhook callback
    function moonPayWebhookCallback(tx){
      if(!currentUser) return;
      if(tx.toCurrency==="SADI") currentUser.balance+=parseFloat(tx.receivedAmount);
      if(tx.fromCurrency==="SADI") currentUser.balance-=parseFloat(tx.amount);
      document.getElementById("balance").innerText=`SADICOIN ${currentUser.balance.toLocaleString()}`;
      fetchConversions(currentUser.balance);
      alert(`Swap Successful! ${tx.fromCurrency} → ${tx.toCurrency}: ${tx.receivedAmount} received`);
    }

  </script>
</body>
</html>



<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SADC SME Credit Portal + IMF Debt Projections</title>

  <!-- jsPDF for PDF export -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; padding: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #003366; font-weight: bold; }
    .form-container { background: #fff; padding: 20px; max-width: 950px; margin: 20px auto; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.08); }
    h2 { color: #003366; text-align: center; margin: 0 0 8px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display:block; margin-top:10px; font-weight:600; color:#234; }
    input, textarea, select { width:100%; padding:8px; margin-top:6px; border:1px solid #ccc; border-radius:6px; font-size:14px; box-sizing:border-box; }
    textarea { min-height:90px; }
    button { margin-top:14px; background:#003366; color:#fff; padding:10px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:700; }
    button.secondary { background:#0b69ff; }
    .small { font-size:12px; color:#666; }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:13px; }
    th,td { border:1px solid #e6edf3; padding:6px 8px; text-align:right; }
    th:first-child, td:first-child { text-align:left; }
    .out { background:#fafbfd; padding:10px; border-radius:6px; border:1px dashed #e3eefc; white-space:pre-wrap; }
    .controls { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
  </style>
</head>
<body>
  <nav>
    <a href="#">Credit Data</a>
    <a href="#">Transactions</a>
    <a href="#">STATS ANALYZER</a>
    <a href="#">SADC CBDC</a>
    <a href="#">Online Meetings</a>
  </nav>

  <!-- SME Credit Form -->
  <div class="form-container">
    <h2>SME Credit Data Submission</h2>
    <form id="creditForm">
      <label for="name">Company Name</label>
      <input type="text" id="name" required>

      <label for="taxID">Tax Identification Number</label>
      <input type="text" id="taxID" required>

      <label for="country">Country</label>
      <input type="text" id="country" required>

      <label for="financials">Financial Summary</label>
      <textarea id="financials" required></textarea>

      <label for="docURL">Document URL (PDF)</label>
      <input type="url" id="docURL" required>

      <button type="submit">Submit Credit Record</button>
    </form>
    <div id="status" class="small"></div>
  </div>

  <!-- Debt Projection -->
  <div class="form-container" id="debtPanel">
    <h2>IMF-style Debt Projection (multi-year)</h2>

    <div class="grid">
      <div>
        <label>Starting Debt (t=0)</label>
        <input id="debt0" type="number" step="0.01" value="1000000000">
        <label>GDP (current)</label>
        <input id="gdp0" type="number" step="0.01" value="5000000000">
        <label>Nominal Interest Rate (%)</label>
        <input id="i_nom" type="number" step="0.0001" value="5.00">
        <label>Nominal GDP Growth Rate (%)</label>
        <input id="g_nom" type="number" step="0.0001" value="3.00">
        <label>Inflation Rate (%)</label>
        <input id="inflation" type="number" step="0.0001" value="2.00">
      </div>

      <div>
        <label>Primary Balance (annual; positive = surplus)</label>
        <input id="primaryBal" type="number" step="0.01" value="-20000000">
        <label>Overall Balance (annual)</label>
        <input id="overallBal" type="number" step="0.01" value="-50000000">
        <label>Amortizations (mode)</label>
        <select id="amortMode">
          <option value="absolute">Absolute annual amount</option>
          <option value="pctDebt">Percent of debt (beginning of year)</option>
        </select>
        <label id="amortLabel">Amortization Amount (abs)</label>
        <input id="amortInput" type="number" step="0.01" value="30000000">
        <label>Projection Years</label>
        <input id="years" type="number" min="1" max="50" value="10">
      </div>
    </div>

    <div class="controls">
      <button id="btnProject">Run Projection</button>
      <button id="btnDownloadPDF" class="secondary">Download PDF</button>
      <button id="btnDownloadXML" class="secondary">Download XML</button>
      <button id="btnClear" class="secondary">Clear Results</button>
    </div>

    <div id="summary" class="out" style="margin-top:12px">Run projection to see results here.</div>
    <div id="tableWrapper" style="margin-top:12px; overflow:auto;"></div>
  </div>

<script>
  function fmt(num){ return (typeof num==='number' && isFinite(num)) ? num.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) : '-'; }

  // SME form submit
  document.getElementById("creditForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("name").value,
      taxID: document.getElementById("taxID").value,
      country: document.getElementById("country").value,
      financials: document.getElementById("financials").value,
      docURL: document.getElementById("docURL").value
    };
    document.getElementById("status").innerText = "Submitting... (demo)";
    try {
      const res = await fetch("http://localhost:3000/api/submit", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
      });
      const js = await res.json();
      document.getElementById("status").innerText = js.message || "Submitted (demo).";
    } catch(err){
      document.getElementById("status").innerText = "Backend not available; record kept locally in demo only.";
    }
  });

  // amortization label toggle
  const amortMode = document.getElementById('amortMode');
  const amortLabel = document.getElementById('amortLabel');
  amortMode.addEventListener('change', ()=> {
    amortLabel.textContent = amortMode.value==='absolute'?'Amortization Amount (abs)':'Amortization Rate (% of debt)';
    document.getElementById('amortInput').value = amortMode.value==='absolute'?30000000:5.0;
  });

  let lastProjection=null;
  document.getElementById('btnProject').addEventListener('click', runProjection);

  function runProjection(){
    const debt0=Number(document.getElementById('debt0').value)||0;
    const gdp0=Number(document.getElementById('gdp0').value)||0;
    const i_nom=Number(document.getElementById('i_nom').value)/100;
    const g_nom=Number(document.getElementById('g_nom').value)/100;
    const inflation=Number(document.getElementById('inflation').value)/100;
    const primaryBal=Number(document.getElementById('primaryBal').value)||0;
    const overallBal=Number(document.getElementById('overallBal').value)||0;
    const amortModeVal=document.getElementById('amortMode').value;
    const amortInput=Number(document.getElementById('amortInput').value)||0;
    const years=Math.max(1,Math.min(50,parseInt(document.getElementById('years').value)||10));
    const realCost=(i_nom-inflation)/(1+inflation);

    const rows=[];
    let debt_prev=debt0;
    let gdp_prev=gdp0;

    for(let t=1;t<=years;t++){
      let amort= amortModeVal==='absolute'? amortInput: debt_prev*(amortInput/100);
      const interestPayments=debt_prev*i_nom;
      const GFN_simple=amort-overallBal;
      const GFN_full=amort+interestPayments-overallBal;
      const debt_after=debt_prev*((1+i_nom)/(1+g_nom))-primaryBal;
      const gdp_after=gdp_prev*(1+g_nom);
      const gfnGDP=(GFN_full/gdp_after)*100;

      rows.push({year:t,debt_begin:debt_prev,amort,interest:interestPayments,overall_balance:overallBal,
        GFN_simple,GFN_full,gdp_begin:gdp_prev,gdp_end:gdp_after,debt_end:debt_after,gfnGDP,realCost});
      debt_prev=debt_after;
      gdp_prev=gdp_after;
    }

    lastProjection={meta:{debt0,gdp0,i_nom,g_nom,inflation,primaryBal,overallBal,amortModeVal,amortInput,years,realCost},rows};
    renderResults(lastProjection);
  }

  function renderResults(proj){
    const meta=proj.meta; const rows=proj.rows; const last=rows[rows.length-1];
    document.getElementById('summary').textContent=
      `Projection length: ${meta.years} years\nStart debt: ${fmt(meta.debt0)} | Start GDP: ${fmt(meta.gdp0)}\n`+
      `Nominal interest: ${(meta.i_nom*100).toFixed(2)}% | Nominal GDP growth: ${(meta.g_nom*100).toFixed(2)}%\n`+
      `Inflation: ${(meta.inflation*100).toFixed(2)}% | Real cost of debt: ${(meta.realCost*100).toFixed(2)}%\n\n`+
      `Debt after ${meta.years} years: ${fmt(last.debt_end)}\nGFN (last year, full): ${fmt(last.GFN_full)} | GFN/GDP: ${last.gfnGDP.toFixed(2)}%`;

    let html='<table><thead><tr><th>Year</th><th>Debt (begin)</th><th>Amort</th><th>Interest</th><th>Overall Bal</th><th>GFN simple</th><th>GFN full</th><th>GDP (begin)</th><th>GDP (end)</th><th>Debt (end)</th><th>GFN/GDP%</th><th>Real Cost %</th></tr></thead><tbody>';
    rows.forEach(r=>{
      html+=`<tr><td>${r.year}</td><td>${fmt(r.debt_begin)}</td><td>${fmt(r.amort)}</td><td>${fmt(r.interest)}</td><td>${fmt(r.overall_balance)}</td><td>${fmt(r.GFN_simple)}</td><td>${fmt(r.GFN_full)}</td><td>${fmt(r.gdp_begin)}</td><td>${fmt(r.gdp_end)}</td><td>${fmt(r.debt_end)}</td><td>${r.gfnGDP.toFixed(2)}</td><td>${(r.realCost*100).toFixed(2)}</td></tr>`;
    });
    html+='</tbody></table>';
    document.getElementById('tableWrapper').innerHTML=html;
  }

  // PDF export
  document.getElementById('btnDownloadPDF').addEventListener('click', ()=>{
    if(!lastProjection){ alert('Run projection first'); return; }
    const { jsPDF } = window.jspdf;
    const doc=new jsPDF({unit:'pt',format:'a4'});
    let y=40; doc.setFontSize(14); doc.text('SADC IMF-style Debt Projection',40,y); y+=20;
    doc.setFontSize(10);
    doc.text(document.getElementById('summary').textContent,40,y,{maxWidth:500});
    doc.save(`DebtProjection_${new Date().toISOString().slice(0,10)}.pdf`);
  });

  // XML export
  document.getElementById('btnDownloadXML').addEventListener('click', ()=>{
    if(!lastProjection){ alert('Run projection first'); return; }
    const meta=lastProjection.meta;
    let xml='<?xml version="1.0" encoding="UTF-8"?>\n<DebtProjection years="'+meta.years+'" generated="'+new Date().toISOString()+'">\n';
    xml+='  <Meta>\n    <StartDebt>'+meta.debt0+'</StartDebt>\n    <StartGDP>'+meta.gdp0+'</StartGDP>\n    <NominalInterest>'+meta.i_nom+'</NominalInterest>\n    <NominalGrowth>'+meta.g_nom+'</NominalGrowth>\n    <Inflation>'+meta.inflation+'</Inflation>\n    <PrimaryBalance>'+meta.primaryBal+'</PrimaryBalance>\n  </Meta>\n  <Rows>\n';
    lastProjection.rows.forEach(r=>{
      xml+=`    <Year index="${r.year}">\n      <DebtBegin>${r.debt_begin}</DebtBegin>\n      <Amortizations>${r.amort}</Amortizations>\n      <Interest>${r.interest}</Interest>\n      <OverallBalance>${r.overall_balance}</OverallBalance>\n      <GFNFull>${r.GFN_full}</GFNFull>\n      <GFNSimple>${r.GFN_simple}</GFNSimple>\n      <GDPBegin>${r.gdp_begin}</GDPBegin>\n      <GDPEnd>${r.gdp_end}</GDPEnd>\n      <DebtEnd>${r.debt_end}</DebtEnd>\n      <GFNtoGDP>${r.gfnGDP}</GFNtoGDP>\n      <RealCost>${r.realCost}</RealCost>\n    </Year>\n`;
    });
    xml+='  </Rows>\n</DebtProjection>';
    const blob=new Blob([xml],{type:'application/xml'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='DebtProjection.xml'; a.click();
  });

  // Clear results
  document.getElementById('btnClear').addEventListener('click', ()=>{
    document.getElementById('summary').textContent='Run projection to see results here.';
    document.getElementById('tableWrapper').innerHTML='';
    lastProjection=null;
  });
</script>
</body>
</html>





<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SADC CBDC — Web Platform (MVP)</title>

  <!-- Tailwind CDN for quick styling (good for MVP). Remove or replace with build-time Tailwind in production. -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Axios (for API calls) -->
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

  <style>
    /* Small safe defaults */
    html,body,#app { height: 100%; }
  </style>
</head>
<body class="bg-gray-50">
  <div id="app" class="min-h-screen p-6">
    <header class="max-w-6xl mx-auto flex items-center justify-between py-4">
      <div>
        <h1 class="text-2xl font-bold">SADC Digital Reserve — Web Platform (MVP)</h1>
        <p class="text-sm text-gray-600">Web-only — Wallet, CBDC issuance, transfer, trading stub & activity.</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-xs text-gray-500">Account</div>
          <div id="account" class="text-sm">Not connected</div>
          <div class="text-xs text-gray-500">Balance</div>
          <div id="balance" class="text-sm font-mono">0 SADC</div>
        </div>
        <button id="connectBtn" class="px-4 py-2 bg-sky-600 text-white rounded shadow-sm hover:opacity-90">Connect Wallet</button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <!-- Issue & Transfer -->
      <section class="col-span-1 md:col-span-1 bg-white p-4 rounded shadow">
        <h2 class="font-semibold">Issue CBDC (Admin)</h2>
        <p class="text-xs text-gray-500">Admin-only action. Calls backend mint endpoint.</p>

        <form id="issueForm" class="mt-3 space-y-3">
          <div>
            <label class="text-sm block">Recipient address / internal account</label>
            <input id="issueRecipient" class="w-full border rounded p-2" placeholder="0x... or internal acct id" />
          </div>
          <div>
            <label class="text-sm block">Amount</label>
            <input id="issueAmount" value="1000" class="w-full border rounded p-2" />
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-2 bg-green-600 text-white rounded" type="submit">Issue</button>
            <button id="resetIssue" type="button" class="px-4 py-2 border rounded">Reset</button>
          </div>
        </form>

        <hr class="my-4" />

        <h2 class="font-semibold">Transfer CBDC</h2>
        <form id="transferForm" class="mt-3 space-y-3">
          <div>
            <label class="text-sm block">To</label>
            <input id="transferRecipient" class="w-full border rounded p-2" placeholder="0x... or internal acct id"/>
          </div>
          <div>
            <label class="text-sm block">Amount</label>
            <input id="transferAmount" value="0" class="w-full border rounded p-2" />
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Send</button>
            <button id="resetTransfer" type="button" class="px-4 py-2 border rounded">Reset</button>
          </div>
        </form>
      </section>

      <!-- Trading hub -->
      <section class="col-span-1 md:col-span-1 bg-white p-4 rounded shadow">
        <h2 class="font-semibold">Trading / Investment Hub (Stub)</h2>
        <p class="text-sm text-gray-500">Connect to broker API or internal DEX backend. This form calls backend trade endpoint.</p>

        <form id="tradeForm" class="mt-3 space-y-3">
          <div>
            <label class="text-sm block">Symbol</label>
            <input id="tradeSymbol" value="ZARUSD" class="w-full border rounded p-2" />
          </div>
          <div class="flex gap-2">
            <div class="flex-1">
              <label class="text-sm block">Amount</label>
              <input id="tradeAmount" value="100" class="w-full border rounded p-2" />
            </div>
            <div class="w-32">
              <label class="text-sm block">Side</label>
              <select id="tradeSide" class="w-full border rounded p-2">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-2 bg-indigo-600 text-white rounded" type="submit">Place Trade</button>
            <button id="resetTrade" type="button" class="px-4 py-2 border rounded">Reset</button>
          </div>
        </form>

        <div class="mt-4">
          <h3 class="font-medium">Quick actions</h3>
          <div class="flex gap-2 mt-2">
            <button id="fetchMarket" class="px-3 py-2 border rounded">Fetch Market Data</button>
            <button id="fetchLiquidity" class="px-3 py-2 border rounded">Liquidity</button>
          </div>
        </div>
      </section>

      <!-- Activity & Logs -->
      <aside class="col-span-1 md:col-span-1 bg-white p-4 rounded shadow">
        <h2 class="font-semibold">Activity & Transactions</h2>

        <div id="messageArea" class="mt-3"></div>

        <div id="txList" class="max-h-72 overflow-auto mt-2 border rounded p-2 bg-gray-50">
          <div class="text-sm text-gray-500">No transactions yet.</div>
        </div>

        <div class="mt-3">
          <h3 class="font-medium">Export / Reports</h3>
          <div class="flex gap-2 mt-2">
            <button id="genReport" class="px-3 py-2 border rounded">Generate Report</button>
            <button id="feesSnapshot" class="px-3 py-2 border rounded">Fees</button>
          </div>
        </div>
      </aside>
    </main>

    <footer class="max-w-6xl mx-auto text-center mt-6 text-sm text-gray-500">
      © SADC CBDC MVP — demo. Configure BACKEND_URL below before use.
    </footer>
  </div>

  <script>
    /**************************************************************
     * Configuration
     * - Set BACKEND_URL to your backend host (no trailing slash)
     *   Example: const BACKEND_URL = "http://localhost:5000"
     **************************************************************/
    const BACKEND_URL = "http://localhost:5000"; // <- change this to your actual backend

    // App state
    let currentAccount = null;
    let pollInterval = null;

    // DOM refs
    const connectBtn = document.getElementById('connectBtn');
    const accountEl = document.getElementById('account');
    const balanceEl = document.getElementById('balance');
    const txList = document.getElementById('txList');
    const messageArea = document.getElementById('messageArea');

    // Utility
    function showMessage(text, type = 'info') {
      messageArea.innerHTML = `<div class="p-2 ${type==='error'?'bg-red-50 border-red-200':'bg-yellow-50 border-yellow-200'} rounded text-sm">${text}</div>`;
      setTimeout(()=>{ if(messageArea.firstChild) messageArea.firstChild.remove(); }, 7000);
    }

    // Wallet connect
    async function connectWallet() {
      if (!window.ethereum) {
        showMessage('No Web3 provider detected. Install MetaMask or use a web3-enabled browser.', 'error');
        return;
      }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        accountEl.textContent = currentAccount;
        connectBtn.textContent = 'Wallet connected';
        // initial fetch
        await fetchBalance();
        await loadTxs();
        startPolling();
        // listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      } catch (err) {
        console.error(err);
        showMessage('Wallet connection failed', 'error');
      }
    }

    function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        currentAccount = null;
        accountEl.textContent = 'Not connected';
        balanceEl.textContent = '0 SADC';
        stopPolling();
      } else {
        currentAccount = accounts[0];
        accountEl.textContent = currentAc