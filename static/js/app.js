// Application State
let allReleases = [];
let filteredReleases = [];
let selectedReleaseId = null;

// Search & Filter State
let searchTerm = '';
let selectedType = 'all';
let sortOrder = 'desc'; // 'desc' (newest first) or 'asc' (oldest first)

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const lastFetchedText = document.getElementById('last-fetched-text');
const statusDot = document.querySelector('.status-dot');
const searchInput = document.getElementById('search-input');
const sortOrderSelect = document.getElementById('sort-order');
const typeFiltersContainer = document.getElementById('type-filters');
const releasesListContainer = document.getElementById('releases-list');
const resultsCount = document.getElementById('results-count');

const loadingListState = document.getElementById('loading-list-state');
const emptyListState = document.getElementById('empty-list-state');

// Detail Pane DOM Elements
const detailWelcomeState = document.getElementById('detail-welcome-state');
const detailContentState = document.getElementById('detail-content-state');
const detailPane = document.getElementById('detail-pane');
const detailTypeBadge = document.getElementById('detail-type-badge');
const detailDateVal = document.getElementById('detail-date-val');
const detailTitle = document.getElementById('detail-title');
const detailHtml = document.getElementById('detail-html');
const detailSourceLink = document.getElementById('detail-source-link');

// Tweet Composer DOM Elements
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountNumber = document.getElementById('char-count-number');
const charLimitWarning = document.getElementById('char-limit-warning');
const progressRingBar = document.getElementById('progress-ring-bar');
const tweetIntentBtn = document.getElementById('tweet-intent-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const copyToast = document.getElementById('copy-toast');

// Progress Ring Configuration
const ringRadius = 12;
const ringCircumference = 2 * Math.PI * ringRadius;

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    initProgressRing();
    fetchReleases(false);
    
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    exportCsvBtn.addEventListener('click', exportToCSV);
    searchInput.addEventListener('input', handleSearch);
    sortOrderSelect.addEventListener('change', handleSortChange);
    
    // Setup filter chip events
    const chips = typeFiltersContainer.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedType = chip.getAttribute('data-type');
            applyFiltersAndRender();
        });
    });

    // Tweet Composer Events
    tweetTextarea.addEventListener('input', updateTweetCounter);
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
});

// Init SVG progress ring for character counter
function initProgressRing() {
    progressRingBar.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressRingBar.style.strokeDashoffset = ringCircumference;
}

// Fetch releases from API
async function fetchReleases(forceRefresh = false) {
    // Show loading state
    setLoadingState(true);
    
    try {
        const url = `/api/releases?refresh=${forceRefresh}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allReleases = data.releases;
            
            // Format and display last fetched time
            updateLastFetchedTime(data.last_fetched);
            
            // Update filter counters
            updateFilterCounters();
            
            // Render list
            applyFiltersAndRender();
            
            // Re-select previously selected item if it still exists
            if (selectedReleaseId) {
                const stillExists = allReleases.some(r => r.id === selectedReleaseId);
                if (stillExists) {
                    selectRelease(selectedReleaseId);
                } else {
                    resetDetailPane();
                }
            }
        } else {
            alert(`Error: ${data.error || 'Failed to fetch release notes'}`);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Network error occurred while fetching release notes.');
    } finally {
        setLoadingState(false);
    }
}

// Set visual loading indicator
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spin');
        refreshBtn.disabled = true;
        statusDot.className = 'status-dot loading';
        lastFetchedText.textContent = 'Syncing release notes...';
        loadingListState.classList.remove('hidden');
        releasesListContainer.classList.add('hidden');
        emptyListState.classList.add('hidden');
    } else {
        refreshIcon.classList.remove('spin');
        refreshBtn.disabled = false;
        statusDot.className = 'status-dot online';
        loadingListState.classList.add('hidden');
        releasesListContainer.classList.remove('hidden');
    }
}

// Render last fetched string
function updateLastFetchedTime(isoString) {
    if (!isoString) {
        lastFetchedText.textContent = 'Never updated';
        return;
    }
    
    try {
        const date = new Date(isoString);
        const formatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastFetchedText.textContent = `Last synced at ${formatted}`;
    } catch (e) {
        lastFetchedText.textContent = 'Synced';
    }
}

// Update the counters inside filter chips
function updateFilterCounters() {
    const counts = {
        all: allReleases.length,
        feature: 0,
        announcement: 0,
        issue: 0,
        deprecated: 0
    };
    
    allReleases.forEach(r => {
        const type = r.type.toLowerCase();
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        }
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.feature;
    document.getElementById('count-announcement').textContent = counts.announcement;
    document.getElementById('count-issue').textContent = counts.issue;
    document.getElementById('count-deprecated').textContent = counts.deprecated;
}

// Handle real-time search input
function handleSearch(e) {
    searchTerm = e.target.value.toLowerCase();
    applyFiltersAndRender();
}

// Handle sort change
function handleSortChange(e) {
    sortOrder = e.target.value;
    applyFiltersAndRender();
}

// Apply searches, filters, and sorting, then render DOM list
function applyFiltersAndRender() {
    // 1. Filter
    filteredReleases = allReleases.filter(r => {
        // Type filter
        if (selectedType !== 'all' && r.type.toLowerCase() !== selectedType) {
            return false;
        }
        
        // Search filter (searches date, type, content preview, and raw text)
        if (searchTerm) {
            const dateMatch = r.date.toLowerCase().includes(searchTerm);
            const typeMatch = r.type.toLowerCase().includes(searchTerm);
            const textMatch = r.text_content.toLowerCase().includes(searchTerm);
            return dateMatch || typeMatch || textMatch;
        }
        
        return true;
    });
    
    // 2. Sort
    filteredReleases.sort((a, b) => {
        const dateA = new Date(a.updated_iso || a.date);
        const dateB = new Date(b.updated_iso || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // 3. Render
    renderReleasesList();
}

// Render list of release cards to sidebar
function renderReleasesList() {
    releasesListContainer.innerHTML = '';
    
    // Update count display
    resultsCount.textContent = `Showing ${filteredReleases.length} updates`;
    
    if (filteredReleases.length === 0) {
        emptyListState.classList.remove('hidden');
        releasesListContainer.classList.add('hidden');
        return;
    }
    
    emptyListState.classList.add('hidden');
    releasesListContainer.classList.remove('hidden');
    
    filteredReleases.forEach(release => {
        const card = document.createElement('div');
        const typeClass = release.type.toLowerCase();
        card.className = `release-card ${typeClass} ${selectedReleaseId === release.id ? 'active' : ''}`;
        card.setAttribute('data-id', release.id);
        
        // Get snippet title from content
        // Clean title: use the first 45 characters of text content, or the type if empty
        const titleSnippet = release.text_content.length > 55
            ? release.text_content.substring(0, 55) + '...'
            : release.text_content || `${release.type} Update`;
            
        card.innerHTML = `
            <div class="card-header-meta">
                <span class="badge ${typeClass}">${release.type}</span>
                <div class="card-header-actions">
                    <button class="card-copy-btn" title="Copy release text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <span class="card-date">${release.date}</span>
                </div>
            </div>
            <h4 class="card-title">${titleSnippet}</h4>
            <p class="card-preview">${release.text_content}</p>
        `;
        
        const copyBtn = card.querySelector('.card-copy-btn');
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Avoid selecting the card
            try {
                await navigator.clipboard.writeText(release.text_content);
                copyBtn.classList.add('copied');
                // Temporarily replace SVG with a checkmark for feedback
                const origSVG = copyBtn.innerHTML;
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = origSVG;
                }, 1500);
            } catch (err) {
                console.error('Failed to copy card text:', err);
            }
        });
        
        card.addEventListener('click', () => selectRelease(release.id));
        releasesListContainer.appendChild(card);
    });
}

// Select a release and show it in the detail pane
function selectRelease(id) {
    selectedReleaseId = id;
    
    // Update active class on list items
    const cards = releasesListContainer.querySelectorAll('.release-card');
    cards.forEach(card => {
        if (card.getAttribute('data-id') === id) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    const release = allReleases.find(r => r.id === id);
    if (!release) return;
    
    // Populating detail pane
    detailTypeBadge.className = `badge ${release.type.toLowerCase()}`;
    detailTypeBadge.textContent = release.type;
    detailDateVal.textContent = release.date;
    detailTitle.textContent = `${release.type} - ${release.date}`;
    detailHtml.innerHTML = release.html_content;
    detailSourceLink.href = release.link || 'https://cloud.google.com/bigquery/docs/release-notes';
    
    // Set target="_blank" for all links in parsed HTML to open in new tab
    const innerLinks = detailHtml.querySelectorAll('a');
    innerLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });

    // Populate Twitter draft and update layout
    setupTwitterComposer(release);
    
    // Transition UI
    detailWelcomeState.classList.add('hidden');
    detailContentState.classList.remove('hidden');
    
    // Scroll detail pane to top
    detailPane.scrollTop = 0;
}

// Reset detail view if selection is lost
function resetDetailPane() {
    selectedReleaseId = null;
    detailWelcomeState.classList.remove('hidden');
    detailContentState.classList.add('hidden');
}

// Draft a tweet pre-filled and formatted for character limit
function setupTwitterComposer(release) {
    const hashtags = ' #BigQuery #GCP';
    const linkStr = release.link ? `\n\nDetails: ${release.link}` : '';
    
    // Calculate base string lengths:
    // "📢 BigQuery Feature (June 17, 2026): "
    const prefix = `📢 BigQuery ${release.type} (${release.date}): `;
    
    // Twitter link shortening handles all URLs as 23 characters in length.
    // For local counting, let's treat the link as 23 characters for Twitter.
    // Let's compute text length allowance:
    const linkLengthForTwitter = 23;
    const newlineChars = 2; // For '\n\n'
    const detailsLabelLength = 9; // For 'Details: '
    
    const fixedLength = prefix.length + (release.link ? (newlineChars + detailsLabelLength + linkLengthForTwitter) : 0) + hashtags.length;
    const allowedTextLength = 280 - fixedLength - 5; // minus small margin
    
    let tweetBodyText = release.text_content;
    if (tweetBodyText.length > allowedTextLength) {
        tweetBodyText = tweetBodyText.substring(0, allowedTextLength - 3) + '...';
    }
    
    const fullTweetDraft = `${prefix}${tweetBodyText}${release.link ? `\n\nDetails: ${release.link}` : ''}${hashtags}`;
    
    tweetTextarea.value = fullTweetDraft;
    updateTweetCounter();
}

// Character counter and visual progress update
function updateTweetCounter() {
    const text = tweetTextarea.value;
    
    // For precise Twitter matching, we should calculate character counts
    // recognizing that URLs count as 23 characters.
    // Let's find URL matches in text:
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedLength = text.length;
    
    const urls = text.match(urlRegex);
    if (urls) {
        urls.forEach(url => {
            // Subtract actual url length and add 23 characters standard
            computedLength = computedLength - url.length + 23;
        });
    }
    
    const remaining = 280 - computedLength;
    charCountNumber.textContent = remaining >= 0 ? remaining : Math.abs(remaining);
    
    // Update progress ring
    const percent = Math.min(computedLength / 280, 1);
    const strokeDashoffset = ringCircumference * (1 - percent);
    progressRingBar.style.strokeDashoffset = strokeDashoffset;
    
    // Update counter states (color classes and button accessibility)
    if (remaining < 0) {
        // Exceeded
        progressRingBar.style.stroke = '#ef4444'; // Red
        charCountNumber.style.color = '#ef4444';
        charLimitWarning.classList.remove('hidden');
        tweetIntentBtn.classList.add('disabled');
        tweetIntentBtn.removeAttribute('href');
    } else if (remaining <= 40) {
        // Warning (under 40 left)
        progressRingBar.style.stroke = '#f97316'; // Orange
        charCountNumber.style.color = '#f97316';
        charLimitWarning.classList.add('hidden');
        tweetIntentBtn.classList.remove('disabled');
        tweetIntentBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    } else {
        // Safe
        progressRingBar.style.stroke = '#3b82f6'; // Blue
        charCountNumber.style.color = '#94a3b8';
        charLimitWarning.classList.add('hidden');
        
        if (text.trim().length === 0) {
            tweetIntentBtn.classList.add('disabled');
            tweetIntentBtn.removeAttribute('href');
        } else {
            tweetIntentBtn.classList.remove('disabled');
            tweetIntentBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        }
    }
}

// Copy Tweet text draft to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success toast
        copyToast.classList.remove('hidden');
        setTimeout(() => {
            copyToast.classList.add('hidden');
        }, 2000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}

// Export the currently filtered list of releases to CSV file
function exportToCSV() {
    if (filteredReleases.length === 0) {
        alert("No release notes found to export.");
        return;
    }
    
    // CSV Headers
    const headers = ["Date", "Type", "Link", "Content"];
    
    // Convert rows
    const csvRows = [
        headers.join(",") // Headers row
    ];
    
    filteredReleases.forEach(r => {
        // Escape helper to handle double quotes and commas in CSV
        const escape = (text) => {
            if (text === null || text === undefined) return '""';
            const formatted = text.toString().replace(/"/g, '""');
            return `"${formatted}"`;
        };
        
        const row = [
            escape(r.date),
            escape(r.type),
            escape(r.link),
            escape(r.text_content)
        ];
        csvRows.push(row.join(","));
    });
    
    // Generate CSV blob and trigger download
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
