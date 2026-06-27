// Background service worker: right-click context menu to save tweets locally.

const X_PATTERNS = [ "https://x.com/*", "https://twitter.com/*" ];
const UNCATEGORIZED = "Uncategorized";

// Pull tweet ID (the numeric part of /status/123) out of a URL, or null.
function parseTweetId(url)
{
    return url.match(/status\/(\d+)/)?.[1] ?? null;
}

// Distinct categories currently in use, for building the menu submenu.
async function getCategories()
{
    const {bookmarks = []} = await chrome.storage.local.get("bookmarks");
    const cats = new Set(bookmarks.map((b) => b.category).filter(Boolean));
    return [...cats ].sort((a, b) => a.localeCompare(b));
}

// (Re)build the context menu so its submenu reflects existing categories.
async function rebuildMenus()
{
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        id : "root",
        title : "Save to X Bookmark Manager",
        contexts : [ "link", "page" ],
        documentUrlPatterns : X_PATTERNS,
    });

    const categories = await getCategories();
    chrome.contextMenus.create({
        id : `cat:${UNCATEGORIZED}`,
        parentId : "root",
        title : UNCATEGORIZED,
        contexts : [ "link", "page" ],
    });
    for (const cat of categories)
    {
        chrome.contextMenus.create({
            id : `cat:${cat}`,
            parentId : "root",
            title : cat,
            contexts : [ "link", "page" ],
        });
    }
}

async function saveBookmark(url, category)
{
    if (!url)
        return;
    const {bookmarks = []} = await chrome.storage.local.get("bookmarks");

    // Skip exact-URL duplicates so re-saving doesn't pile up entries.
    if (bookmarks.some((b) => b.url === url))
    {
        flashBadge("=");
        return;
    }

    bookmarks.push({
        id : crypto.randomUUID(),
        url,
        tweetId : parseTweetId(url),
        category : category || UNCATEGORIZED,
        savedAt : Date.now(),
    });
    await chrome.storage.local.set({bookmarks});
    flashBadge("✓"); // checkmark
}

// Brief visual confirmation on the toolbar icon (no notifications permission needed).
function flashBadge(text)
{
    chrome.action.setBadgeBackgroundColor({color : "#1d9bf0"});
    chrome.action.setBadgeText({text});
    setTimeout(() => chrome.action.setBadgeText({text : ""}), 1500);
}

chrome.contextMenus.onClicked.addListener((info) => {
    if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith("cat:"))
        return;
    const category = info.menuItemId.slice("cat:".length);
    const url = info.linkUrl || info.pageUrl;
    saveBookmark(url, category);
});

// Keep the category submenu in sync when bookmarks change from the popup.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.bookmarks)
        rebuildMenus();
});

chrome.runtime.onInstalled.addListener(rebuildMenus);
chrome.runtime.onStartup.addListener(rebuildMenus);
