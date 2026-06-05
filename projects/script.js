/* =============================================
   PROJECTS PAGE — script.js
   Kavindu Akash Portfolio
   ============================================= */

// ---- Navbar toggle ----
$(document).ready(function () {
    $('#menu').click(function () {
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
    });
    $(window).on('scroll load', function () {
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');
        if (window.scrollY > 60) {
            document.querySelector('#scroll-top').classList.add('active');
        } else {
            document.querySelector('#scroll-top').classList.remove('active');
        }
    });
});

// ---- Tab visibility ----
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        document.title = 'Projects | Kavindu Akash';
        $('#favicon').attr('href', '/assets/images/favicon.png');
    } else {
        document.title = 'Come Back To Portfolio';
        $('#favicon').attr('href', '/assets/images/favhand.png');
    }
});

// ---- Category labels & icons ----
const categoryLabels = { fullstack: 'Full Stack', mobile: 'Mobile App', python: 'Python', cpp: 'C / C++' };
const categoryIcons  = { fullstack: 'fa-globe', mobile: 'fa-mobile-alt', python: 'fa-python', cpp: 'fa-code' };

// ---- Global projects store (needed by modal) ----
let allProjects = [];

/* ==============================================
   LIGHTBOX MODAL
   ============================================== */
(function buildModal() {
    const el = document.createElement('div');
    el.id = 'lightbox';
    el.innerHTML = `
        <div class="lb-overlay"></div>
        <div class="lb-container">
            <button class="lb-close" id="lbClose" aria-label="Close">&times;</button>
            <div class="lb-header">
                <h3 class="lb-title" id="lbTitle"></h3>
                <span class="lb-counter" id="lbCounter"></span>
            </div>
            <div class="lb-stage">
                <button class="lb-arrow lb-prev" id="lbPrev" aria-label="Previous">&#8249;</button>
                <div class="lb-img-wrap">
                    <img class="lb-img" id="lbImg" src="" alt="" />
                    <div class="lb-spinner" id="lbSpinner"><i class="fas fa-circle-notch fa-spin"></i></div>
                </div>
                <button class="lb-arrow lb-next" id="lbNext" aria-label="Next">&#8250;</button>
            </div>
            <div class="lb-dots" id="lbDots"></div>
            <div class="lb-thumbs" id="lbThumbs"></div>
        </div>`;
    document.body.appendChild(el);

    // state
    let images = [], current = 0;

    function open(project, startIndex) {
        // Build image paths using folder + image name
        images = project.images.map(n => `/assets/images/projects/${project.folder}/${n}.png`);
        current = startIndex || 0;
        document.getElementById('lbTitle').textContent = project.name;
        buildThumbs(project);
        buildDots();
        show(current);
        el.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        el.classList.remove('active');
        document.body.style.overflow = '';
    }

    function show(idx) {
        current = (idx + images.length) % images.length;
        const img  = document.getElementById('lbImg');
        const spin = document.getElementById('lbSpinner');
        img.style.opacity = '0';
        spin.style.display = 'flex';
        img.src = images[current];
        img.alt = `Screenshot ${current + 1}`;
        img.onload = () => { img.style.opacity = '1'; spin.style.display = 'none'; };
        img.onerror = () => { spin.style.display = 'none'; img.style.opacity = '1'; };
        document.getElementById('lbCounter').textContent = `${current + 1} / ${images.length}`;
        document.querySelectorAll('.lb-dot').forEach((d, i) => d.classList.toggle('active', i === current));
        document.querySelectorAll('.lb-thumb').forEach((t, i) => t.classList.toggle('active', i === current));
    }

    function buildDots() {
        const wrap = document.getElementById('lbDots');
        // Dynamically generate dots based on images array length — no hardcoding
        wrap.innerHTML = images.map((_, i) =>
            `<span class="lb-dot${i===0?' active':''}" data-i="${i}"></span>`
        ).join('');
        wrap.querySelectorAll('.lb-dot').forEach(d =>
            d.addEventListener('click', () => show(parseInt(d.dataset.i)))
        );
    }

    function buildThumbs(project) {
        const wrap = document.getElementById('lbThumbs');
        // Dynamically generate thumbnails for all images in the project's folder
        wrap.innerHTML = project.images.map((name, i) =>
            `<div class="lb-thumb${i===0?' active':''}" data-i="${i}">
                <img src="/assets/images/projects/${project.folder}/${name}.png"
                     alt="thumb ${i+1}"
                     onerror="this.parentElement.style.background='#1a1a50';this.remove()" />
             </div>`
        ).join('');
        wrap.querySelectorAll('.lb-thumb').forEach(t =>
            t.addEventListener('click', () => show(parseInt(t.dataset.i)))
        );
    }

    // events
    document.getElementById('lbClose').addEventListener('click', close);
    el.querySelector('.lb-overlay').addEventListener('click', close);
    document.getElementById('lbPrev').addEventListener('click', () => show(current - 1));
    document.getElementById('lbNext').addEventListener('click', () => show(current + 1));

    document.addEventListener('keydown', e => {
        if (!el.classList.contains('active')) return;
        if (e.key === 'ArrowRight') show(current + 1);
        if (e.key === 'ArrowLeft')  show(current - 1);
        if (e.key === 'Escape')     close();
    });

    // expose globally
    window.openLightbox = open;
})();

/* ==============================================
   CARD BUILDER
   ============================================== */
function buildCard(project, cardIndex) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.category = project.category;

    // Use project.images.length — no hardcoded count
    const totalSlides = project.images.length;
    const icon = categoryIcons[project.category] || 'fa-code';

    // Build slides using folder-based path: /assets/images/projects/{folder}/{image}.png
    let slidesHTML = '';
    project.images.forEach((imgName, i) => {
        slidesHTML += `
        <div class="slide">
            <img src="/assets/images/projects/${project.folder}/${imgName}.png"
                 alt="${project.name} screenshot ${i + 1}"
                 data-card="${cardIndex}" data-slide="${i}"
                 onerror="this.parentElement.innerHTML=\`<div class='slide-placeholder'><i class='fas ${icon} ph-icon'></i><span class='ph-label'>Screenshot ${i+1}</span></div>\`" />
        </div>`;
    });

    // Dynamically generate dots based on array length
    let dotsHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        dotsHTML += `<span class="dot${i===0?' active':''}" data-index="${i}"></span>`;
    }

    const techHTML = project.tech.map(t => `<span class="tech-pill">${t}</span>`).join('');
    const hasLive = project.links.view && project.links.view !== '#';

    card.innerHTML = `
        <div class="slideshow" id="ss-${cardIndex}">
            <div class="slideshow-track" id="track-${cardIndex}">${slidesHTML}</div>
            <button class="slide-arrow prev" aria-label="Previous" onclick="slidePrev(${cardIndex})">&#8249;</button>
            <button class="slide-arrow next" aria-label="Next"     onclick="slideNext(${cardIndex})">&#8250;</button>
            <div class="slide-dots" id="dots-${cardIndex}">${dotsHTML}</div>
            <div class="slide-counter" id="counter-${cardIndex}">1 / ${totalSlides}</div>
            <div class="slide-expand-hint"><i class="fas fa-expand-alt"></i> click image to expand</div>
        </div>
        <div class="card-body">
            <div class="card-meta">
                <span class="card-category">
                    <i class="fas ${icon}"></i>
                    ${categoryLabels[project.category] || project.category}
                </span>
            </div>
            <h3 class="card-title">${project.name}</h3>
            <p class="card-desc">${project.desc}</p>
            <div class="card-tech">${techHTML}</div>
            <div class="card-links">
                <button class="card-link view-btn" type="button">
                    <i class="fas fa-images"></i> View Screenshots
                </button>
                <a href="${project.links.code}" class="card-link github" target="_blank" rel="noopener">
                    <i class="fab fa-github"></i> GitHub
                </a>
                ${hasLive ? `<a href="${project.links.view}" class="card-link live" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Live</a>` : ''}
            </div>
        </div>`;

    // dots click handlers
    card.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => goToSlide(cardIndex, parseInt(dot.dataset.index)));
    });

    // View Screenshots button — open lightbox at slide 0
    card.querySelector('.view-btn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(project, 0);
    });

    // Click on slide image → open lightbox at that slide index
    card.querySelectorAll('.slide img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const si = parseInt(this.dataset.slide);
            openLightbox(project, si);
        });
    });

    return card;
}

/* ==============================================
   SLIDESHOW (card-level)
   ============================================== */
const slideshowState = {};

function initSlideshow(index, total) {
    slideshowState[index] = { current: 0, total };
}

function goToSlide(index, target) {
    const state = slideshowState[index];
    if (!state) return;
    state.current = (target + state.total) % state.total;
    document.getElementById(`track-${index}`).style.transform = `translateX(-${state.current * 100}%)`;
    document.getElementById(`counter-${index}`).textContent = `${state.current + 1} / ${state.total}`;
    document.querySelectorAll(`#dots-${index} .dot`).forEach((d, i) => d.classList.toggle('active', i === state.current));
}

function slideNext(index) { const s = slideshowState[index]; if (s) goToSlide(index, s.current + 1); }
function slidePrev(index) { const s = slideshowState[index]; if (s) goToSlide(index, s.current - 1); }

/* ==============================================
   RENDER
   ============================================== */
function renderProjects(projects, filter) {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '';
    // Clear slideshow state so IDs don't conflict across re-renders
    for (const key in slideshowState) delete slideshowState[key];

    const list = (!filter || filter === 'all') ? projects : projects.filter(p => p.category === filter);

    list.forEach((project, cardIndex) => {
        const card = buildCard(project, cardIndex);
        grid.appendChild(card);
        // Pass project.images.length — supports unlimited screenshots
        initSlideshow(cardIndex, project.images.length);
    });
}

function initFilters(projects) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderProjects(projects, this.dataset.filter);
        });
    });
}

fetch('./projects.json')
    .then(res => res.json())
    .then(data => {
        allProjects = data;
        renderProjects(data, 'all');
        initFilters(data);
    })
    .catch(err => {
        console.error('Could not load projects.json:', err);
        document.getElementById('projectsGrid').innerHTML =
            '<p style="color:rgba(255,255,255,0.5);text-align:center;grid-column:1/-1;font-size:1.6rem;">Projects failed to load.</p>';
    });

// ---- Disable devtools shortcuts ----
document.onkeydown = function (e) {
    if (!document.getElementById('lightbox').classList.contains('active')) {
        if (e.keyCode === 123) return false;
        if (e.ctrlKey && e.shiftKey && ['I','C','J'].includes(String.fromCharCode(e.keyCode))) return false;
        if (e.ctrlKey && e.keyCode === 'U'.charCodeAt(0)) return false;
    }
};