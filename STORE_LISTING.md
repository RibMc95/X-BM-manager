# Chrome Web Store listing — copy/paste source

Everything below is meant to be pasted into the Web Store Developer Dashboard
fields. Not part of the published package.

---

## Name
X Bookmark Manager

## Summary (short, max 132 chars)
Save tweets into your own categories and find them later — fully local, no login, no tracking.

## Category
Productivity

## Single purpose (required field)
Save links to tweets locally and organize them into user-defined categories.

## Detailed description
X Bookmark Manager is a lightweight, private way to save and organize tweets —
without the X API, an account login, or any fees.

Save a tweet three ways:
• Right-click any tweet on x.com and pick a category.
• Click "Save current tab" while viewing a tweet.
• Paste a tweet link directly into the popup.

Then browse everything in a clean popup, grouped by your own categories, with
instant search across category, handle, tweet ID, and URL.

Your data never leaves your device. Everything is stored locally in your
browser — no servers, no accounts, no analytics. Export your list to a JSON
file anytime for backup, and import it back on another machine.

Features:
• Categories you define
• Live search / filter
• One-click save from the toolbar or right-click menu
• JSON export & import for backup and transfer
• 100% local storage — nothing is transmitted

## Permission justifications (paste into the per-permission fields)

- activeTab — Used only when you click "Save current tab," to read the URL of
  the tab you're currently viewing so it can be saved. No background or
  cross-tab access.

- storage — Stores your saved tweet links and their categories locally on your
  device via chrome.storage.local. This is the extension's only data store.

- contextMenus — Adds the "Save to X Bookmark Manager" right-click menu item on
  x.com / twitter.com so you can save a tweet directly into a category.

## Data usage disclosures (dashboard checkboxes)
- Does this extension collect or use user data? → It stores data **locally
  only**; it does NOT collect, transmit, or share any data with the developer
  or third parties.
- Remote code: No. All code is contained in the package.
- Sold to third parties: No.
- Used for purposes unrelated to core functionality: No.
- Used to determine creditworthiness / lending: No.

## Privacy policy URL
Host PRIVACY.md somewhere public (e.g. a GitHub repo or Gist) and paste the URL.

## Visibility suggestion
Unlisted — shareable via direct link without appearing in search — is a good
choice for a first release. Switch to Public later.
