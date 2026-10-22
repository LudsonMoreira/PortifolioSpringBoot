(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Faixa de tecnologias em movimento contínuo (da esquerda para a direita).
  // O ciclo é calculado pela largura real do primeiro grupo, evitando saltos e espaços vazios.
  const initStackMarquee = () => {
    const strip = $('.stack-strip');
    const track = $('#stackTrack');
    const baseGroup = $('.stack-group', track || document);
    if (!strip || !track || !baseGroup) return;

    const speed = 42; // pixels por segundo
    let groupWidth = 0;
    let offset = 0;
    let previousTime = 0;
    let frameId = 0;
    let resizeTimer = 0;
    let pausedByPointer = false;

    const ensureEnoughGroups = () => {
      // Remova cópias criadas pela execução anterior antes de recalcular o viewport.
      $$('[data-marquee-clone="true"]', track).forEach((clone) => clone.remove());
      groupWidth = baseGroup.getBoundingClientRect().width;
      if (!groupWidth) return false;

      // Um ciclo completo precisa cobrir a tela mesmo enquanto o trilho está deslocado.
      const requiredWidth = window.innerWidth + groupWidth + 32;
      let guard = 0;
      while (track.scrollWidth < requiredWidth && guard < 30) {
        const clone = baseGroup.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.marqueeClone = 'true';
        clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        track.appendChild(clone);
        guard += 1;
      }
      return true;
    };

    const tick = (time) => {
      if (!previousTime) previousTime = time;
      // Limita delta após troca de aba para evitar saltos bruscos.
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      if (!pausedByPointer && !document.hidden && groupWidth > 0) {
        offset += speed * delta;
        if (offset >= 0) offset -= groupWidth;
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    const setup = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      previousTime = 0;
      if (!ensureEnoughGroups()) return;
      offset = -groupWidth;
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      frameId = window.requestAnimationFrame(tick);
    };

    strip.addEventListener('pointerenter', () => { pausedByPointer = true; });
    strip.addEventListener('pointerleave', () => { pausedByPointer = false; previousTime = 0; });
    document.addEventListener('visibilitychange', () => { previousTime = 0; });
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 140);
    }, { passive: true });

    // Inicie imediatamente; refaça a medição quando as fontes CDN terminarem de carregar.
    setup();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup).catch(() => { });
  };
  initStackMarquee();

  // Atualiza o ano automaticamente.
  const year = $('#currentYear');
  if (year) year.textContent = new Date().getFullYear();

  // Menu móvel acessível.
  const navToggle = $('#navToggle');
  const navPanel = $('#mainNav');
  const closeMenu = () => {
    if (!navToggle || !navPanel) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    navPanel.classList.remove('is-open');
  };

  navToggle?.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
    navPanel?.classList.toggle('is-open', !isOpen);
  });

  $$('#mainNav a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', (event) => {
    if (!navPanel || !navToggle || !navPanel.classList.contains('is-open')) return;
    if (!navPanel.contains(event.target) && !navToggle.contains(event.target)) closeMenu();
  });

  // Revelação progressiva dos elementos ao entrarem na área visível.
  const revealElements = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealElements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  // Filtros da seção de tecnologias.
  const filterButtons = $$('.filter-btn');
  const techItems = $$('.tech-item');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      techItems.forEach((item) => {
        const categories = (item.dataset.categories || '').split(/\s+/);
        const visible = filter === 'all' || categories.includes(filter);
        item.classList.toggle('is-hidden', !visible);
        if (visible) item.classList.add('is-visible');
      });
    });
  });

  // Efeito de digitação no subtítulo.
  const typedText = $('#typedText');
  const phrases = ['desenvolvimento web', 'soluções com código', 'aprendizado contínuo'];
  if (typedText && !reduceMotion) {
    let phraseIndex = 0;
    let characterIndex = phrases[0].length;
    let deleting = true;
    const type = () => {
      const phrase = phrases[phraseIndex];
      if (deleting) {
        characterIndex -= 1;
        typedText.textContent = phrase.slice(0, Math.max(0, characterIndex));
        if (characterIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          window.setTimeout(type, 320);
          return;
        }
      } else {
        characterIndex += 1;
        const nextPhrase = phrases[phraseIndex];
        typedText.textContent = nextPhrase.slice(0, characterIndex);
        if (characterIndex >= nextPhrase.length) {
          deleting = true;
          window.setTimeout(type, 1750);
          return;
        }
      }
      window.setTimeout(type, deleting ? 42 : 70);
    };
    window.setTimeout(type, 1600);
  }

  // Efeito discreto no status do terminal.
  const terminalStatus = $('#terminalStatus');
  if (terminalStatus && !reduceMotion) {
    const statuses = ['pronto para criar algo incrível_', 'ideias transformadas em código_', 'sempre evoluindo uma linha por vez_'];
    let statusIndex = 0;
    window.setInterval(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      terminalStatus.animate([{ opacity: .25, transform: 'translateY(2px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
      terminalStatus.textContent = statuses[statusIndex];
    }, 4200);
  }

  // Barra de progresso e botão voltar ao topo, atualizados em um único listener.
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  let ticking = false;
  const updateScrollUI = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if (progress) progress.style.width = `${Math.min(100, percentage)}%`;
    backToTop?.classList.toggle('visible', window.scrollY > 520);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }, { passive: true });
  updateScrollUI();
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // Botão de copiar e-mail. Altere data-email em index.html para seu endereço real.
  const copyEmail = $('#copyEmail');
  const copyFeedback = $('#copyFeedback');
  copyEmail?.addEventListener('click', async () => {
    const email = copyEmail.dataset.email || '';
    if (!email || email.includes('exemplo.com')) {
      if (copyFeedback) copyFeedback.textContent = 'Edite o endereço de e-mail no arquivo index.html primeiro.';
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      if (copyFeedback) copyFeedback.textContent = 'E-mail copiado para a área de transferência.';
    } catch (error) {
      if (copyFeedback) copyFeedback.textContent = `Copie manualmente: ${email}`;
    }
  });

  // Canvas com partículas e conexões. Reduz o trabalho em telas pequenas e respeita redução de movimento.
  const canvas = $('#particleCanvas');
  const context = canvas?.getContext('2d');
  if (canvas && context && !reduceMotion) {
    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = 0;
    const smallScreen = () => window.innerWidth < 600;
    const particleCount = () => smallScreen() ? 24 : 54;
    const pointer = { x: -1000, y: -1000 };

    const resizeCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.7);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: particleCount() }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .25,
        vy: (Math.random() - .5) * .25,
        radius: Math.random() * 1.4 + .45
      }));
    };

    const drawParticles = () => {
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = height + 5;
        if (particle.y > height + 5) particle.y = -5;

        const nearPointer = Math.hypot(particle.x - pointer.x, particle.y - pointer.y) < 130;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = nearPointer ? 'rgba(181,255,112,.72)' : 'rgba(127,177,207,.42)';
        context.fill();

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance < 105) {
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `rgba(103, 163, 190, ${(1 - distance / 105) * .14})`;
            context.lineWidth = .6;
            context.stroke();
          }
        }
      }
      animationFrame = window.requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(drawParticles);
      }
    });
    resizeCanvas();
    animationFrame = window.requestAnimationFrame(drawParticles);
  }
})();
