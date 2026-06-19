# BigQuery Release Notes Viewer 🚀

A modern, responsive, and visually stunning web application built to track and share BigQuery release notes. It fetches data dynamically from the official Google Cloud Atom feed, separates daily updates into granular entries, and offers a premium master-detail dashboard with custom filters, search parameters, CSV export utilities, and a dedicated Twitter/X sharing console.

---

## ✨ Features

* **Granular Release Splitting:** Google's official feed groups updates under single dates. This app splits daily entries on `<h3>` dividers, isolating each individual release (e.g., separating a *Feature* from a concurrent *Issue*).
* **Fault-Tolerant Cache:** Saves fetched feed data locally to `releases_cache.json`. The app loads instantaneously using this cache and falls back to it in the event of external network failures.
* **On-Demand Reload:** A dedicated **Refresh** button pulls the latest entries from the live feed and updates the cache.
* **Master-Detail Board:**
  * **Sidebar (Master List):** Includes real-time substring search, category tags with item counts (Features, Announcements, Issues, Deprecated), and sorting filters.
  * **Detail Pane:** Renders complete release HTML specifications, links to official documentation, and a sharing dashboard.
* **Theme Switcher:** Seamlessly toggles between dark and light color modes with local session persistence.
* **Twitter/X Intent Composer:**
  * Drafts customizable templates on card selection.
  * Adjusts metrics for X's link-shortening algorithm (counting all URLs as exactly 23 characters).
  * Provides a circular SVG progress meter indicating character capacity.
* **Developer Utilities:**
  * One-click clipboard copier on individual cards (equipped with success checkmark visual indicators).
  * **Export to CSV** utility that exports only the currently filtered set of release records.

---

## 📁 Project Structure

```
bq-release-viewer/
│
├── app.py                  # Flask Web Server & Atom XML Parser
├── releases_cache.json     # Cached Release Notes (Auto-generated)
├── README.md               # Project documentation
├── .gitignore              # Files ignored by git
│
├── templates/
│   └── index.html          # Front-end SPA template
│
└── static/
    ├── css/
    │   └── style.css       # Custom stylesheets (Dark/Light mode)
    └── js/
        └── app.js          # Client-side SPA logic & controls
```

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have **Python 3.7+** installed.

### 1. Clone the repository and navigate inside
```bash
git clone https://github.com/AbhinavVajinapalli/abhinav-event-talks-app.git
cd abhinav-event-talks-app
```

### 2. Install dependencies
Install Flask directly using pip:
```bash
pip install flask
# or
python -m pip install flask
```

### 3. Start the application
Boot the development server:
```bash
python app.py
```
Upon startup, the script pre-fetches the latest feed entries to build the initial local cache.

### 4. Access the Dashboard
Open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛠️ Built With

* **Backend:** [Python Flask](https://flask.palletsprojects.com/)
* **Frontend Markup:** HTML5 (Vanilla Semantic Tags)
* **Styling:** CSS3 variables, transitions, and layout flexbox grids
* **Logic:** Modern Vanilla JavaScript (ES6)
* **Feed Source:** Google Cloud BigQuery Release Notes RSS Feed
