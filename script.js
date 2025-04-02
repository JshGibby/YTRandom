let retryCount = 1;
const maxRetries = 1;
const retryDelay = 30000; // 30 seconds

// Sample default data for when fetches fail
const defaultGenres = ['pop', 'rock', 'jazz', 'electronic', 'hip hop', 'classical', 'country', 'folk', 'metal', 'indie', 'blues', 'r&b', 'reggae'];
const defaultWords = ['love', 'heart', 'dream', 'stars', 'fire', 'dance', 'night', 'life', 'soul', 'time', 'summer', 'freedom', 'sunshine', 'rain', 'moon', 'river', 'ocean', 'heaven', 'forever', 'paradise'];

function toggleLoading(show) {
    const loadingElement = document.getElementById('loading');
    const videoContainer = document.getElementById('video-container');
    if (show) {
        loadingElement.classList.remove('hidden');
        videoContainer.innerHTML = '';
    } else {
        loadingElement.classList.add('hidden');
    }
}

function openCORS() {
    window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
}

function toggleInput(inputId, checkboxId) {
    const input = document.getElementById(inputId);
    const checkbox = document.getElementById(checkboxId);
    input.disabled = checkbox.checked;
    if (checkbox.checked) {
        input.classList.add('bg-gray-100', 'cursor-not-allowed');
    } else {
        input.classList.remove('bg-gray-100', 'cursor-not-allowed');
    }
}

async function fetchTextFile(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        const text = await response.text();
        return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (error) {
        console.error('Error fetching text file:', error);
        return url.includes('genres') ? defaultGenres : defaultWords; // return appropriate fallback data
    }
}

async function getRandomWord() {
    const words = await fetchTextFile("https://raw.githubusercontent.com/JshGibby/YTRandom/refs/heads/main/words.txt");
    return words[Math.floor(Math.random() * words.length)] || defaultWords[Math.floor(Math.random() * defaultWords.length)];
}

async function getRandomGenre() {
    const genres = await fetchTextFile("https://raw.githubusercontent.com/JshGibby/YTRandom/refs/heads/main/genres.txt");
    return genres[Math.floor(Math.random() * genres.length)] || defaultGenres[Math.floor(Math.random() * defaultGenres.length)];
}

async function fetchLyrics(artist, songTitle) {
    const cleanTitle = songTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim(); // Remove anything in parentheses or brackets
    try {
        document.getElementById('lyrics').innerHTML = '<div class="text-center py-8">Loading lyrics...</div>';
        
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(cleanTitle)}`);
        if (!response.ok) {
            throw new Error(response.status === 404 ? "No lyrics found" : "Lyrics service error");
        }
        const data = await response.json();
        
        if (data.lyrics) {
            return `<div class="space-y-2">${data.lyrics.replace(/\n\n/g, '</div><div class="mt-4">').replace(/\n/g, '<br>')}</div>`;
        } else {
            throw new Error("No lyrics found");
        }
    } catch (error) {
        console.error('Lyrics fetch error:', error);
        return `<div class="text-center py-8 text-gray-500">Lyrics not available for this song.</div>`;
    }
}

function createYouTubeEmbed(videoId) {
    return `
        <div class="relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                class="absolute top-0 left-0 w-full h-full">
            </iframe>
        </div>
    `;
}

async function searchSong() {
    try {
        // Reset error message
        document.getElementById('error-message').classList.add('hidden');
        
        // Show loading state
        toggleLoading(true);
        document.getElementById('lyrics').innerHTML = '';
        document.getElementById('video-info').innerHTML = '';

        const titleInput = document.getElementById('title');
        const genreInput = document.getElementById('genre');
        const useRandomTitle = document.getElementById('randomTitle').checked;
        const useRandomGenre = document.getElementById('randomGenre').checked;
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const type = document.querySelector('input[name="type"]:checked').value;

        // Set random title/genre if checked
        if (useRandomTitle) {
            titleInput.value = await getRandomWord();
        }

        if (useRandomGenre) {
            genreInput.value = await getRandomGenre();
        }

        const title = titleInput.value;
        const genre = genreInput.value;

        if (!title && !useRandomTitle) {
            throw new Error("Please enter a song title or check 'Use random title'");
        }

        const searchQuery = `${title} ${genre} (${type})`;
        const encodedSearchQuery = encodeURIComponent(searchQuery);
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = `https://www.youtube.com/results?search_query=${encodedSearchQuery}`;
        const url = proxyUrl + targetUrl;

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.log(`Rate limit exceeded. Retrying after delay... (${retryCount}/${maxRetries})`);
                    
                    const errorElement = document.getElementById('error-message');
                    errorElement.classList.remove('hidden');
                    document.getElementById('error-text').innerText = `Rate limit exceeded. Retrying after ${retryDelay/1000} seconds... (${retryCount}/${maxRetries})`;
                    
                    setTimeout(searchSong, retryDelay);
                    return;
                } else {
                    throw new Error(`Rate limit exceeded. Please wait and try again later.`);
                }
            } else {
                throw new Error(`YouTube search failed. Status: ${response.status}`);
            }
        }
        const text = await response.text();
        const videoIdMatches = text.match(/"videoId":"(.*?)"/g) || [];
        const titleMatches = text.match(/"title":{"runs":\[{"text":"(.*?)"}/g) || [];

        if (videoIdMatches.length > 0) {
            let videoId, videoTitle;
            if (searchType === "Top Result") {
                videoId = videoIdMatches[0].match(/"videoId":"(.*?)"/)[1];
                videoTitle = titleMatches[0].match(/"title":{"runs":\[{"text":"(.*?)"}/)[1];
            } else {
                const randomIndex = Math.floor(Math.random() * videoIdMatches.length);
                videoId = videoIdMatches[randomIndex].match(/"videoId":"(.*?)"/)[1];
                videoTitle = titleMatches[randomIndex] ? 
                    titleMatches[randomIndex].match(/"title":{"runs":\[{"text":"(.*?)"}/)[1] : 
                    `Random Video ${randomIndex + 1}`;
            }

            const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
            
            // Embed YouTube video
            document.getElementById('video-container').innerHTML = createYouTubeEmbed(videoId);

            // Display video info with nice styling
            document.getElementById('video-info').innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-sm">
                    <h3 class="text-lg font-semibold text-red-600 mb-1">${videoTitle.replace(/&quot;/g, '"')}</h3>
                    <div class="flex items-center space-x-2 text-sm text-gray-500 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>YouTube Video</span>
                    </div>
                    <a href="${videoLink}" target="_blank" class="mt-3 inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors">
                        Open in YouTube
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            `;

            // Extract artist and song title for lyrics fetching
            let artist = "";
            let songTitle = videoTitle;
            if (videoTitle.includes(" - ")) {
                const parts = videoTitle.split(" - ");
                if (parts.length === 2) {
                    artist = parts[0].trim();
                    songTitle = parts[1].trim();
                }
            }

            if (artist && songTitle) {
                const lyrics = await fetchLyrics(artist, songTitle);
                document.getElementById('lyrics').innerHTML = lyrics;
            } else {
                document.getElementById('lyrics').innerHTML = '<div class="text-center py-8 text-gray-500">Unable to identify artist and song title for lyrics.</div>';
            }

            console.log('Retrieved Video:', videoTitle);
        } else {
            throw new Error("No videos found matching your search criteria");
        }
    } catch (error) {
        console.error('An error occurred while searching for the song:', error);
        const errorElement = document.getElementById('error-message');
        errorElement.classList.remove('hidden');
        document.getElementById('error-text').textContent = error.message;
    } finally {
        toggleLoading(false);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set initial disabled states
    const randomTitleChecked = document.getElementById('randomTitle').checked;
    const randomGenreChecked = document.getElementById('randomGenre').checked;
    if (randomTitleChecked) document.getElementById('title').disabled = true;
    if (randomGenreChecked) document.getElementById('genre').disabled = true;
});

