(() => {
  'use strict';

  const cover = document.getElementById('cover');
  const invitation = document.getElementById('invitation');
  const heading = document.getElementById('invitation-heading');
  const audio = document.getElementById('song');
  const playPause = document.getElementById('playPause');
  const muteToggle = document.getElementById('muteToggle');
  const tapToPlay = document.getElementById('tapToPlay');
  const musicControls = document.getElementById('music-controls');
  const video = document.getElementById('invitationVideo');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let resumeAudioAfterVideo = false;

  const hasSong = Boolean(audio && audio.getAttribute('src'));
  let opened = false;

  if (!hasSong && musicControls) musicControls.hidden = true;

  // ---------- Language switcher ----------

  const languageSwitch = document.getElementById('language-switch');
  const languageButtons = languageSwitch ? Array.from(languageSwitch.querySelectorAll('[data-lang]')) : [];

  function setLanguage(lang) {
    if (!languageButtons.some((button) => button.dataset.lang === lang)) return;
    document.body.dataset.activeLang = lang;
    document.documentElement.lang = lang;
    languageButtons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.lang === lang ? 'true' : 'false');
    });
    try { window.localStorage.setItem('wedding-invitation-lang', lang); } catch { /* storage may be blocked */ }
  }

  if (languageSwitch) {
    languageSwitch.addEventListener('click', (event) => {
      const button = event.target.closest('[data-lang]');
      if (button) setLanguage(button.dataset.lang);
    });
    let stored = null;
    try { stored = window.localStorage.getItem('wedding-invitation-lang'); } catch { /* ignore */ }
    setLanguage(stored || document.body.dataset.defaultLang || languageButtons[0]?.dataset.lang || 'hi');
  }

  function setPlayingLabels(isPlaying) {
    if (playPause) playPause.dataset.state = isPlaying ? 'pause' : 'play';
  }

  function setMuteLabels() {
    if (muteToggle) muteToggle.dataset.state = audio.muted ? 'unmute' : 'mute';
  }

  function showTapToPlay() {
    if (tapToPlay) tapToPlay.hidden = false;
    if (playPause) playPause.hidden = true;
    setPlayingLabels(false);
  }

  function playAudio() {
    if (!hasSong) return;
    tapToPlay && (tapToPlay.hidden = true);
    playPause && (playPause.hidden = false);
    const result = audio.play();
    if (result && typeof result.catch === 'function') {
      result.then(() => setPlayingLabels(true)).catch(showTapToPlay);
    }
  }

  function openInvitation() {
    if (opened) return;
    opened = true;

    // Audio must start inside this user-gesture handler. Never call play() on load.
    if (hasSong) playAudio();

    cover.setAttribute('aria-expanded', 'true');
    cover.classList.add('opening');
    invitation.hidden = false;

    const finish = () => {
      cover.removeEventListener('transitionend', finish);
      if (cover.parentNode) cover.parentNode.removeChild(cover);
      if (heading) heading.focus({ preventScroll: true });
    };

    if (reduceMotion) finish();
    else {
      cover.addEventListener('transitionend', finish, { once: true });
      window.setTimeout(finish, 800);
    }
  }

  cover.addEventListener('click', openInvitation);
  cover.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      openInvitation();
    }
  });

  function pauseMusicForVideo() {
    if (hasSong && audio && !audio.paused) {
      resumeAudioAfterVideo = true;
      audio.pause();
    }
  }

  function restoreMusicAfterVideo() {
    if (!resumeAudioAfterVideo) return;
    resumeAudioAfterVideo = false;
    if (hasSong) playAudio();
  }

  function stopVideoBeforeMusic() {
    if (video && !video.paused) {
      resumeAudioAfterVideo = false;
      video.pause();
    }
  }

  if (video) {
    video.addEventListener('play', pauseMusicForVideo);
    video.addEventListener('ended', restoreMusicAfterVideo);
    video.addEventListener('pause', () => {
      if (!video.ended) restoreMusicAfterVideo();
    });
  }

  if (playPause) {
    playPause.addEventListener('click', () => {
      if (audio.paused) {
        stopVideoBeforeMusic();
        playAudio();
      } else audio.pause();
    });
  }

  if (muteToggle) {
    muteToggle.addEventListener('click', () => {
      audio.muted = !audio.muted;
      setMuteLabels();
    });
  }

  if (tapToPlay) {
    tapToPlay.addEventListener('click', () => {
      stopVideoBeforeMusic();
      playAudio();
    });
  }

  audio.addEventListener('play', () => setPlayingLabels(true));
  audio.addEventListener('pause', () => setPlayingLabels(false));
  audio.addEventListener('error', showTapToPlay);
  setMuteLabels();

  // ---------- Photo slideshow / gallery ----------

  const track = document.getElementById('photos-track');
  const dots = document.getElementById('photo-dots');
  const navButtons = Array.from(document.querySelectorAll('.photo-nav'));
  let slides = track ? Array.from(track.querySelectorAll('.photo-slide')) : [];
  let current = 0;

  function buildDots() {
    if (!dots) return;
    dots.textContent = '';
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', String(index + 1));
      dot.addEventListener('click', () => showSlide(index));
      dots.appendChild(dot);
    });
  }

  function showSlide(index) {
    if (!track || slides.length === 0) return;
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(${-current * 100}%)`;
    if (dots) {
      Array.from(dots.children).forEach((dot, i) => {
        dot.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
    }
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showSlide(current + Number(button.dataset.direction || 1));
    });
  });

  slides.forEach((slide) => {
    const image = slide.querySelector('img');
    if (image) {
      image.addEventListener('error', () => {
        slide.classList.add('is-broken');
        slides = slides.filter((item) => item !== slide);
        buildDots();
        showSlide(Math.min(current, Math.max(0, slides.length - 1)));
      });
    }
  });

  buildDots();
  showSlide(0);

  // ---------- Premium lightbox ----------

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(button) {
    if (!lightbox) return;
    const image = button.querySelector('img');
    lightboxImage.src = image ? image.currentSrc || image.src : '';
    lightboxImage.alt = image ? image.alt : '';
    const caption = button.parentElement.querySelector('figcaption');
    lightboxCaption.textContent = caption ? caption.textContent : '';
    lightbox.hidden = false;
    lightboxClose && lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImage.removeAttribute('src');
  }

  document.querySelectorAll('.photo-open').forEach((button) => {
    button.addEventListener('click', () => openLightbox(button));
  });

  lightboxClose && lightboxClose.addEventListener('click', closeLightbox);
  lightbox && lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
    if (!lightbox || lightbox.hidden) return;
    if (event.key === 'ArrowRight') showSlide(current + 1);
    if (event.key === 'ArrowLeft') showSlide(current - 1);
  });
})();
