# Safe to Break: Interactive Web Security Labs

> **Break it. Then fix it.**
> A hands-on learning website where you can *see* three important web vulnerabilities happen, then switch to the fixed code and watch the same attack fail.

**Live site:** `https://<your-username>.github.io/<your-repo>/` *(replace with your deployed URL)*

---

## About

**Safe to Break** is an interactive web security sandbox built as the final project at **42 Amman**. Reading about a vulnerability is one thing; pressing a button and watching it work is another. Each lab lets the visitor:

1. Read the **vulnerable code** with the one guilty line highlighted.
2. Press a **payload** and see the real effect on a simulated victim page.
3. Switch to the **fixed code** with a single click.
4. Press the **same payload** again and see it blocked.

The site is designed for beginners and needs no setup, no account and no prior knowledge.

---

## The Labs

| Lab | Vulnerability | CWE | Level | What you will see |
|-----|---------------|-----|-------|-------------------|
| 01 | **Race Condition** | [CWE-362](https://cwe.mitre.org/data/definitions/362.html) | Challenge | Send several requests at once and a one-time coupon is applied multiple times. |
| 02 | **Clickjacking** | [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html) | Starter | Click a harmless button and actually hit a hidden one underneath. |
| 03 | **Prototype Pollution** | [CWE-1321](https://cwe.mitre.org/data/definitions/1321.html) | Challenge | One crafted URL turns every object in the app into an admin. |

### Lab 01: Race Condition
The server checks whether a coupon was used, then marks it as used only *after* a slow step. Requests that arrive in between all pass the check.
- **Payloads:** apply once, 2 simultaneous requests, 5 simultaneous requests.
- **Fix:** a lock (mutex) so the check and the update happen as one step, and the coupon is marked as used *before* the slow operation.

### Lab 02: Clickjacking
An attacker page places an invisible frame of another site on top of a bait button, so the victim's click lands on the hidden page.
- **Payloads:** fake cookie banner (delete account), fake download button (transfer money), fake video button (approve payment).
- **Extra:** a slider reveals the hidden layer so you can see exactly what is happening.
- **Fix:** the `X-Frame-Options: DENY` response header, which tells the browser to never render the page inside a frame.

### Lab 03: Prototype Pollution
A query-string parser writes into nested objects without checking the keys, letting an attacker reach `Object.prototype` and add properties that every object inherits.
- **Payloads:** normal use, constructor chain (`?constructor[prototype][isAdmin]=true`), flawed filter bypass (`?__pro__proto__to__[vipAccess]=true`).
- **Fix:** block `__proto__`, `constructor` and `prototype` keys, and build objects with `Object.create(null)`.

---

## How It Works

Everything runs **in the browser**. There is no backend, no database and no login.

- Each lab is a small, self-contained JavaScript simulation. The vulnerable and fixed code shown on the page matches the logic that actually runs.
- The fake browser windows are plain HTML and CSS.
- The Vulnerable/Fixed switch changes which logic runs and resets the demo, so the same payload can be compared side by side.
- Where a real server behavior is needed (for example the `X-Frame-Options` header), the browser's reaction is simulated, because GitHub Pages cannot send custom headers.

### Safety
This project is a **simulation only**. Nothing real is attacked, stored or sent. No real credentials, personal data or company logos are used, and no malicious code runs on the site.

---

## Project Structure

```
.
├── index.html     # Home page: overview and lab list
├── race.html      # Lab 01: Race condition
├── click.html     # Lab 02: Clickjacking
├── proto.html     # Lab 03: Prototype pollution
├── style.css      # Shared design for the whole site
├── scripts.js     # Logic for all three labs (each runs only on its own page)
└── README.md
```

**Tech stack:** HTML, CSS and vanilla JavaScript. No frameworks, no build step, no dependencies. Fonts (Barlow, Barlow Condensed, IBM Plex Mono) are loaded from Google Fonts.

---

## Run Locally

Clone the repository and open `index.html` in any modern browser:

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
open index.html          # or just double-click the file
```

Or serve it with a local server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

The site is static and deployed with **GitHub Pages**:

1. Go to **Settings → Pages** in the repository.
2. Select the `main` branch and the `/ (root)` folder.
3. Save, then open the published URL.

---

## Sources

- [CWE-362: Race Condition](https://cwe.mitre.org/data/definitions/362.html) and [OWASP Race Conditions](https://community.owasp.org/pages/vulnerabilities/race_conditions)
- [CWE-1021: Improper Restriction of Rendered UI Layers](https://cwe.mitre.org/data/definitions/1021.html)
- [CWE-1321: Prototype Pollution](https://cwe.mitre.org/data/definitions/1321.html)
- [OWASP A08:2021 Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [PortSwigger Web Security Academy: Prototype Pollution](https://portswigger.net/web-security/prototype-pollution/client-side)
- [NVD: CVE-2019-10744 (Lodash)](https://nvd.nist.gov/vuln/detail/CVE-2019-10744)
- [Twitter clickjacking worm (2009)](https://blog.x.com/en/company/clickjacking-blocked)
- [BBC: Starbucks gift card race condition (2015)](https://www.bbc.com/news/technology-32844123)

---





*Final project, 42 Amman, November 2026. Educational use only.*
