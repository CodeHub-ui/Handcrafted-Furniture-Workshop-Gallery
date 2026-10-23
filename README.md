# Handcrafted Furniture Workshop Gallery

A browser-based tool for workshop floor staff and managers to browse and manage handcrafted furniture records. Built with semantic HTML5, vanilla CSS3 and vanilla JavaScript (ES modules). No frameworks, no build step, no backend.

## Business problem and solution

**Problem:** furniture records live in paper files and Excel sheets that are slow to search, easy to lose and hard to read on the workshop floor.

**Solution:** a small, offline-capable web app that stores records in the browser and offers a dashboard, a searchable gallery, a validated add/edit form and record management with backup and restore.

## Key features

- Dashboard with live statistics (total, available, under production, completed), recent items and a category breakdown, all calculated from current data
- Gallery with instant case-insensitive search (name, ID, category, material, artisan), category and status filters, and sorting by name, price or date added
- Add / edit form with field-level validation, helper text and accessible error messages
- Detail view, edit and delete (with confirmation dialog)
- Manage records table, JSON export and import, add missing samples, reset to sample data
- Online/offline indicator and a service worker that caches the app files
- Graceful handling of corrupted or unavailable storage, and of broken images
- Local console-only analytics simulation

## Technology stack

HTML5, CSS3 (custom properties), JavaScript ES2020+ modules, `localStorage`, Service Worker and Cache APIs. Nothing is installed with npm and no external services are called.

## Folder structure

```
handcrafted-furniture-gallery/
├── index.html                  Page structure, landmarks, form markup, dialogs
├── service-worker.js           Caches app files for offline use
├── README.md  .gitignore
├── assets/images/              placeholder.svg (card fallback), favicon.svg
├── css/
│   ├── variables.css           Design tokens: colors, spacing (16/32px), type, shadows
│   ├── base.css                Reset, focus styles, reduced-motion, utilities
│   ├── layout.css              App shell, sidebar, page layout, toast area
│   ├── components.css          Buttons, cards, forms, table, badges, dialogs, states
│   └── responsive.css          Tablet and mobile adjustments
└── js/
    ├── app.js                  Wires everything: routing, events, rendering
    ├── config.js               Constants: limits, categories, statuses, storage keys
    ├── data/sample-furniture.js        Demo records (first launch only)
    ├── services/
    │   ├── storage-service.js          Safe localStorage access, schema version, migrations
    │   └── furniture-service.js        Record logic: CRUD, IDs, search, sort, stats, import/export
    ├── utils/
    │   ├── validation.js               Form validation and normalization
    │   ├── sanitization.js             Text cleaning and image URL checks
    │   ├── analytics.js                Console-only analytics
    │   ├── dom.js                      Safe element builder (textContent only)
    │   └── format.js                   Price, date, size and status formatting
    ├── components/
    │   ├── dashboard.js  gallery.js  furniture-form.js  furniture-details.js
    │   └── notifications.js            Toasts, banners, confirm dialog, empty/loading/error states
 
```

`utils/dom.js` and `utils/format.js` were added to the suggested structure to avoid duplicated code. The Manage records table is rendered by `gallery.js`.

## Prerequisites

A modern browser (current Chrome, Edge, Firefox or Safari) and one of: VS Code with the Live Server extension, or Python 3. A local server is required (see below).

## Setup on Windows

1. Copy the `handcrafted-furniture-gallery` folder anywhere, for example `C:\Projects\`.
2. Open it in VS Code (`File > Open Folder`), or open a terminal in the folder.
3. Start a server using one of the two options below.

### Option A: VS Code Live Server

1. Install the **Live Server** extension (publisher: Ritwick Dey).
2. Right-click `index.html` and choose **Open with Live Server**.
3. The app opens at `http://127.0.0.1:5500/` (the port may differ).

### Option B: Python

In PowerShell or Command Prompt inside the project folder:

```
python -m http.server 8000
```

If `python` is not recognised, try `py -m http.server 8000`. Open `http://localhost:8000/`. Stop the server with `Ctrl+C`.

### Why not double-click `index.html`?

Browsers block ES modules loaded from `file://` URLs (CORS rules), so the script would not run, and service workers only work on `http://localhost` or HTTPS. Always use a local server. If you open the file directly you will see a "Loading…" message that explains this.

## Using the app

- **Dashboard:** summary cards and recent items. Updates immediately after any change.
- **Search:** type in the search box on the Furniture gallery page. Matches are shown instantly; whitespace is trimmed and case is ignored. Multiple words must all match. Use **Clear search** or **Reset filters** to return to the full list.
- **Filter and sort:** choose a category, a status, and a sort order.
- **Add:** Add furniture > fill in the form > Save furniture. The ID (for example `FUR-7K3M9Q`) is generated for you.
- **Edit:** use Edit on a card or table row. The ID never changes.
- **View:** View details opens a dialog with all fields.
- **Delete:** Delete asks for confirmation; Cancel is focused by default.

Validation rules: name 2–80 characters; category, material (2–60) and artisan name (2–60, letters, spaces, `' . -`) are required; dimensions (max 1000 cm, 1 decimal) and price (max 1,000,000, 2 decimals) are optional, numeric and non-negative; description max 600 characters; image URL must be `http(s)://` or start with `assets/images/`. Currency and limits can be changed in `js/config.js`.

## Data storage

Records are stored in `localStorage` under `hfwg:v1:furniture` as:

```json
{ "schemaVersion": 1, "savedAt": "ISO date", "records": [ { "id": "FUR-0001", "name": "...", "category": "...",
  "material": "...", "artisan": "...", "dimensions": { "length": 45, "width": 50, "height": 90 },
  "price": 289, "status": "available", "description": "...", "imageUrl": "", "dateAdded": "ISO", "dateUpdated": "ISO" } ] }
```

- `hfwg:v1:meta` remembers that sample data was inserted, so it is **never inserted again** and never overwrites your records, even if you delete everything.
- `hfwg:v1:furniture:corrupt-backup` holds a copy of any data that could not be read.
- To change the data shape later, bump `SCHEMA_VERSION` in `config.js` and add a step to `MIGRATIONS` in `storage-service.js`.
- No personal or sensitive data is stored beyond the artisan names you enter.

## Offline behavior and limitations

- The first visit must happen with a working server and network (or local server) so the service worker can install and cache the files. Look for "Offline support: ready" in the page footer.
- After that, the app starts offline, and records (already in `localStorage`) can be browsed, added, edited and deleted.
- Remote image URLs are **not** cached; offline they show an "Image unavailable" box.
- Cached files refresh in the background (stale-while-revalidate), so after you edit code you may need to reload twice. For development, tick **Update on reload** or **Bypass for network** in DevTools > Application > Service Workers, and bump `CACHE_VERSION` in `service-worker.js` when releasing changes.
- The online/offline indicator uses the browser's `online`/`offline` events, which only reflect whether the device is connected to a network, not whether the internet is reachable.
- There is **no cross-device synchronization**. Data exists only in the browser profile that created it. Syncing requires a backend or remote database, which this version intentionally does not include.

## Backup, recovery and reset

Open **Manage records**:

- **Export backup (JSON):** downloads all records.
- **Import backup:** merges records from an export file. Invalid records and IDs that already exist are skipped and reported.
- **Add missing sample records:** non-destructive.
- **Reset to sample data:** replaces everything after confirmation. Export first.

If stored data is unreadable, the app shows a message, keeps a copy of the bad data, and starts with an empty list instead of crashing. If `localStorage` is unavailable (for example some private modes), the app runs in memory only and warns you that changes will be lost on refresh. If a save fails (for example storage is full) the change is rolled back, an error is shown, and your form entries stay in place.

## Accessibility and security

**Accessibility:** landmarks (`header`, `nav`, `main`, `footer`), one `h1` per view, labelled controls, helper and error text linked with `aria-describedby`, `aria-invalid`, `aria-live` regions for toasts and results, native `<dialog>` for confirmations, skip link, visible focus rings, status badges that use shape and text rather than color alone, and reduced-motion support. The target is WCAG 2.2 AA; **a Lighthouse audit has not been run**, so no score is claimed.

**Security:** all user text is rendered with `textContent` or safe DOM methods (no `innerHTML`, no `eval`). Text is normalized and validated before it is saved, and image URLs are limited to `http(s)` and `assets/images/` paths. Client-side validation alone is not complete security. This is a demo with no login; do not treat it as production-secure or use it for confidential data.

## Analytics simulation

`js/utils/analytics.js` writes messages like `[Analytics] User interacted with Handcrafted Furniture Workshop Gallery` to the browser console (DevTools > Console) with an action name: `furniture_created`, `furniture_updated`, `furniture_deleted`, `furniture_searched`, `record_viewed`, `filter_changed`, plus `data_exported`, `data_imported`, `data_reset`. Nothing is sent anywhere and search text is never logged.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Stuck on "Loading…" | You opened the file directly. Use a local server. |
| `python` not found | Try `py -m http.server 8000`, or use Live Server. |
| "Offline support is not available" | Use `http://localhost` or HTTPS. |
| Changes to code do not appear | The service worker is serving cached files. Hard refresh, or enable "Update on reload" in DevTools. |
| Records vanished | Browser data was cleared or a different browser/profile or port is in use (storage is per origin). Import a backup. |
| "Storage is full" | Export a backup and remove unneeded records or other site data. |

## Known limitations

No backend, no real authentication, no cross-device sync, records are per browser and per origin (a different port is a different dataset), images must be URLs or files in `assets/images/` (no uploads), and offline status is approximate.

## Future roadmap

Backend API with sync and user accounts, image upload, CSV export, print-friendly labels, pagination for very large datasets, automated unit tests.

## Testing checklist

Tick these when you verify them in your own browser:

- [ ] App launches with no console errors
- [ ] Sample records appear on first launch only
- [ ] Add, edit (ID unchanged) and delete (with confirmation) work and update the dashboard
- [ ] Search matches name, ID, category, material and artisan; "No data found" appears for no match
- [ ] Filters and sorting work
- [ ] Invalid input shows field messages and focuses the first invalid field
- [ ] Refresh keeps records
- [ ] Corrupt data (`localStorage.setItem('hfwg:v1:furniture','{')`) shows a banner and does not crash
- [ ] Broken image URL shows "Image unavailable"
- [ ] DevTools > Network > Offline shows the Offline indicator; reloading still works after the service worker is ready
- [ ] Keyboard-only use works everywhere
- [ ] Layout works at desktop, tablet and phone widths
- [ ] Console shows analytics messages after actions

### Automated checks run during development

A scripted headless Chromium run (Playwright) against a local Python server exercised the scenarios above, including add/edit/delete, search, filters, sorting, validation, XSS payload rendering, persistence, corrupted and partially corrupted storage, simulated storage-quota failure, offline/online switching, service-worker offline reload, and overflow checks at 1280, 820 and 390 px widths. These scripts are not part of the project. Lighthouse, screen-reader and cross-browser testing were **not** performed.

## License

No license selected yet. Replace this section, for example with the MIT License, before sharing the code.
