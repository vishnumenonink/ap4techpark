import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   LENIS SMOOTH SCROLL
   ============================================================ */
const lenis = new Lenis({
  duration: 1.0,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);

// Use native RAF — more reliable than GSAP ticker in production
function lenisRaf(time) {
  lenis.raf(time);
  requestAnimationFrame(lenisRaf);
}
requestAnimationFrame(lenisRaf);

/* ============================================================
   NAV — scroll state + hamburger
   ============================================================ */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 'top -60',
  onEnter:  () => nav.classList.add('scrolled'),
  onLeaveBack: () => nav.classList.remove('scrolled'),
});

document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// Close menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('open');
  });
});

/* ============================================================
   HERO ENTRANCE
   ============================================================ */
const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
heroTl
  .from('.hero-bg img',      { scale: 1.08, duration: 2.0 }, 0)
  .from('.hero-eyebrow',     { y: 20, opacity: 0, duration: 0.9 }, 0.5)
  .from('#heroHeadline',     { y: 40, opacity: 0, duration: 1.0 }, 0.65)
  .from('.hero-actions',     { y: 20, opacity: 0, duration: 0.8 }, 1.1)
  .from('.hero-scroll-hint', { opacity: 0, duration: 1.0 }, 1.5)
  .from('.hero-bottom-bar',  { y: 30, opacity: 0, duration: 0.9 }, 1.0);

/* ============================================================
   SCROLL REVEAL — generic .reveal-up / .reveal-scale
   ============================================================ */
document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () => el.classList.add('is-visible'),
  });
});

/* ============================================================
   STAT COUNTER ANIMATION
   ============================================================ */
document.querySelectorAll('.stat-n[data-target]').forEach(el => {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const isDecimal = !Number.isInteger(target);

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to({ val: 0 }, {
        val: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function () {
          el.textContent = isDecimal
            ? this.targets()[0].val.toFixed(2) + suffix
            : Math.round(this.targets()[0].val) + suffix;
        },
      });
    },
  });
});

/* ============================================================
   AMENITY TABS
   ============================================================ */
const deckInstances = {};

function initDeck(deckEl) {
  const cards = [...deckEl.querySelectorAll('.deck-card')];
  const total = cards.length;
  const countEl = deckEl.querySelector('.deck-count');
  let current = 0;
  let timer = null;

  function setPositions() {
    cards.forEach((card, i) => {
      const pos = (i - current + total) % total;
      card.dataset.pos = String(Math.min(pos, 3));
    });
    if (countEl) countEl.textContent = `${current + 1} / ${total}`;
  }

  function advance() {
    current = (current + 1) % total;
    setPositions();
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(advance, 4500);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  deckEl.addEventListener('click', () => {
    advance();
    stopTimer();
    startTimer();
  });
  deckEl.addEventListener('mouseenter', stopTimer);
  deckEl.addEventListener('mouseleave', startTimer);

  setPositions();
  startTimer();

  return { startTimer, stopTimer };
}

// Init decks on the active panel immediately; defer others
document.querySelectorAll('.card-deck').forEach(deck => {
  deckInstances[deck.id] = initDeck(deck);
  const panel = deck.closest('.amenity-panel');
  if (panel && !panel.classList.contains('active')) {
    deckInstances[deck.id].stopTimer();
  }
});

document.querySelectorAll('.amenity-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = 'tab-' + tab.dataset.tab;

    // Stop timer on outgoing deck
    const outPanel = document.querySelector('.amenity-panel.active');
    if (outPanel) {
      const outDeck = outPanel.querySelector('.card-deck');
      if (outDeck && deckInstances[outDeck.id]) deckInstances[outDeck.id].stopTimer();
    }

    // Update tabs
    document.querySelectorAll('.amenity-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update panels
    document.querySelectorAll('.amenity-panel').forEach(panel => panel.classList.remove('active'));

    const panel = document.getElementById(targetId);
    if (panel) {
      panel.classList.add('active');
      panel.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => el.classList.add('is-visible'));
      gsap.from(panel, { opacity: 0, y: 16, duration: 0.5, ease: 'power3.out' });

      // Start timer on incoming deck
      const inDeck = panel.querySelector('.card-deck');
      if (inDeck && deckInstances[inDeck.id]) deckInstances[inDeck.id].startTimer();
    }
  });
});

/* ============================================================
   GALLERY DRAG SCROLL
   ============================================================ */
const galleryOuter = document.querySelector('.gallery-scroll-outer');
if (galleryOuter) {
  // Center-anchor so users can drag either left or right
  requestAnimationFrame(() => requestAnimationFrame(() => {
    galleryOuter.scrollLeft = (galleryOuter.scrollWidth - galleryOuter.clientWidth) / 2;
  }));

  let isDown = false;
  let startX;
  let scrollLeft;
  let velocity = 0;
  let lastX = 0;
  let rafId;

  galleryOuter.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - galleryOuter.offsetLeft;
    scrollLeft = galleryOuter.scrollLeft;
    lastX = e.pageX;
    cancelAnimationFrame(rafId);
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    // Momentum
    const drift = () => {
      if (Math.abs(velocity) < 0.5) return;
      galleryOuter.scrollLeft -= velocity;
      velocity *= 0.94;
      rafId = requestAnimationFrame(drift);
    };
    drift();
  });

  galleryOuter.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - galleryOuter.offsetLeft;
    const walk = (x - startX) * 1.6;
    velocity = e.pageX - lastX;
    lastX = e.pageX;
    galleryOuter.scrollLeft = scrollLeft - walk;
  });

  // Touch support
  let touchStartX = 0;
  let touchScrollLeft = 0;
  galleryOuter.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = galleryOuter.scrollLeft;
  }, { passive: true });
  galleryOuter.addEventListener('touchmove', e => {
    const x = e.touches[0].pageX;
    galleryOuter.scrollLeft = touchScrollLeft - (x - touchStartX);
  }, { passive: true });
}

/* ============================================================
   PARALLAX on hero background
   ============================================================ */
gsap.to('.hero-bg img', {
  yPercent: 20,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
});

/* ============================================================
   SECTION TRANSITIONS — stagger children on entry
   ============================================================ */
// Spec items
gsap.from('.spec-item', {
  y: 20,
  opacity: 0,
  duration: 0.6,
  stagger: 0.06,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.specs-grid',
    start: 'top 80%',
    once: true,
  },
});

// Gallery items stagger
gsap.from('.g-item', {
  x: 40,
  opacity: 0,
  duration: 0.7,
  stagger: 0.06,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.gallery-strip',
    start: 'top 85%',
    once: true,
  },
});

// Testimonials
gsap.from('.testimonial-card', {
  y: 30,
  opacity: 0,
  duration: 0.7,
  stagger: 0.10,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.testimonials-grid',
    start: 'top 82%',
    once: true,
  },
});

// Press cards
gsap.from('.press-card', {
  y: 30,
  opacity: 0,
  duration: 0.7,
  stagger: 0.10,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.press-grid',
    start: 'top 82%',
    once: true,
  },
});


/* ============================================================
   DIST ITEMS — stagger in
   ============================================================ */
gsap.from('.dist-item', {
  x: -20,
  opacity: 0,
  duration: 0.5,
  stagger: 0.06,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: '.location-distances',
    start: 'top 80%',
    once: true,
  },
});

/* ============================================================
   HERO SLIDER
   ============================================================ */
const slides = document.querySelectorAll('.slide');
let current  = 0;
let sliderTimer;

const heroHeadline = document.getElementById('heroHeadline');

function goToSlide(idx) {
  slides[current].classList.remove('active');
  current = idx;
  slides[current].classList.add('active');
  if (heroHeadline) {
    gsap.to(heroHeadline, {
      opacity: 0, y: -10, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        heroHeadline.textContent = slides[current].dataset.headline;
        gsap.fromTo(heroHeadline, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
      }
    });
  }
}

function nextSlide() { goToSlide((current + 1) % slides.length); }
function prevSlide() { goToSlide((current - 1 + slides.length) % slides.length); }

function startSlider() { sliderTimer = setInterval(nextSlide, 5000); }

document.getElementById('sliderNext').addEventListener('click', () => {
  clearInterval(sliderTimer);
  nextSlide();
  startSlider();
});

document.getElementById('sliderPrev').addEventListener('click', () => {
  clearInterval(sliderTimer);
  prevSlide();
  startSlider();
});

startSlider();

/* ============================================================
   ARRIVAL CAROUSEL — 3-visible, advances 1 at a time
   ============================================================ */
(function () {
  const carousel = document.getElementById('arrivalCarousel');
  const track    = document.getElementById('arrivalTrack');
  if (!carousel || !track) return;

  const slides  = [...track.querySelectorAll('.arrival-slide')];
  const countEl = document.getElementById('arrivalCount');
  const VISIBLE = 3;
  const GAP     = 20; // px — must match CSS gap value
  const TOTAL   = slides.length;
  const MAX     = TOTAL - VISIBLE;
  let current   = 0;
  let aTimer;

  // Slide width comes from CSS (calc((100% - 40px) / 3))
  // We read it from the DOM so translateX is always pixel-perfect
  function slideW() {
    return slides[0] ? slides[0].getBoundingClientRect().width : 0;
  }

  function applyPos(animated = true) {
    if (!animated) {
      track.style.transition = 'none';
      track.getBoundingClientRect(); // force reflow
    }
    const w = slideW();
    track.style.transform = w ? `translateX(-${current * (w + GAP)}px)` : '';
    if (!animated) track.style.transition = '';
    if (countEl) {
      countEl.textContent =
        `${String(current + 1).padStart(2, '0')} / ${String(MAX + 1).padStart(2, '0')}`;
    }
  }

  function aNext() {
    if (current >= MAX) { current = 0; applyPos(false); return; }
    current++;
    applyPos(true);
  }

  function aPrev() {
    if (current <= 0) { current = MAX; applyPos(false); return; }
    current--;
    applyPos(true);
  }

  function aStart() { aTimer = setInterval(aNext, 6500); }
  function aStop()  { clearInterval(aTimer); }

  // Init after layout is ready
  window.addEventListener('load', () => applyPos(false));

  // Recalculate on resize
  window.addEventListener('resize', () => applyPos(false));

  document.getElementById('arrivalNext').addEventListener('click', () => { aStop(); aNext(); aStart(); });
  document.getElementById('arrivalPrev').addEventListener('click', () => { aStop(); aPrev(); aStart(); });
  carousel.addEventListener('mouseenter', aStop);
  carousel.addEventListener('mouseleave', aStart);

  aStart();
}());

/* ============================================================
   VIDEO MODAL
   ============================================================ */
const videoThumb   = document.getElementById('videoThumb');
const videoModal   = document.getElementById('videoModal');
const videoBackdrop = document.getElementById('videoBackdrop');
const videoClose   = document.getElementById('videoClose');
const videoFrame   = document.getElementById('videoFrame');

const VIDEO_ID = 'S28yxR8nQYM';

function openVideo() {
  videoFrame.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${VIDEO_ID}"
    allow="autoplay; encrypted-media"
    allowfullscreen
  ></iframe>`;
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideo() {
  videoModal.classList.remove('open');
  document.body.style.overflow = '';
  // Small delay so fade-out finishes before iframe removal
  setTimeout(() => { videoFrame.innerHTML = ''; }, 350);
}

if (videoThumb) videoThumb.addEventListener('click', openVideo);
if (videoClose)  videoClose.addEventListener('click', closeVideo);
if (videoBackdrop) videoBackdrop.addEventListener('click', closeVideo);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && videoModal.classList.contains('open')) closeVideo();
});

/* ============================================================
   CONTACT FORM
   ============================================================ */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    const orig = btn.textContent;
    btn.textContent = 'Thank you — we\'ll be in touch shortly.';
    btn.disabled = true;
    btn.style.background = '#2e7d32';
    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled = false;
      btn.style.background = '';
      form.reset();
    }, 4000);
  });
}

/* ============================================================
   ACTIVE NAV LINK HIGHLIGHT on scroll
   ============================================================ */
const sections = ['hero', 'overview', 'location', 'amenities', 'specs', 'gallery', 'arrival', 'press', 'portfolio', 'contact'];
sections.forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 50%',
    end: 'bottom 50%',
    onEnter: () => highlightNav(id),
    onEnterBack: () => highlightNav(id),
  });
});

function highlightNav(id) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.style.color = a.getAttribute('href') === `#${id}`
      ? 'rgba(255,255,255,1)'
      : 'rgba(255,255,255,0.65)';
  });
}
