// ─── TMDB CONFIG ──────────────────────────────────────────────────────────────
// Get your free API key at: https://www.themoviedb.org/settings/api
const TMDB_KEY = 'a9f52604be50c2ed49af266ee752c534';

async function fetchTMDBPoster(title, year) {
    if (!TMDB_KEY || TMDB_KEY === 'YOUR_API_KEY_HERE') return null;
    try {
        const q = encodeURIComponent(title);
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${q}&year=${year}&language=en-US`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const hit = data.results?.find(r => r.poster_path);
        return hit ? `https://image.tmdb.org/t/p/w342${hit.poster_path}` : null;
    } catch {
        return null;
    }
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_FILMS = [
    { id: 1,  title: "Interstellar",           year: 2014, genre: "Sci-Fi",    rating: 5, desc: "As Earth becomes uninhabitable, a team of astronauts travels through a wormhole in search of a new home for humanity. The mission tests their understanding of space, time, and the power of love across dimensions.", watchDate: "" },
    { id: 2,  title: "Parasite",               year: 2019, genre: "Thriller",  rating: 5, desc: "A poor family cunningly infiltrates the household of a wealthy family by posing as unrelated skilled workers, but their scheme spirals into unexpected and dangerous consequences.", watchDate: "" },
    { id: 3,  title: "The Menu",               year: 2022, genre: "Thriller", rating: 5, desc: "A couple travels to a remote island to eat at an exclusive restaurant where the eccentric chef has prepared a lavish menu with some shocking and deadly surprises.", watchDate: "" },
    { id: 4,  title: "Spirited Away",          year: 2001, genre: "Animation", rating: 5, desc: "A young girl trapped in a magical spirit world must work in a bathhouse for supernatural beings to save her parents and find her way home.", watchDate: "" },
    { id: 5,  title: "Alice in Borderland",    year: 2020, genre: "Action",    rating: 5, desc: "A young man and his friends are transported to an abandoned version of Tokyo where they must compete in dangerous, life-or-death games.", watchDate: "" },
    { id: 6,  title: "Sweet Home",             year: 2020, genre: "Thriller",  rating: 5, desc: "After people begin turning into monsters driven by their deepest desires, residents of an apartment building must fight to stay alive.", watchDate: "" },
    { id: 7,  title: "Enola Holmes",           year: 2020, genre: "Mystery",   rating: 5, desc: "Enola, the clever younger sister of Sherlock Holmes, sets out to find her missing mother. Along the way, she solves mysteries and proves she has detective skills of her own.", watchDate: "" },
    { id: 8,  title: "Noragami",               year: 2014, genre: "Animation", rating: 5, desc: "A minor deity without a single shrine desperately seeks recognition by taking on odd jobs for five yen, aided by his human weapon and a stray spirit as he battles evil phantoms and rival gods.", watchDate: "" },
    { id: 9,  title: "Dune",                   year: 2021, genre: "Sci-Fi",    rating: 5, desc: "A noble family's son is thrust into a dangerous desert planet where he must navigate politics, religion, and war to protect its precious resource and fulfill a mysterious destiny.", watchDate: "" },
    { id: 10,  title: "Howl's Moving Castle",  year: 2004, genre: "Animation", rating: 5, desc: "A young hat maker is cursed by a witch and transformed into an old woman, finding refuge in the moving castle of a mysterious and powerful wizard named Howl.", watchDate: "" },
];

const STORAGE_KEY = 'bingebook_films';

function getFilms() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_FILMS));
    return SEED_FILMS;
}

function saveFilms(films) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(films));
}

// ─── BACKFILL POSTERS for existing films that have none ───────────────────────
async function backfillPosters() {
    if (!TMDB_KEY || TMDB_KEY === 'YOUR_API_KEY_HERE') return;
    const films = getFilms();
    const missing = films.filter(f => !f.posterUrl);
    if (missing.length === 0) return;

    for (const f of missing) {
        f.posterUrl = await fetchTMDBPoster(f.title, f.year);
        // Update the card immediately as each poster arrives
        const grid = document.getElementById('filmGrid');
        const cards = grid.querySelectorAll('.film-card');
        cards.forEach(card => {
            if (card.dataset.id === String(f.id)) {
                const placeholder = card.querySelector('.film-poster-loading, .film-poster-placeholder');
                if (placeholder && f.posterUrl) {
                    const img = document.createElement('img');
                    img.src = f.posterUrl;
                    img.alt = `${f.title} poster`;
                    img.className = 'film-poster';
                    img.onerror = function() { this.style.display = 'none'; };
                    placeholder.replaceWith(img);
                } else if (placeholder && !f.posterUrl) {
                    placeholder.innerHTML = `
                        <span class="placeholder-letter">${f.title.charAt(0)}</span>
                        <span class="placeholder-label">No Poster</span>
                    `;
                    placeholder.className = 'film-poster-placeholder';
                }
            }
        });
    }

    saveFilms(films);
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let activeGenre = 'All';
let activeSort  = 'rating';

function getFiltered() {
    let list = [...getFilms()];
    const q = document.getElementById('searchInput').value.toLowerCase();
    if (q) list = list.filter(f => f.title.toLowerCase().includes(q));
    if (activeGenre !== 'All') list = list.filter(f => f.genre === activeGenre);
    if (activeSort === 'rating') list.sort((a, b) => b.rating - a.rating || b.year - a.year);
    else if (activeSort === 'year')  list.sort((a, b) => b.year - a.year);
    else if (activeSort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
}

// ─── RENDER GRID ──────────────────────────────────────────────────────────────
function renderGrid() {
    const grid = document.getElementById('filmGrid');
    const list = getFiltered();

    if (list.length === 0) {
        grid.innerHTML = '<p style="color:#6b7280;font-size:13px;grid-column:1/-1;padding:20px 0;">No films match your search.</p>';
        return;
    }

    grid.innerHTML = list.map(f => {
        // Decide what to show in the poster slot
        let posterHTML;
        if (f.posterUrl) {
            // We have a saved URL — show the image
            posterHTML = `<img
                src="${f.posterUrl}"
                alt="${f.title} poster"
                class="film-poster"
                onerror="this.style.display='none'"
            />`;
        } else if (TMDB_KEY && TMDB_KEY !== 'YOUR_API_KEY_HERE') {
            // Key is set but poster not fetched yet — show shimmer
            posterHTML = `<div class="film-poster-loading"></div>`;
        } else {
            // No API key set — show letter placeholder
            posterHTML = `<div class="film-poster-placeholder">
                <span class="placeholder-letter">${f.title.charAt(0)}</span>
                <span class="placeholder-label">No Poster</span>
            </div>`;
        }

        return `
        <div class="film-card" data-id="${f.id}">
            ${posterHTML}
            <div class="card-body">
                <div class="card-header">
                    <h3>${f.title}</h3>
                    <span class="rating">★ ${f.rating}</span>
                </div>
                <span class="year">${f.year}</span>
                <span class="tag">${f.genre}</span>
                <p>${f.desc || '—'}</p>
                <div class="card-footer">
                    <div class="status-dot"></div>
                    <span class="status-label">Watched${f.watchDate ? ' · ' + f.watchDate : ''}</span>
                    <button class="delete-btn" onclick="deleteFilm(${f.id})">✕</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// ─── RENDER SIDEBAR ───────────────────────────────────────────────────────────
function renderStats() {
    const films = getFilms();
    const total = films.length;

    if (total === 0) {
        document.getElementById('statWatched').textContent  = '0';
        document.getElementById('statAvg').textContent      = '—';
        document.getElementById('statFivestar').textContent = '0';
        document.getElementById('statGenre').textContent    = '—';
        document.getElementById('recentList').innerHTML     = '<p style="font-size:12px;color:#4b5563;">No films logged yet.</p>';
        document.getElementById('genreBars').innerHTML      = '';
        return;
    }

    const avg      = (films.reduce((s, f) => s + f.rating, 0) / total).toFixed(1);
    const fivestar = films.filter(f => f.rating === 5).length;
    const genreCount = {};
    films.forEach(f => genreCount[f.genre] = (genreCount[f.genre] || 0) + 1);
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0][0];
    const maxCount = Math.max(...Object.values(genreCount));

    document.getElementById('statWatched').textContent  = total;
    document.getElementById('statAvg').textContent      = avg;
    document.getElementById('statFivestar').textContent = fivestar;
    document.getElementById('statGenre').textContent    = topGenre.length > 6 ? topGenre.slice(0, 5) + '.' : topGenre;

    const recent = [...films].slice(0, 3);
    document.getElementById('recentList').innerHTML = recent.map(f => `
        <div class="recent-item">
            <div>
                <div class="recent-name">${f.title}</div>
                <div class="recent-meta">${f.year} · ${f.genre}</div>
            </div>
            <span class="recent-stars">${'★'.repeat(f.rating)}</span>
        </div>
    `).join('');

    const sorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    document.getElementById('genreBars').innerHTML = sorted.map(([g, c]) => `
        <div class="genre-bar-wrap">
            <div class="genre-label-row">
                <span class="genre-name">${g}</span>
                <span class="genre-count">${c}</span>
            </div>
            <div class="genre-bar">
                <div class="genre-fill" style="width:${Math.round((c / maxCount) * 100)}%"></div>
            </div>
        </div>
    `).join('');
}

function refresh() {
    renderGrid();
    renderStats();
}

// ─── FILTERS & SORT ───────────────────────────────────────────────────────────
function setGenre(el, genre) {
    activeGenre = genre;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    renderGrid();
}

function sortCards(type, btn) {
    activeSort = type;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGrid();
}

function filterCards() { renderGrid(); }

// ─── DELETE ───────────────────────────────────────────────────────────────────
function deleteFilm(id) {
    if (!confirm('Remove this film from your watchlist?')) return;
    const films = getFilms().filter(f => f.id !== id);
    saveFilms(films);
    refresh();
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('formTitle').focus();
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('formTitle').value  = '';
    document.getElementById('formYear').value   = '';
    document.getElementById('formGenre').value  = '';
    document.getElementById('formRating').value = '';
    document.getElementById('formDesc').value   = '';
    document.getElementById('formError').textContent = '';
    document.querySelectorAll('.star-opt').forEach(s => s.classList.remove('active'));
    const btn = document.getElementById('btnSave');
    btn.textContent = 'Save Film';
    btn.disabled = false;
}

// ─── SAVE FILM (with poster fetch) ───────────────────────────────────────────
async function saveFilm() {
    const title     = document.getElementById('formTitle').value.trim();
    const year      = document.getElementById('formYear').value.trim();
    const genre     = document.getElementById('formGenre').value;
    const rating    = document.getElementById('formRating').value;
    const desc      = document.getElementById('formDesc').value.trim();
    const watchDate = document.getElementById('formDate').value;
    const errEl     = document.getElementById('formError');

    if (!title || !year || !genre || !rating) {
        errEl.textContent = 'Please fill in Title, Year, Genre, and Rating.';
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.textContent = 'Fetching poster…';
    btn.disabled = true;

    // Fetch poster once and store the URL — no re-fetching on every load
    const posterUrl = await fetchTMDBPoster(title, year);

    const films = getFilms();
    films.unshift({
        id: Date.now(),
        title,
        year:      parseInt(year),
        genre,
        rating:    parseInt(rating),
        desc,
        watchDate,
        posterUrl, // saved in localStorage as a URL string
    });
    saveFilms(films);

    closeModal();
    refresh();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Star picker interactions
    const stars = document.querySelectorAll('.star-opt');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = star.dataset.val;
            document.getElementById('formRating').value = val;
            stars.forEach(s => s.classList.toggle('active', s.dataset.val <= val));
        });
        star.addEventListener('mouseover', () => {
            stars.forEach(s => s.classList.toggle('hover', s.dataset.val <= star.dataset.val));
        });
        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });

    // Close modal on backdrop click
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

    // Initial render
    refresh();

    // Backfill posters for any films that don't have one yet
    backfillPosters();
});
