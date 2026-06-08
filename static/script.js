/**
 * YouTube Fact-Checker Frontend
 * 
 * Handles user interaction and displays fact-checking results.
 */

/**
 * Main function to analyze a YouTube video.
 * Sends the URL to the backend and displays results.
 */
async function analyzeVideo() {
    const url = document.getElementById('youtubeUrl').value.trim();
    const btn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const results = document.getElementById('results');
    
    // Reset UI state
    error.style.display = 'none';
    results.style.display = 'none';
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }
    
    // Validate URL format (basic check)
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        showError('Please enter a valid YouTube URL');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btnText.textContent = 'Analyzing...';
    btnLoader.style.display = 'inline-block';
    loading.style.display = 'block';
    updateLoadingStep('Extracting transcript...');
    
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        // Display results
        displayResults(data);
        
    } catch (err) {
        showError(err.message);
    } finally {
        loading.style.display = 'none';
        btn.disabled = false;
        btnText.textContent = 'Analyze Video';
        btnLoader.style.display = 'none';
    }
}

/**
 * Apply the selected theme to the page.
 * @param {string} theme - The theme name ('dark' or 'light')
 */
function applyTheme(theme) {
    const normalizedTheme = theme === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = normalizedTheme;

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const isDark = normalizedTheme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        const toggleText = themeToggle.querySelector('.theme-toggle-text');
        const toggleIcon = themeToggle.querySelector('.theme-toggle-icon');
        if (toggleText) toggleText.textContent = isDark ? 'Dark mode' : 'Light mode';
        if (toggleIcon) toggleIcon.textContent = isDark ? '☀️' : '🌙';
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
        themeColor.setAttribute('content', isDarkTheme(normalizedTheme) ? '#0f172a' : '#f8fafc');
    }

    localStorage.setItem('yt-fact-checker-theme', normalizedTheme);
}

/**
 * Check whether the given theme is dark.
 * @param {string} theme - The theme name.
 * @returns {boolean} True if the theme is dark.
 */
function isDarkTheme(theme) {
    return theme !== 'light';
}

/**
 * Toggle between light and dark themes.
 */
function toggleTheme() {
    const currentTheme = document.body.dataset.theme || 'dark';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

/**
 * Update the loading step message.
 * @param {string} step - The current step description
 */
function updateLoadingStep(step) {
    const loadingStep = document.getElementById('loadingStep');
    if (loadingStep) {
        loadingStep.textContent = step;
    }
}

/**
 * Display an error message to the user.
 * @param {string} message - The error message
 */
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = '❌ ' + message;
    error.style.display = 'block';
}

/**
 * Display the fact-checking results.
 * @param {Object} data - The response data from the API
 */
function displayResults(data) {
    const results = document.getElementById('results');
    const claimsList = document.getElementById('claimsList');
    
    // Handle case with no claims
    if (data.results.length === 0) {
        document.getElementById('totalClaims').textContent = '0';
        document.getElementById('supported').textContent = '0';
        document.getElementById('contradicted').textContent = '0';
        document.getElementById('insufficient').textContent = '0';
        
        claimsList.innerHTML = '<div class="no-claims">No verifiable factual claims found in this video.</div>';
        results.style.display = 'block';
        return;
    }
    
    // Calculate stats using canonical labels
    const supported = data.results.filter(r => r.classification === 'SUPPORTED').length;
    const refuted = data.results.filter(r => r.classification === 'REFUTED').length;
    const inconclusive = data.results.filter(r => 
        r.classification === 'INCONCLUSIVE' || r.classification === 'UNVERIFIABLE'
    ).length;
    
    // Update stats display
    document.getElementById('totalClaims').textContent = data.results.length;
    document.getElementById('supported').textContent = supported;
    document.getElementById('contradicted').textContent = refuted;
    document.getElementById('insufficient').textContent = inconclusive;
    
    // Display claims
    claimsList.innerHTML = '';
    data.results.forEach((claim, index) => {
        const card = createClaimCard(claim, index + 1);
        claimsList.appendChild(card);
    });
    
    results.style.display = 'block';
    results.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Create a claim card element.
 * @param {Object} claim - The claim data
 * @param {number} index - The claim index
 * @returns {HTMLElement} The claim card element
 */
function createClaimCard(claim, index) {
    const card = document.createElement('div');
    card.className = 'claim-card';
    
    // Map classification to CSS class
    const classificationClass = getClassificationClass(claim.classification);
    
    // Build evidence HTML
    let evidenceHTML = '';
    if (claim.evidence && claim.evidence.pubmed && claim.evidence.pubmed.length > 0) {
        evidenceHTML += '<div class="evidence-sources"><h4>📚 Scientific Sources:</h4>';
        claim.evidence.pubmed.forEach(source => {
            evidenceHTML += `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" class="evidence-link">→ ${escapeHtml(source.title)}</a>`;
        });
        evidenceHTML += '</div>';
    }
    
    // Build medical warning HTML
    let warningHTML = '';
    if (claim.medical_warning) {
        warningHTML = '<div class="medical-warning">⚠️ Medical content - consult a healthcare professional</div>';
    }
    
    card.innerHTML = `
        <div class="claim-header">
            <span class="timestamp">⏱ ${formatTime(claim.timestamp.start)}</span>
        </div>
        <div class="claim-text">${escapeHtml(claim.claim)}</div>
        ${warningHTML}
        <span class="classification ${classificationClass}">${formatClassification(claim.classification)}</span>
        <div class="reasoning">${escapeHtml(claim.reasoning)}</div>
        ${evidenceHTML}
    `;
    
    return card;
}

/**
 * Get the CSS class for a classification.
 * @param {string} classification - The classification label
 * @returns {string} The CSS class name
 */
function getClassificationClass(classification) {
    switch (classification) {
        case 'SUPPORTED':
            return 'supported';
        case 'REFUTED':
            return 'contradicted';
        case 'INCONCLUSIVE':
        case 'UNVERIFIABLE':
            return 'insufficient';
        case 'ERROR':
            return 'error';
        default:
            return 'insufficient';
    }
}

/**
 * Format the classification for display.
 * @param {string} classification - The classification label
 * @returns {string} The formatted display text
 */
function formatClassification(classification) {
    switch (classification) {
        case 'SUPPORTED':
            return '✅ Supported';
        case 'REFUTED':
            return '❌ Refuted';
        case 'INCONCLUSIVE':
            return '❓ Inconclusive';
        case 'UNVERIFIABLE':
            return '⚠️ Unverifiable';
        case 'ERROR':
            return '⚠️ Error';
        default:
            return classification;
    }
}

/**
 * Format seconds into MM:SS format.
 * @param {number} seconds - The time in seconds
 * @returns {string} The formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Escape HTML to prevent XSS attacks.
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listener for Enter key on URL input
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('yt-fact-checker-theme') || 'dark';
    applyTheme(savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const urlInput = document.getElementById('youtubeUrl');
    if (urlInput) {
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeVideo();
            }
        });
    }
});