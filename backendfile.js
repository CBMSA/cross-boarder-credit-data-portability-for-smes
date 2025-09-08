
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