(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.video-project video').forEach(video => {
    let activated = false;
    let pending = false;

    function play() {
      if (window.desordenEntry?.active || !activated || preference.matches || pending || !video.paused) return;
      if (!video.getAttribute('src')) {
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.src = video.dataset.src;
        video.load();
      }
      pending = true;
      video.play().then(() => { pending = false; }).catch(() => { pending = false; });
    }

    // Visibility only starts lazy loading. Scrolling and disclosures never pause playback.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        activated = true;
        observer.unobserve(video);
        play();
      }, { threshold: .2 });
      observer.observe(video);
    } else {
      const checkViewport = () => {
        const rect = video.getBoundingClientRect();
        if (rect.top >= innerHeight || rect.bottom <= 0) return;
        activated = true;
        removeEventListener('scroll', checkViewport);
        removeEventListener('resize', checkViewport);
        play();
      };
      addEventListener('scroll', checkViewport, { passive: true });
      addEventListener('resize', checkViewport, { passive: true });
      checkViewport();
    }
    // Retry a browser-blocked autoplay only after an actual user interaction.
    document.addEventListener('desorden:entry-reveal', play);
    document.addEventListener('pointerdown', play, { passive: true });
    document.addEventListener('keydown', play);
    preference.addEventListener('change', play);
  });
})();
