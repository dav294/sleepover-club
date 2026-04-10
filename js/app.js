// app.js — Sleepover Club
// GSAP + Lenis scroll logic + page rendering

gsap.registerPlugin(ScrollTrigger);

/* ─── Root path (so data image paths resolve from any subdir) ─── */
const IS_SUBPAGE = window.location.pathname.includes('/events/') || window.location.pathname.includes('/artists/');
const ROOT = IS_SUBPAGE ? '../' : '';

/* ─── Helpers ───────────────────────────────────────────────── */
function formatDateLong(str) {
  return new Date(str).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateShort(str) {
  return new Date(str).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/* ─── Lenis ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const lenis = new Lenis({
    duration: 1.25,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ─── Nav scroll state ─────────────────────────────────────── */
  const nav = document.getElementById('site-nav');
  ScrollTrigger.create({
    start: 'top -60',
    onEnter:  () => nav && nav.classList.add('scrolled'),
    onLeaveBack: () => nav && nav.classList.remove('scrolled'),
  });

  /* ─── Mobile nav ───────────────────────────────────────────── */
  const toggle   = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ─── Email popup ──────────────────────────────────────────── */
  const popup    = document.getElementById('email-popup');
  const openBtns = document.querySelectorAll('.js-email-popup');
  const closeBtns = document.querySelectorAll('.js-close-popup');

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    popup && popup.classList.add('open');
    document.body.style.overflow = 'hidden';
  }));
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    popup && popup.classList.remove('open');
    document.body.style.overflow = '';
  }));

  // Email forms (inline + popup) — replace with real provider integration
  document.querySelectorAll('.email-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn   = form.querySelector('button[type="submit"]');
      if (input && input.value) {
        btn.textContent = 'You\'re in ✓';
        btn.style.background = '#3a7d44';
        input.value = '';
        input.placeholder = 'You\'re on the list!';
        setTimeout(() => {
          popup && popup.classList.remove('open');
          document.body.style.overflow = '';
        }, 1800);
      }
    });
  });

  /* ─── Scroll reveal (shared) ───────────────────────────────── */
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 32 },
      {
        opacity: 1, y: 0, duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });

  gsap.utils.toArray('.reveal-stagger').forEach(wrap => {
    gsap.fromTo(wrap.children,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: wrap, start: 'top 85%', once: true },
      }
    );
  });

  /* ─── Stat counters ────────────────────────────────────────── */
  document.querySelectorAll('.stat-count').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target, duration: 1.8, ease: 'power2.out',
          onUpdate: function() {
            el.textContent = (Number.isInteger(target) ? Math.floor(this.targets()[0].val) : this.targets()[0].val.toFixed(0)) + suffix;
          }
        });
      }
    });
  });

  /* ─── Page routing ─────────────────────────────────────────── */
  const page = document.body.dataset.page;

  if (page === 'home')         initHome();
  if (page === 'events')       initEventsPage();
  if (page === 'event-detail') initEventDetail();
  if (page === 'artists')      initArtistsPage();
  if (page === 'artist-detail') initArtistDetail();
});

/* =============================================================
   HOME PAGE
============================================================= */
function initHome() {
  // Hero entrance
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.6, delay: 0.2 })
    .to('.hero-title',    { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
    .to('.hero-tagline',  { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .to('.hero-ctas',     { opacity: 1, y: 0, duration: 0.6 }, '-=0.35')
    .to('.hero-scroll',   { opacity: 1, duration: 0.6 }, '-=0.2');

  gsap.set(['.hero-eyebrow', '.hero-title', '.hero-tagline', '.hero-ctas'], { y: 24, opacity: 0 });

  // Upcoming events
  const upcoming = EVENTS.filter(e => e.status === 'upcoming');
  const past     = EVENTS.filter(e => e.status === 'past');

  renderUpcoming(upcoming);
  renderPastEvents(past);
  renderArtistsTicker();
}

function renderUpcoming(events) {
  const section = document.getElementById('upcoming-section');
  if (!section) return;

  if (!events.length) {
    section.style.display = 'none';
    return;
  }

  if (events.length === 1) {
    // Featured single event
    const e = events[0];
    section.querySelector('#upcoming-content').innerHTML = renderFeaturedEvent(e);
  } else {
    // Horizontal scroll of cards
    const cards = events.map(e => renderEventCard(e, '')).join('');
    section.querySelector('#upcoming-content').innerHTML = `<div class="upcoming-scroll reveal-stagger">${cards}</div>`;
  }
}

function renderFeaturedEvent(e) {
  const imgHtml = e.coverImage
    ? `<img src="${ROOT}${e.coverImage}" alt="${e.title}" loading="lazy">`
    : `<div class="featured-event-img-placeholder"><span>${e.title.split(' ').slice(0,2).join('<br>')}</span></div>`;

  const ticketBtn = e.soldOut
    ? `<button class="btn btn-outline" disabled>Sold Out</button>`
    : `<a href="${e.ticketLink || '#'}" target="_blank" class="btn btn-primary">Get Tickets →</a>`;

  return `
    <div class="featured-event reveal">
      <div class="featured-event-img">${imgHtml}</div>
      <div class="featured-event-body">
        <div>
          <span class="featured-event-label">Next Event</span>
          <h3 class="featured-event-title">${e.title}</h3>
          ${e.subtitle ? `<p class="featured-event-subtitle">${e.subtitle}</p>` : ''}
        </div>
        <div class="featured-event-info">
          <div class="featured-event-info-row">
            <span class="featured-event-info-label">Date</span>
            <span class="featured-event-info-value">${formatDateLong(e.date)}</span>
          </div>
          <div class="featured-event-info-row">
            <span class="featured-event-info-label">Doors</span>
            <span class="featured-event-info-value">${e.doorsTime}</span>
          </div>
          <div class="featured-event-info-row">
            <span class="featured-event-info-label">Venue</span>
            <span class="featured-event-info-value">${e.venue}</span>
          </div>
          <div class="featured-event-info-row">
            <span class="featured-event-info-label">City</span>
            <span class="featured-event-info-value">${e.city}, ${e.country}</span>
          </div>
        </div>
        <div class="featured-event-actions">
          ${ticketBtn}
          <a href="${ROOT}events/event.html?id=${e.id}" class="btn btn-ghost">View Event →</a>
        </div>
      </div>
    </div>`;
}

function renderEventCard(e, base) {
  const prefix = base !== undefined ? base : ROOT;
  const imgHtml = e.coverImage
    ? `<img src="${prefix}${e.coverImage}" alt="${e.title}" class="event-card-img" loading="lazy">`
    : `<div class="event-card-placeholder"><span>${e.date.split('-')[0]}</span></div>`;

  const badge = e.soldOut
    ? '<span class="event-card-badge sold-out">Sold Out</span>'
    : e.status === 'upcoming'
    ? '<span class="event-card-badge">Upcoming</span>'
    : '';

  return `
    <a href="${prefix}events/event.html?id=${e.id}" class="event-card">
      <div class="event-card-img-wrap">
        ${imgHtml}
        <div class="event-card-overlay"></div>
        ${badge}
      </div>
      <div class="event-card-body">
        <div class="event-card-date">${formatDateShort(e.date)} · ${e.city}</div>
        <div class="event-card-title">${e.title}</div>
        <div class="event-card-venue">${e.venue}</div>
      </div>
    </a>`;
}

function renderPastEvents(events) {
  const grid = document.getElementById('past-events-grid');
  if (!grid) return;
  if (!events.length) {
    grid.innerHTML = '<p class="empty-state">No past events yet.</p>';
    return;
  }
  // Show first 6 on home
  grid.innerHTML = events.slice(0, 6).map(e => renderEventCard(e, '')).join('');
  grid.classList.add('reveal-stagger');
}

function renderArtistsTicker() {
  const wrap = document.getElementById('artists-ticker');
  if (!wrap || typeof ARTISTS === 'undefined') return;

  const featured = ARTISTS.filter(a => a.featured);
  if (!featured.length) {
    wrap.closest('.artists-section').style.display = 'none';
    return;
  }

  // Duplicate for seamless loop
  const chips = [...featured, ...featured].map(a => `
    <a href="${ROOT}artists/artist.html?id=${a.id}" class="artist-chip">
      ${a.coverImage ? `<img src="${ROOT}${a.coverImage}" alt="${a.name}" class="artist-chip-img" loading="lazy">` : ''}
      <span class="artist-chip-name">${a.name}</span>
      <span class="artist-chip-genre">${a.genre}</span>
    </a>`).join('');

  wrap.innerHTML = chips;
}

/* =============================================================
   EVENTS COLLECTION PAGE
============================================================= */
function initEventsPage() {
  if (typeof EVENTS === 'undefined') return;

  let activeFilter = 'all';
  const grid = document.getElementById('events-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');

  function render() {
    let list = EVENTS;
    if (activeFilter === 'upcoming') list = EVENTS.filter(e => e.status === 'upcoming');
    if (activeFilter === 'past')     list = EVENTS.filter(e => e.status === 'past');
    if (['Dublin', 'London', 'Belfast', 'Galway'].includes(activeFilter)) {
      list = EVENTS.filter(e => e.city === activeFilter);
    }

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state"><strong>No events found</strong>Try a different filter.</div>';
      return;
    }

    grid.innerHTML = list.map(e => renderEventCard(e, '../')).join('');

    // Animate new cards
    gsap.fromTo(grid.children,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }
    );
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  render();
}

/* =============================================================
   EVENT DETAIL PAGE
============================================================= */
function initEventDetail() {
  if (typeof EVENTS === 'undefined') return;

  const id    = getUrlParam('id');
  const event = EVENTS.find(e => e.id === id);

  if (!event) {
    document.getElementById('event-detail-root').innerHTML =
      '<div class="empty-state" style="padding:200px 20px"><strong>Event not found.</strong><a href="../events/" style="color:var(--accent);margin-top:16px;display:inline-block">← Back to Events</a></div>';
    return;
  }

  document.title = `${event.title} — Sleepover Club`;

  // Hero
  const heroBg = document.getElementById('event-hero-bg');
  if (heroBg && event.coverImage) {
    heroBg.innerHTML = `<img src="../${event.coverImage}" alt="${event.title}">`;
  }

  document.getElementById('event-detail-label').textContent = `${event.city} · ${formatDateShort(event.date)}`;
  document.getElementById('event-detail-title').textContent = event.title;
  if (event.subtitle) document.getElementById('event-detail-subtitle').textContent = event.subtitle;

  // Description
  document.getElementById('event-desc').textContent = event.fullDesc || event.shortDesc;

  // Gallery
  const galleryEl = document.getElementById('event-gallery');
  if (galleryEl) {
    if (event.gallery && event.gallery.length) {
      galleryEl.innerHTML = event.gallery.map(img =>
        `<div class="event-gallery-item"><img src="../${img}" alt="${event.title}" loading="lazy"></div>`
      ).join('');
    } else {
      galleryEl.style.display = 'none';
    }
  }

  // Video
  const videoEl = document.getElementById('event-video');
  if (videoEl) {
    if (event.videoEmbed) {
      videoEl.innerHTML = `<div class="event-video-wrap"><iframe src="${event.videoEmbed}" allowfullscreen></iframe></div>`;
    }
  }

  // Sidebar info
  document.getElementById('sidebar-date').textContent    = formatDateLong(event.date);
  document.getElementById('sidebar-doors').textContent   = event.doorsTime;
  document.getElementById('sidebar-venue').textContent   = event.venue;
  document.getElementById('sidebar-city').textContent    = `${event.city}, ${event.country}`;
  document.getElementById('sidebar-age').textContent     = event.ageRestriction || '18+';

  // Ticket button
  const ticketBtn = document.getElementById('event-ticket-btn');
  if (ticketBtn) {
    if (event.soldOut) {
      ticketBtn.textContent = 'Sold Out';
      ticketBtn.disabled = true;
      ticketBtn.classList.remove('btn-primary');
      ticketBtn.classList.add('btn-outline');
    } else if (event.status === 'upcoming' && event.ticketLink) {
      ticketBtn.href = event.ticketLink;
      ticketBtn.textContent = 'Get Tickets →';
    } else {
      ticketBtn.style.display = 'none';
    }
  }

  // Lineup
  const lineupEl = document.getElementById('event-lineup');
  if (lineupEl && typeof ARTISTS !== 'undefined' && event.artistIds && event.artistIds.length) {
    const lineup = event.artistIds.map(id => ARTISTS.find(a => a.id === id)).filter(Boolean);
    lineupEl.innerHTML = lineup.map(a => `
      <a href="../artists/artist.html?id=${a.id}" class="sidebar-artist-row">
        ${a.coverImage ? `<img src="../${a.coverImage}" alt="${a.name}" class="sidebar-artist-img" loading="lazy">` : '<div class="sidebar-artist-img"></div>'}
        <div>
          <div class="sidebar-artist-name">${a.name}</div>
          <div class="sidebar-artist-genre">${a.genre}</div>
        </div>
      </a>`).join('');
  } else if (lineupEl) {
    lineupEl.closest('.sidebar-card').style.display = 'none';
  }

  // Hero entrance
  gsap.from('#event-detail-root .event-detail-hero-content > *', {
    opacity: 0, y: 30, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.2
  });
}

/* =============================================================
   ARTISTS COLLECTION PAGE
============================================================= */
function initArtistsPage() {
  if (typeof ARTISTS === 'undefined') return;

  const grid = document.getElementById('artists-grid');
  if (!grid) return;

  let activeFilter = 'all';
  const filterBtns = document.querySelectorAll('.filter-btn');

  function render() {
    let list = ARTISTS;
    if (activeFilter !== 'all') {
      list = ARTISTS.filter(a =>
        a.genre.toLowerCase().includes(activeFilter.toLowerCase()) ||
        a.origin.toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><strong>No artists found</strong>Try a different filter.</div>';
      return;
    }

    grid.innerHTML = list.map(a => `
      <a href="artist.html?id=${a.id}" class="artist-card">
        <div class="artist-card-img-wrap">
          ${a.coverImage ? `<img src="../${a.coverImage}" alt="${a.name}" class="artist-card-img" loading="lazy">` : '<div class="artist-card-placeholder"><span>♪</span></div>'}
          <div class="artist-card-overlay"></div>
        </div>
        <div class="artist-card-body">
          <div class="artist-card-name">${a.name}</div>
          <div class="artist-card-genre">${a.genre}</div>
        </div>
      </a>`).join('');

    gsap.fromTo(grid.children,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }
    );
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  render();
}

/* =============================================================
   ARTIST DETAIL PAGE
============================================================= */
function initArtistDetail() {
  if (typeof ARTISTS === 'undefined') return;

  const id     = getUrlParam('id');
  const artist = ARTISTS.find(a => a.id === id);

  if (!artist) {
    document.getElementById('artist-detail-root').innerHTML =
      '<div class="empty-state" style="padding:200px 20px"><strong>Artist not found.</strong><a href="../artists/" style="color:var(--accent);margin-top:16px;display:inline-block">← Back to Artists</a></div>';
    return;
  }

  document.title = `${artist.name} — Sleepover Club`;

  // Hero
  const heroBg = document.getElementById('artist-hero-bg');
  if (heroBg && artist.coverImage) {
    heroBg.innerHTML = `<img src="../${artist.coverImage}" alt="${artist.name}">`;
  }

  document.getElementById('artist-detail-genre').textContent  = artist.genre;
  document.getElementById('artist-detail-name').textContent   = artist.name;
  document.getElementById('artist-detail-origin').textContent = artist.origin;

  // Bio
  document.getElementById('artist-bio').textContent = artist.bio;

  // Socials
  const socialsEl = document.getElementById('artist-socials');
  if (socialsEl) {
    const links = Object.entries(artist.socials)
      .filter(([, v]) => v)
      .map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener" class="artist-social-link">${k.charAt(0).toUpperCase() + k.slice(1)} ↗</a>`)
      .join('');
    socialsEl.innerHTML = links || '';
  }

  // Events
  const eventsEl = document.getElementById('artist-events');
  if (eventsEl && typeof EVENTS !== 'undefined' && artist.eventIds && artist.eventIds.length) {
    const eventList = artist.eventIds.map(id => EVENTS.find(e => e.id === id)).filter(Boolean);
    eventsEl.innerHTML = eventList.map(e => `
      <a href="../events/event.html?id=${e.id}" class="artist-event-row">
        <div>
          <div class="artist-event-row-title">${e.title}</div>
          <div class="artist-event-row-meta">${formatDateShort(e.date)} · ${e.venue}, ${e.city}</div>
        </div>
        <span class="artist-event-row-arrow">→</span>
      </a>`).join('');
  } else if (eventsEl) {
    eventsEl.closest('section').style.display = 'none';
  }

  // Shopify embed
  const shopifyEl = document.getElementById('artist-shopify');
  if (shopifyEl && artist.shopifyEmbedCode) {
    shopifyEl.innerHTML = artist.shopifyEmbedCode;
    shopifyEl.closest('.shopify-embed-wrap').style.display = 'block';
  } else if (shopifyEl) {
    shopifyEl.closest('.shopify-embed-wrap').style.display = 'none';
  }

  // Hero entrance
  gsap.from('#artist-detail-root .artist-detail-hero-content > *', {
    opacity: 0, y: 30, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.2
  });
}
