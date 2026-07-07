// Popup UI: save the current tab or a pasted link, and browse saved tweets by category.

const UNCATEGORIZED = "Uncategorized";

async function getBookmarks()
{
    const {bookmarks = []} = await chrome.storage.local.get("bookmarks");
    return bookmarks;
}

async function setBookmarks(bookmarks)
{
    await chrome.storage.local.set({bookmarks});
}

function parseTweetId(url)
{
    return url.match(/status\/(\d+)/)?.[1] ?? null;
}

// Suggest a category from a link's host (GitHub / YouTube), or null if unrecognized.
function classifyUrl(url)
{
    try
    {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        if (host === "github.com" || host.endsWith(".github.com"))
            return "GitHub";
        if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be")
            return "YouTube";
    }
    catch
    {
        // not a valid URL
    }
    return null;
}

async function addBookmark(url, category)
{
    url = (url || "").trim();
    if (!url)
        return;
    // If no category was chosen, auto-sort recognized links (e.g. a GitHub/YouTube link in a tweet).
    let cat = (category || "").trim();
    if (!cat)
        cat = classifyUrl(url) || UNCATEGORIZED;
    const bookmarks = await getBookmarks();
    if (bookmarks.some((b) => b.url === url))
        return; // ignore duplicates
    bookmarks.push({
        id : crypto.randomUUID(),
        url,
        tweetId : parseTweetId(url),
        category : cat,
        savedAt : Date.now(),
    });
    await setBookmarks(bookmarks);
    render();
}

async function removeBookmark(id)
{
    const bookmarks = (await getBookmarks()).filter((b) => b.id !== id);
    await setBookmarks(bookmarks);
    render();
}

// Short label for a saved link in the list.
function labelFor(b)
{
    const handle = b.url.match(/(?:x|twitter)\.com\/([^/]+)\/status/)?.[1];
    if (handle)
        return `@${handle}${b.tweetId ? " · " + b.tweetId : ""}`;
    return b.url.replace(/^https?:\/\//, "");
}

// True if the bookmark matches the search query (category, handle, tweet ID, or URL).
function matchesQuery(b, query)
{
    if (!query)
        return true;
    return `${b.category} ${labelFor(b)} ${b.url}`.toLowerCase().includes(query);
}

async function render()
{
    const bookmarks = await getBookmarks();

    // Refresh the category autocomplete suggestions (from the full, unfiltered list).
    const cats = [...new Set(bookmarks.map((b) => b.category)) ].sort((a, b) => a.localeCompare(b));
    document.getElementById("categories").innerHTML = cats
                                                          .map((c) => `<option value="${c}"></option>`)
                                                          .join("");

    const list = document.getElementById("list");
    if (bookmarks.length === 0)
    {
        list.innerHTML = `<div class="empty">No saved tweets yet.</div>`;
        return;
    }

    const query = document.getElementById("search").value.trim().toLowerCase();
    const visible = bookmarks.filter((b) => matchesQuery(b, query));
    if (visible.length === 0)
    {
        list.innerHTML = `<div class="empty">No matches for &ldquo;${query}&rdquo;.</div>`;
        return;
    }

    // Group by category, newest first within each group.
    const groups = {};
    for (const b of visible)
        (groups[b.category] ??= []).push(b);

    list.innerHTML = Object.keys(groups)
                         .sort((a, b) => a.localeCompare(b))
                         .map((cat) => {
                             const items = groups[cat]
                                               .sort((a, b) => b.savedAt - a.savedAt)
                                               .map(
                                                   (b) => `
          <div class="item">
            <a href="${b.url}" target="_blank" title="${b.url}">${labelFor(b)}</a>
            <button class="link" data-remove="${b.id}" title="Remove">✕</button>
          </div>`)
                                               .join("");
                             return `<div class="cat-group"><div class="cat-title">${cat} (${groups[cat].length})</div>${items}</div>`;
                         })
                         .join("");

    list.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => removeBookmark(btn.dataset.remove)));
}

document.getElementById("saveTab").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({active : true, currentWindow : true});
    if (tab?.url)
        await addBookmark(tab.url, document.getElementById("category").value);
});

document.getElementById("savePaste").addEventListener("click", async () => {
    const input = document.getElementById("pasteUrl");
    await addBookmark(input.value, document.getElementById("category").value);
    input.value = "";
    updateSuggestion();
});

// Offer a category when a pasted link is recognized (and none is set yet).
function updateSuggestion()
{
    const box = document.getElementById("suggestion");
    const url = document.getElementById("pasteUrl").value.trim();
    const detected = classifyUrl(url);
    const hasCategory = document.getElementById("category").value.trim() !== "";
    if (detected && !hasCategory)
    {
        document.getElementById("suggestText").textContent = `Detected ${detected} link — save under “${detected}”?`;
        box.dataset.category = detected;
        box.hidden = false;
    }
    else
    {
        box.hidden = true;
    }
}

document.getElementById("suggestUse").addEventListener("click", () => {
    document.getElementById("category").value = document.getElementById("suggestion").dataset.category || "";
    document.getElementById("suggestion").hidden = true;
});

document.getElementById("suggestOther").addEventListener("click", () => {
    document.getElementById("suggestion").hidden = true;
    document.getElementById("category").focus(); // let the user type a new category
});

document.getElementById("pasteUrl").addEventListener("input", updateSuggestion);
document.getElementById("category").addEventListener("input", updateSuggestion);

document.getElementById("search").addEventListener("input", render);

// Export all saved bookmarks as a downloadable JSON file.
document.getElementById("exportBtn").addEventListener("click", async () => {
    const bookmarks = await getBookmarks();
    const blob = new Blob([ JSON.stringify(bookmarks, null, 2) ], {type : "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xbm-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
});

// Merge an imported JSON file into existing bookmarks, skipping duplicate URLs.
document.getElementById("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file)
        return;

    let incoming;
    try
    {
        incoming = JSON.parse(await file.text());
    }
    catch
    {
        alert("That file isn't valid JSON.");
        return;
    }
    if (!Array.isArray(incoming))
    {
        alert("Expected a JSON array of bookmarks.");
        return;
    }

    const bookmarks = await getBookmarks();
    const seen = new Set(bookmarks.map((b) => b.url));
    let added = 0;
    for (const item of incoming)
    {
        const url = (item?.url || "").trim();
        if (!url || seen.has(url))
            continue;
        seen.add(url);
        bookmarks.push({
            id : crypto.randomUUID(),
            url,
            tweetId : parseTweetId(url),
            category : (item.category || "").trim() || UNCATEGORIZED,
            savedAt : typeof item.savedAt === "number" ? item.savedAt : Date.now(),
        });
        added++;
    }
    await setBookmarks(bookmarks);
    render();
    alert(`Imported ${added} new bookmark${added === 1 ? "" : "s"}.`);
});

render();
