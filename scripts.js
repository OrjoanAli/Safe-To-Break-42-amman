(function(){
  var p = {};
  try { p = JSON.parse(localStorage.getItem("bif-progress") || "{}"); } catch (err) {}
  var done = 0;
  document.querySelectorAll(".row").forEach(function(r){
    var s = p[r.dataset.id] || {}, st = r.querySelector(".st");
    if (s.hit && s.blocked) { st.textContent = "Done"; st.className = "st done"; done++; }
    else if (s.hit) { st.textContent = "Exploited"; st.className = "st half"; }
    else { st.textContent = "Not started"; }
  });
var pr = document.getElementById("prog");
if (pr) pr.textContent = done + " of 3 labs done";})();

/*-------------------------------RACE CONDITION LOGIC-----------------------------------------------------*/
/*   It only runs on the race page: the <body> tag of race.html must have  data-lab="race"  */
(function(){
  var p = {};
  try { p = JSON.parse(localStorage.getItem("bif-progress") || "{}"); } catch (err) {}
  var done = 0;
  document.querySelectorAll(".row").forEach(function(r){
    var s = p[r.dataset.id] || {}, st = r.querySelector(".st");
    if (s.hit && s.blocked) { st.textContent = "Done"; st.className = "st done"; done++; }
    else if (s.hit) { st.textContent = "Exploited"; st.className = "st half"; }
    else { st.textContent = "Not started"; }
  });
  var pr = document.getElementById("prog");
  if (pr) pr.textContent = done + " of 3 labs done";
})();

/*-------------------------------RACE CONDITION LOGIC-----------------------------------------------------*/
/* The race page is written in race.html. This code only makes it work:
   the Vulnerable/Fixed switch, the payload buttons and the fake shop. */
(function(){
  if (document.body.dataset.lab !== "race") return;   // run only on the race page

  /* ---------- 1. THE SHOP'S MEMORY (changes while you play) ---------- */
  var mode = "vuln";          // "vuln" = vulnerable code, "fixed" = fixed code
  var used = false;           // was the coupon already used?
  var total = 100;            // price to pay
  var applied = 0;            // how many times the coupon was applied
  var requestNumber = 0;      // counts the requests, for the log
  var lock = Promise.resolve();   // the "lock" used by the fixed version

  /* ---------- 2. GET THE PARTS OF THE PAGE (they have an id in race.html) ---------- */
  var out        = document.getElementById("out");        // the Readout box
  var log        = document.getElementById("log");        // the request log
  var couponBox  = document.getElementById("coupon");     // where you type the coupon
  var totalText  = document.getElementById("total");
  var totalBox   = document.getElementById("total-box");
  var discounts  = document.getElementById("discounts");
  var btnVuln    = document.getElementById("btn-vuln");
  var btnFixed   = document.getElementById("btn-fixed");

  /* ---------- 3. SMALL HELPERS ---------- */

  // wait for some milliseconds (this is the "slow step" of the shop)
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

  // update the numbers on the screen
  function updateScreen(){
    totalText.textContent = "$" + total;
    var lines = "";
    for (var i = 0; i < applied; i++) { lines += "<div>Coupon SAVE20: -$20</div>"; }
    discounts.innerHTML = lines;
    totalBox.classList.toggle("alert", applied > 1);     // red when applied twice or more
    discounts.classList.toggle("alert", applied > 1);
  }

  // remember the result so the home page can show "Exploited" / "Done"
  function saveProgress(key){
    try {
      var all = JSON.parse(localStorage.getItem("bif-progress") || "{}");
      all.race = all.race || {};
      all.race[key] = true;
      localStorage.setItem("bif-progress", JSON.stringify(all));
    } catch (err) { /* if storage is blocked, the lab still works */ }
  }

  // write the result in the Readout box. type is "bad" (red) or "good" (green)
  function showResult(type, title, message){
    out.className = "out " + type;
    out.innerHTML = "<b>" + title + "</b>" + message;
    if (type === "bad") saveProgress("hit");
    if (title.indexOf("Blocked") === 0) saveProgress("blocked");
  }

  // put the shop back to the start
  function resetWindow(){
    used = false; total = 100; applied = 0; requestNumber = 0; lock = Promise.resolve();
    log.innerHTML = "";
    couponBox.value = "";
    out.className = "out";
    out.textContent = "Waiting for a payload.";
    updateScreen();
  }

  /* ---------- 4. THE SHOP: what happens when ONE request arrives ---------- */
  async function checkCoupon(id, code){
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

    if (mode === "fixed") { used = true; }    // FIXED: mark the coupon as used right away
    await sleep(900);                          // the slow step
    if (mode === "vuln")  { used = true; }    // VULNERABLE: marked as used too late!

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

    if (mode === "fixed") {
      addLog("Request " + id + ": waits for its turn (lock)");
      var myTurn = lock.then(function(){ return checkCoupon(id, code); });
      lock = myTurn.catch(function(){});
      return myTurn;
    }
    return checkCoupon(id, code);          // vulnerable: all requests run at the same time
  }

  // send many requests at the same time, then show the result
  async function sendRequests(count, code){
    var requests = [];
    for (var i = 0; i < count; i++) { requests.push(sendOneRequest(code)); }
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
    document.getElementById("hint").textContent = isVuln
      ? "Press a payload, or use the window yourself, and watch what happens on the right."
      : "Same payloads, fixed code. Press the attack again and compare.";
    btnVuln.setAttribute("aria-pressed", isVuln);
    btnFixed.setAttribute("aria-pressed", !isVuln);

    resetWindow();
  }

  /* ---------- 6. CONNECT THE BUTTONS ---------- */
  btnVuln.onclick  = function(){ setMode("vuln"); };
  btnFixed.onclick = function(){ setMode("fixed"); };

  // payload buttons: the number of requests is written in the HTML (data-count)
  document.querySelectorAll("[data-count]").forEach(function(button){
    button.onclick = function(){
      couponBox.value = "SAVE20";
      sendRequests(Number(button.dataset.count), "SAVE20");
    };
  });

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