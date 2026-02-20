/* ══════════════════════════════════════════════════════════
   LAZARUS SENSORS — Site Interactions
   ══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAV scroll behaviour ── */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });

  // Close on link click
  mobileMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  /* ── Carousel ── */
  const track = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const dotsContainer = document.getElementById('carouselDots');

  if (track) {
    const cards = track.querySelectorAll('.carousel__card');
    let currentIndex = 0;
    let cardWidth = 0;
    let gap = 20;
    let visibleCards = 1;
    let maxIndex = 0;

    // Drag state
    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;

    const recalc = () => {
      const card = cards[0];
      if (!card) return;
      cardWidth = card.offsetWidth;
      gap = 20;
      const containerWidth = track.parentElement.offsetWidth;
      visibleCards = Math.floor((containerWidth + gap) / (cardWidth + gap));
      maxIndex = Math.max(0, cards.length - visibleCards);
      if (currentIndex > maxIndex) currentIndex = maxIndex;
      updateCarousel(false);
    };

    const updateCarousel = (animate = true) => {
      const offset = currentIndex * (cardWidth + gap);
      track.style.transition = animate ? 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      track.style.transform = `translateX(-${offset}px)`;
      currentTranslate = -offset;
      prevTranslate = currentTranslate;

      // Update dots
      dotsContainer?.querySelectorAll('.carousel__dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });

      // Update arrows
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
    };

    // Build dots
    const buildDots = () => {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      const numDots = Math.max(1, cards.length - visibleCards + 1);
      for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => {
          currentIndex = i;
          updateCarousel();
        });
        dotsContainer.appendChild(dot);
      }
    };

    // Arrows
    prevBtn?.addEventListener('click', () => {
      if (currentIndex > 0) { currentIndex--; updateCarousel(); }
    });

    nextBtn?.addEventListener('click', () => {
      if (currentIndex < maxIndex) { currentIndex++; updateCarousel(); }
    });

    // Drag / Swipe
    const getPositionX = e => e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;

    const dragStart = e => {
      isDragging = true;
      startX = getPositionX(e);
      track.classList.add('grabbing');
      track.style.transition = 'none';
    };

    const dragMove = e => {
      if (!isDragging) return;
      const currentX = getPositionX(e);
      const diff = currentX - startX;
      currentTranslate = prevTranslate + diff;
      track.style.transform = `translateX(${currentTranslate}px)`;
    };

    const dragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('grabbing');
      const movedBy = currentTranslate - prevTranslate;

      if (movedBy < -60 && currentIndex < maxIndex) {
        currentIndex++;
      } else if (movedBy > 60 && currentIndex > 0) {
        currentIndex--;
      }
      updateCarousel();
    };

    track.addEventListener('mousedown', dragStart);
    track.addEventListener('mousemove', dragMove);
    track.addEventListener('mouseup', dragEnd);
    track.addEventListener('mouseleave', dragEnd);
    track.addEventListener('touchstart', dragStart, { passive: true });
    track.addEventListener('touchmove', dragMove, { passive: true });
    track.addEventListener('touchend', dragEnd);

    // Prevent link clicks after drag
    track.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        if (Math.abs(currentTranslate - prevTranslate) > 5) {
          e.preventDefault();
        }
      });
    });

    // Keyboard
    track.parentElement?.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) { currentIndex--; updateCarousel(); }
      if (e.key === 'ArrowRight' && currentIndex < maxIndex) { currentIndex++; updateCarousel(); }
    });

    window.addEventListener('resize', () => { recalc(); buildDots(); });
    recalc();
    buildDots();
  }


  /* ── Scroll reveal animations ── */
  const animEls = document.querySelectorAll('[data-anim]');
  const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings
        const siblings = entry.target.parentElement.querySelectorAll('[data-anim]');
        const idx = Array.from(siblings).indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 100);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animEls.forEach(el => observer.observe(el));


  /* ── Counter animation ── */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 2000;
        const start = performance.now();

        const animate = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(eased * target);

          el.textContent = current >= 1000
            ? current.toLocaleString()
            : current;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            el.textContent = target >= 1000
              ? target.toLocaleString()
              : target;
          }
        };

        requestAnimationFrame(animate);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));


  /* ── Contact form handler (demo) ── */
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = 'Sent! We\'ll be in touch.';
      btn.style.background = '#2e7d32';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
        form.reset();
      }, 3000);
    }, 1500);
  });


  /* ── HUD timestamp live update ── */
  const timestampEl = document.querySelector('.hero__hud-bottom .hero__hud-label--right');
  if (timestampEl) {
    const pad = n => String(n).padStart(2, '0');
    const updateTime = () => {
      const d = new Date();
      timestampEl.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

});
