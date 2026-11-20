/*-------------------------------RACE CONDITION LOGIC--------------------------------------------------------------------------------------------------------*/

(function(){
  if (document.body.dataset.lab !== "race") return;   // run only on the race page

  /* ----------  THE SHOP'S MEMORY (changes while you play) ---------- */
  var mode = "vuln";          // "vuln" = vulnerable code, "fixed" = fixed code
  var used = false;           // was the coupon already used?
  var total = 100;            // price to pay
  var applied = 0;            // how many times the coupon was applied
  var requestNumber = 0;      // counts the requests, for the log
  var lock = Promise.resolve();   // for the resetWindow to set a new round starts with an empty line.

  /* ----------  GET THE PARTS OF THE PAGE (they have an id in race.html) ---------- */
  var out        = document.getElementById("out");    // Readout box where the result message appear    
  var log        = document.getElementById("log");        
  var couponBox  = document.getElementById("coupon");     
  var totalText  = document.getElementById("total");
  var totalBox   = document.getElementById("total-box");
  var discounts  = document.getElementById("discounts");
  var btnVuln    = document.getElementById("btn-vuln");
  var btnFixed   = document.getElementById("btn-fixed");

  /* ----------  SMALL HELPERS ---------- */

  // sleep is a fake slow step, and the race happens because the coupon is marked as used only after the millisecond that he will wait
  function sleep(ms){
    return new Promise(function(resolve){ setTimeout(resolve, ms); });
  }

  // write one line in the request log
  function addLog(text){
    var li = document.createElement("li");
    li.textContent = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  }

  // print the number of the applied copun in the screen 
  function updateScreen(){
    totalText.textContent = "$" + total;
    var lines = "";
    for (var i = 0; i < applied; i++) { 
      lines += "<div>Coupon SAVE20: -$20</div>"; 
    }
    discounts.innerHTML = lines;
    totalBox.classList.toggle("alert", applied > 1);     // red when applied twice or more
    discounts.classList.toggle("alert", applied > 1);
  }

  // write the result in the Readout box. type is "bad" (red) or "good" (green)
  function showResult(type, title, message){
    out.className = "out " + type;
    out.innerHTML = "<b>" + title + "</b>" + message;
  }

  // put the shop back to the start
  function resetWindow(){
    used = false; 
    total = 100;
    applied = 0;
    requestNumber = 0;
    lock = Promise.resolve();
    log.innerHTML = "";
    couponBox.value = "";
    out.className = "out"; //removes the red or green color from the Readout box, so it goes back to neutral
    out.textContent = "Waiting for a payload.";
    updateScreen();
  }

  /* ----------  THE SHOP: what happens when ONE request arrives ---------- */
  async function checkCoupon(id, code){ // async is the permission word so we can use async inside it 
    addLog("Request " + id + ": coupon " + code + ", checks if it was already used");

    if (code !== "SAVE20") {
      addLog("Request " + id + ": invalid coupon");
      return "invalid";
    }

    if (used) {
      addLog("Request " + id + ": refused, coupon already used");
      return "used";
    }

    addLog("Request " + id + ": not used yet, saving to the database...");

    if (mode === "fixed") { used = true; }    
    await sleep(900);                          // sleep timer for 0.9 second await is the function that will pause 
    if (mode === "vuln")  { used = true; }    

    if (total <= 0) {
      addLog("Request " + id + ": nothing left to discount, total is already $0");
      return "used";
    }

    total = Math.max(0, total - 20);
    applied = applied + 1;
    updateScreen();
    addLog("Request " + id + ": coupon applied, total is now $" + total);
    return "applied";
  }

  // send one request. In the fixed version the requests must wait for their turn (lock)
  function sendOneRequest(code){
    requestNumber = requestNumber + 1;
    var id = requestNumber;

    if (mode === "fixed") { //check what mood you are in 
      addLog("Request " + id + ": waits for its turn (lock)"); 
    
      var myTurn = lock.then(function(){ return checkCoupon(id, code); }); //
      lock = myTurn.catch(function(){});//
      return myTurn;
    }
    return checkCoupon(id, code);// if (mode === "vuln")
  }

  // send many requests at the same time, then show the result
  async function sendRequests(count, code){ //count = how many requests sedn in one time 
    var requests = [];

    // we send count requests at teh same time and add them to the list 
    for (var i = 0; i < count; i++) { 
      requests.push(sendOneRequest(code)); 
    }

    // waits until every request is finished, and results holds all their answers.
    var results = await Promise.all(requests);

    if (results.indexOf("invalid") !== -1) {
      showResult("good", "Normal use", "That coupon code is not valid. Try SAVE20.");
    } else if (applied > 1) {
      showResult("bad", "Exploited: a one-time coupon was applied " + applied + " times",
        "Total is $" + total + " instead of $80. Press Reset window to start again.");
    } else if (mode === "fixed" && count > 1 && applied === 1) {
      showResult("good", "Blocked: the coupon worked only once",
        "Total is $" + total + ". The other requests were refused. Press Reset window to try again.");
    } else if (applied === 1) {
      showResult("good", "Normal use", "Coupon applied once. Total is $" + total + ".");
    } else {
      showResult("good", "Nothing changed", "The coupon was already used. Press Reset window to try again.");
    }
  }

  /* ----------  THE VULNERABLE / FIXED SWITCH ---------- */
  function setMode(newMode){
    mode = newMode;
    var isVuln = (newMode === "vuln");

    document.body.dataset.mode = newMode;                       // changes the colors (CSS)
    document.getElementById("code-vuln").hidden  = !isVuln;     // show / hide the code
    document.getElementById("code-fixed").hidden = isVuln;
    document.getElementById("why-vuln").hidden   = !isVuln;
    document.getElementById("why-fixed").hidden  = isVuln;
    document.getElementById("banner").textContent = isVuln ? "Danger: vulnerable version" : "Safe: fixed version";
    document.getElementById("hint").textContent = isVuln ? "Press a payload, or use the window yourself, and watch what happens on the right.": "Same payloads, fixed code. Press the attack again and compare.";
    btnVuln.setAttribute("aria-pressed", isVuln);
    btnFixed.setAttribute("aria-pressed", !isVuln); //setAttribute writes a value onto an HTML tag

    resetWindow();
  }

  /* ----------  CONNECT THE BUTTONS ---------- */
  btnVuln.onclick  = function(){ setMode("vuln"); };
  btnFixed.onclick = function(){ setMode("fixed"); };

  var payloadButtons = document.querySelectorAll("[data-count]");

  function pressPayload(button){
    var count = Number(button.dataset.count);   // read the number written in the HTML, like 3
    couponBox.value = "SAVE20";                 // type the coupon in the box
    sendRequests(count, "SAVE20");              // send that many requests
  }

  for (let i = 0; i < payloadButtons.length; i++) {
    let button = payloadButtons[i];
    button.onclick = function(){ pressPayload(button); };
  }

  // the Apply button of the shop: sends what you typed
  document.getElementById("apply").onclick = function(){
    sendRequests(1, couponBox.value.trim());
  };

  // the Place order button
  document.getElementById("order").onclick = function(){
    if (applied > 1) {
      showResult("bad", "Exploited: order placed with an extra discount", "You paid $" + total + " instead of $80 for the same items.");
    } else {
      showResult("good", "Normal use", "Order placed. You paid $" + total + ".");
    }
  };

  document.getElementById("reset").onclick = resetWindow;
})();

/*-------------------------------CLICKJACKING LOGIC------------------------------------------------------------------------------------------------------*/

(function(){
  if (document.body.dataset.lab !== "click") return;   // run only on the clickjacking page

  /* ---------- 1. THE MEMORY ---------- */
  var mode  = "vuln";     // "vuln" = vulnerable code, "fixed" = fixed code
  var runId = 0;          // lets us cancel a running payload when the visitor resets or switches mode

  // the 3 payloads. Each one is a different trap.
  var payloads = {
    cookie: {
      bait:   "Accept cookies",
      action: "Delete my account",
      full:   false,
      click:  { left: "50%", top: "50%" },
      status: "DELETED",
      text:   "You thought you clicked “Accept cookies”. The invisible bank page on top received a click on “Delete my account”."
    },
    download: {
      bait:   "Download file",
      action: "Transfer $500",
      full:   false,
      click:  { left: "50%", top: "50%" },
      status: "$500 TRANSFERRED",
      text:   "You thought you clicked “Download file”. The invisible bank page on top received a click on “Transfer $500”."
    },
    video: {
      bait:   "▶ Play video",
      action: "Approve $500 payment",
      full:   false,
      click:  { left: "50%", top: "50%" },
      status: "$500 payment APPROVED",
      text:   "You thought you clicked “▶ Play video”. The invisible bank page on top received a click on “Approve $500 payment”."
    }
  };
  var current = payloads.cookie;

  /* ---------- 2. GET THE PARTS OF THE PAGE (they have an id in click.html) ---------- */
  var out       = document.getElementById("out");         // the Readout box
  var slider    = document.getElementById("slider");      // the "hidden layer visibility" slider
  var state     = document.getElementById("state");       // "Your bank account: active"
  var overVuln  = document.getElementById("over-vuln");   // hidden bank layer (vulnerable version)
  var overFixed = document.getElementById("over-fixed");  // "refused to connect" layer (fixed version)
  var prize     = document.getElementById("prize");       // the bait button
  var del       = document.getElementById("delete");      // the hidden button
  var cursor    = document.getElementById("cursor");      // the fake mouse
  var btnVuln   = document.getElementById("btn-vuln");
  var btnFixed  = document.getElementById("btn-fixed");

  /* ---------- 3. SMALL HELPERS ---------- */

  // write the result in the Readout box. type is "bad" (red) or "good" (green)
  function showResult(type, title, message){
    out.className = "out " + type;
    out.innerHTML = "<b>" + title + "</b>" + message;
  }

  // the slider decides how visible the hidden layer is (0 = invisible, 100 = fully visible)
  function updateOpacity(){
    var value = slider.value / 100;
    overVuln.style.opacity = value;
    overFixed.style.opacity = value;
  }

  // put the window back to the start
  function resetWindow(){
    runId = runId + 1;                       // cancels any payload that is still running
    current = payloads.frame;
    prize.textContent = "Win a prize!";
    del.textContent = "Delete my account";
    overVuln.classList.remove("full");
    cursor.classList.remove("show");
    cursor.style.left = "6%";
    cursor.style.top = "88%";
    slider.value = 0;
    updateOpacity();
    state.textContent = "Your bank account: active";
    state.className = "state";
    out.className = "out";
    out.textContent = "Waiting for a payload.";
  }

  /* ---------- 4. WHAT HAPPENS ON A CLICK ---------- */

  // the click lands on the HIDDEN button (vulnerable version only)
  del.onclick = function(){
    state.textContent = "Your bank account: " + current.status;
    state.className = "state deleted";
    showResult("bad", "Exploited: your click went to a hidden button", current.text);
  };

  // the click lands on the attacker's own page (fixed version: the layer above is empty)
  prize.onclick = function(){
    showResult("good", "Blocked: the browser refused to show the page in a frame",
      "The server sent X-Frame-Options: DENY, so the invisible layer is empty and the click only reached the attacker’s own page. Your account is safe.");
  };

  /* ---------- 5. RUN A PAYLOAD: build the trap, then a fake mouse clicks ---------- */
  function runPayload(name){
    resetWindow();                           // start clean (this also cancels the previous run)
    var myRun = runId;                       // remember which run this is
    current = payloads[name];

    // build the trap
    prize.textContent = current.bait;
    del.textContent = current.action;
    overVuln.classList.toggle("full", current.full);
    showResult("good", "Payload loaded", "The attacker’s page is ready. Watch the visitor click…");

    // 1) the fake mouse moves to the place where the visitor will click
    setTimeout(function(){
      if (myRun !== runId) return;           // cancelled
      cursor.classList.add("show");
      cursor.style.left = current.click.left;
      cursor.style.top = current.click.top;
    }, 100);

    // 2) the visitor "clicks": the browser gives the click to the layer on top
    setTimeout(function(){
      if (myRun !== runId) return;
      if (mode === "vuln") { del.click(); } else { prize.click(); }
      cursor.classList.remove("show");
    }, 1100);
  }

  /* ---------- 6. THE VULNERABLE / FIXED SWITCH ---------- */
  function setMode(newMode){
    mode = newMode;
    var isVuln = (newMode === "vuln");

    document.body.dataset.mode = newMode;                       // changes the colors (CSS)
    document.getElementById("code-vuln").hidden  = !isVuln;     // show / hide the code
    document.getElementById("code-fixed").hidden = isVuln;
    document.getElementById("why-vuln").hidden   = !isVuln;
    document.getElementById("why-fixed").hidden  = isVuln;
    overVuln.hidden  = !isVuln;                                 // show / hide the layer on the stage
    overFixed.hidden = isVuln;
    document.getElementById("banner").textContent = isVuln ? "Danger: vulnerable version" : "Safe: fixed version";
    document.getElementById("hint").textContent = isVuln
      ? "Press a payload and watch the attack run on the right. You can also click the box yourself, and move the slider to see the hidden layer."
      : "Same payloads, fixed code. Press the attack again and compare.";
    btnVuln.setAttribute("aria-pressed", isVuln);
    btnFixed.setAttribute("aria-pressed", !isVuln);

    resetWindow();
  }

  /* ---------- 7. CONNECT THE BUTTONS ---------- */
  btnVuln.onclick  = function(){ setMode("vuln"); };
  btnFixed.onclick = function(){ setMode("fixed"); };
  slider.oninput   = updateOpacity;

  document.getElementById("p-cookie").onclick   = function(){ runPayload("cookie"); };
  document.getElementById("p-download").onclick = function(){ runPayload("download"); };
  document.getElementById("p-video").onclick   = function(){ runPayload("video"); };
  document.getElementById("reset").onclick     = resetWindow;
})();
