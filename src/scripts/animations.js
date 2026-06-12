import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  // Sync ScrollTrigger with Lenis
  if (window.__lenis) {
    window.__lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      window.__lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  // Fade up animations
  gsap.utils.toArray('.gsap-fade-up').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Fade left animations
  gsap.utils.toArray('.gsap-fade-left').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Fade right animations
  gsap.utils.toArray('.gsap-fade-right').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Scale in animations
  gsap.utils.toArray('.gsap-scale-in').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Parallax elements
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.to(el, {
      y: () => -ScrollTrigger.maxScroll(window) * speed * 0.1,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  // Counter animations
  gsap.utils.toArray('[data-count-to]').forEach((el) => {
    const target = parseInt(el.dataset.countTo, 10);
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.val);
      },
    });
  });

  // Horizontal scroll text (for BUSINESS heading)
  gsap.utils.toArray('[data-scroll-x]').forEach((el) => {
    gsap.to(el, {
      x: () => -el.scrollWidth * 0.3,
      ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });

  // Stagger children animations
  gsap.utils.toArray('[data-stagger-children]').forEach((parent) => {
    const children = parent.children;
    gsap.fromTo(
      children,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: parent,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
});
