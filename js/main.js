/* =========================================================
   VISITER SILLANS — moteur de présentation (GSAP)
   - loader d'entrée
   - rideau de transition tri-couleurs (charte) entre slides
   - reveals masqués (lettre à lettre sur les grands titres,
     mot à mot ailleurs), count-up, parallax pointeur, blobs
   - chorégraphies spécifiques par slide
   ========================================================= */
(function () {
  "use strict";
  const { gsap } = window;
  gsap.config({ nullTargetWarn: false });

  const deck = document.getElementById("deck");
  const slides = Array.from(deck.querySelectorAll(".slide"));
  const total = slides.length;
  let index = 0;
  let busy = false;
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- 1. Découpage des titres (reveal masqué) ---------- */
  // grands titres : lettre à lettre · le reste : mot à mot
  function split(el, mode) {
    if (el.dataset.split) return;
    el.dataset.split = "1";
    const raw = el.innerHTML.replace(/<br\s*\/?>/gi, " ⁣BR⁣ ");
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    const tokens = tmp.textContent.split(/\s+/).filter(Boolean);
    el.innerHTML = "";
    tokens.forEach((tok) => {
      if (tok === "⁣BR⁣") { el.appendChild(document.createElement("br")); return; }
      if (mode === "chars") {
        Array.from(tok).forEach((ch) => {
          const c = document.createElement("span");
          c.className = "char";
          const inner = document.createElement("i");
          inner.textContent = ch;
          c.appendChild(inner);
          el.appendChild(c);
        });
      } else {
        const word = document.createElement("span");
        word.className = "word";
        const inner = document.createElement("i");
        inner.textContent = tok;
        word.appendChild(inner);
        el.appendChild(word);
      }
      el.appendChild(document.createTextNode(" "));
    });
  }
  document.querySelectorAll(".hero__title, .end__title").forEach((el) => split(el, "chars"));
  document.querySelectorAll(".reveal").forEach((el) => split(el, "words"));

  /* ---------- 2. Thème HUD selon la slide ---------- */
  function setTheme(slide) {
    const t = slide.dataset.theme;
    const dark = t === "dark" || t === "black" || t === "gradient";
    document.body.classList.toggle("hud-dark", dark);
    document.body.classList.toggle("hud-light", !dark);
  }

  /* ---------- 3. HUD ---------- */
  const elCur = document.getElementById("cur");
  const elProgress = document.getElementById("progressLine");
  const btnPrev = document.getElementById("prev");
  const btnNext = document.getElementById("next");
  document.getElementById("total").textContent = pad(total);

  function updateHUD(n) {
    elCur.textContent = pad(n + 1);
    elProgress.style.width = ((n + 1) / total) * 100 + "%";
    btnPrev.disabled = n === 0;
    btnNext.disabled = n === total - 1;
  }

  /* ---------- 4. Réinitialisation par slide ---------- */
  function resetSpecials(slide) {
    const kind = slide.dataset.slide;
    if (kind === "divider") gsap.set(slide.querySelector(".manifesto__line"), { width: 0 });
    if (kind === "stats") slide.querySelectorAll(".count").forEach((c) => (c.textContent = "0"));
  }

  /* ---------- 5. Entrée chorégraphiée d'une slide ---------- */
  function addEnter(tl, slide, dir, base) {
    const d = dir >= 0 ? 1 : -1;
    const inner = slide.querySelector(".slide__inner");
    const anims = slide.querySelectorAll("[data-anim]");
    const words = slide.querySelectorAll(".reveal .word > i");
    const chars = slide.querySelectorAll(".reveal .char > i");
    const medias = slide.querySelectorAll(".media[data-anim]");
    const kind = slide.dataset.slide;
    const colsSlide = ["stats", "logo", "publics", "concept", "critique"].includes(kind);

    // états initiaux posés juste avant l'entrée
    tl.set(inner, { x: colsSlide ? 0 : 60 * d, opacity: 0 }, base - 0.05);
    tl.set(anims, { opacity: 0, y: 36 }, base - 0.05);
    tl.set(words, { yPercent: 115 }, base - 0.05);
    tl.set(chars, { yPercent: 120, rotation: 6 }, base - 0.05);
    tl.set(medias, { clipPath: "inset(0 0 100% 0)", scale: 1.06 }, base - 0.05);

    tl.to(inner, { x: 0, opacity: 1, duration: 0.85, ease: "expo.out" }, base);
    tl.to(anims, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.07 }, base + 0.1);
    tl.to(words, { yPercent: 0, duration: 0.95, ease: "expo.out", stagger: 0.05 }, base + 0.15);
    tl.to(chars, { yPercent: 0, rotation: 0, duration: 1, ease: "expo.out", stagger: { each: 0.035, from: "start" } }, base + 0.15);
    tl.to(medias, { clipPath: "inset(0 0 0% 0)", scale: 1, duration: 1.05, ease: "expo.out", stagger: 0.08 }, base + 0.18);

    if (colsSlide) {
      // les 3 colonnes colorées montent une par une
      tl.from(slide.querySelectorAll(".col"),
        { yPercent: 110, duration: 0.95, ease: "expo.out", stagger: 0.16 }, base + 0.05);
    }
    if (kind === "stats") {
      slide.querySelectorAll(".count").forEach((el, i) => {
        const target = +el.dataset.target;
        const obj = { v: 0 };
        const at = base + 0.45 + i * 0.18;
        tl.to(obj, {
          v: target, duration: 1.3, ease: "power2.out",
          onUpdate() { el.textContent = Math.round(obj.v).toLocaleString("fr-FR"); },
        }, at);
        // petit pop à l'arrivée du compteur
        tl.fromTo(el, { scale: 1.1 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)", transformOrigin: "0% 100%" }, at + 1.3);
      });
    }
    if (kind === "divider") {
      tl.to(slide.querySelector(".manifesto__line"), { width: 130, duration: 0.8, ease: "power3.out" }, base + 0.5);
    }
    if (kind === "colors") {
      // les pastilles de couleur se déploient du haut vers le bas
      tl.from(slide.querySelectorAll(".swatch__chip"),
        { scaleY: 0, transformOrigin: "50% 0%", duration: 0.8, ease: "expo.out", stagger: 0.07 }, base + 0.35);
    }
    if (kind === "grid") {
      // mosaïque : surgissement depuis le centre
      tl.from(slide.querySelectorAll(".tile"),
        { scale: 0.85, duration: 0.9, ease: "back.out(1.4)", stagger: { each: 0.06, from: "center" } }, base + 0.2);
    }
    if (kind === "panels") {
      tl.from(slide.querySelectorAll(".card"),
        { rotation: (i) => (i - 1) * 5, transformOrigin: "50% 100%", duration: 1.1, ease: "back.out(1.3)", stagger: 0.1 }, base + 0.2);
    }
    if (kind === "recap") {
      // la chaîne se construit maillon par maillon, flèches comprises
      tl.from(slide.querySelectorAll(".recap__node"),
        { scale: 0.7, duration: 0.7, ease: "back.out(1.8)", stagger: 0.16 }, base + 0.25);
      tl.from(slide.querySelectorAll(".recap__arrow"),
        { x: -14, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.16 }, base + 0.38);
    }
  }

  /* ---------- 6. Rideau de transition tri-couleurs ---------- */
  const wipePanels = Array.from(document.querySelectorAll(".wipe__panel"));
  // normalise la position initiale : le CSS pose translateX(-101%) (anti-flash),
  // GSAP le convertirait en px — on bascule explicitement sur xPercent
  gsap.set(wipePanels, { xPercent: -101, x: 0 });
  let activeTl = null;

  function goTo(n, dir) {
    if (busy || n < 0 || n >= total || n === index) return;
    busy = true;
    dir = dir || (n > index ? 1 : -1);
    const d = dir >= 0 ? 1 : -1;
    const cur = slides[index];
    const nxt = slides[n];
    updateHUD(n);

    // coupe la chorégraphie précédente si l'orateur enchaîne vite
    if (activeTl) activeTl.kill();
    const tl = gsap.timeline();
    activeTl = tl;
    index = n;
    // la nav se déverrouille dès que le rideau est levé, sans attendre
    // la fin des micro-animations d'entrée
    tl.call(() => { busy = false; }, null, 1.5);

    // la slide courante recule légèrement pendant que le rideau la couvre
    tl.to(cur.querySelector(".slide__inner"),
      { x: -50 * d, scale: 0.96, opacity: 0.6, duration: 0.55, ease: "power3.in" }, 0);

    // les 3 panneaux balayent l'écran dans le sens de navigation
    tl.fromTo(wipePanels,
      { xPercent: -101 * d },
      { xPercent: 0, duration: 0.5, ease: "power3.in", stagger: 0.09 }, 0);

    // échange des slides sous le rideau (écran totalement couvert)
    tl.call(() => {
      cur.classList.remove("is-active");
      gsap.set(cur.querySelector(".slide__inner"), { clearProps: "all" });
      nxt.classList.add("is-active");
      setTheme(nxt);
      resetSpecials(nxt);
    }, null, 0.7);

    // le rideau poursuit sa course et découvre la nouvelle slide
    tl.to(wipePanels,
      { xPercent: 101 * d, duration: 0.55, ease: "power3.out", stagger: 0.09 }, 0.72);

    // l'entrée démarre pendant que le rideau s'efface
    addEnter(tl, nxt, dir, 0.85);
  }
  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);

  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);
  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0, -1); }
    else if (e.key === "End") { e.preventDefault(); goTo(total - 1, 1); }
    else if (e.key === "f" || e.key === "F") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });

  /* ---------- 7. Parallax pointeur + idle blobs ---------- */
  document.addEventListener("pointermove", (e) => {
    if (busy) return;
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    slides[index].querySelectorAll("[data-parallax]").forEach((el) => {
      const s = +el.dataset.parallax;
      gsap.to(el, { x: cx * s * 5, y: cy * s * 5, duration: 0.9, ease: "power2.out", overwrite: "auto" });
    });
    gsap.to(".blob--1", { x: cx * 50, y: cy * 50, duration: 1.4, overwrite: "auto" });
    gsap.to(".blob--2", { x: -cx * 60, y: -cy * 50, duration: 1.4, overwrite: "auto" });
    gsap.to(".blob--3", { x: cx * 30, y: -cy * 40, duration: 1.4, overwrite: "auto" });
  });
  gsap.to(".blob--1", { scale: 1.15, duration: 9, yoyo: true, repeat: -1, ease: "sine.inOut" });
  gsap.to(".blob--2", { scale: 1.2, duration: 12, yoyo: true, repeat: -1, ease: "sine.inOut" });
  gsap.to(".blob--3", { scale: 1.1, duration: 14, yoyo: true, repeat: -1, ease: "sine.inOut" });

  /* ---------- 8. Mockup téléphone : iframe rendue en 390×844 puis scalée ---------- */
  function fitPhone() {
    document.querySelectorAll(".phone-frame").forEach((frame) => {
      const ifr = frame.querySelector("iframe");
      if (!ifr) return;
      const s = Math.min(frame.clientWidth / 390, frame.clientHeight / 844);
      ifr.style.transform = "scale(" + s + ")";
    });
  }
  window.addEventListener("resize", fitPhone);
  fitPhone();

  /* ---------- 8bis. Barre audio factice (slide captation) ----------
     purement illustrative : aucune piste réelle, la progression est simulée */
  (() => {
    const btn = document.getElementById("audioPlay");
    if (!btn) return;
    const bar = btn.closest(".audiobar");
    const prog = document.getElementById("audioProg");
    const time = document.getElementById("audioTime");
    const track = document.getElementById("audioTrack");
    const DUR = 84; // durée fictive (1:24)
    let t = 0;
    let raf = null;
    let last = 0;
    const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

    const render = () => {
      prog.style.width = (t / DUR) * 100 + "%";
      time.textContent = fmt(t);
    };
    const tick = (now) => {
      t += (now - last) / 1000;
      last = now;
      if (t >= DUR) { t = 0; pause(); }
      render();
      if (raf) raf = requestAnimationFrame(tick);
    };
    const play = () => {
      bar.classList.add("is-playing");
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const pause = () => {
      bar.classList.remove("is-playing");
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      render();
    };

    btn.addEventListener("click", () => (raf ? pause() : play()));
    track.addEventListener("click", (e) => {
      const r = track.getBoundingClientRect();
      t = ((e.clientX - r.left) / r.width) * DUR;
      render();
    });

    // la lecture s'arrête dès qu'on quitte la slide — idem pour les vidéos
    // sonores (démo app), pour ne pas garder du son hors écran
    const stopAll = () => {
      pause();
      document.querySelectorAll("video[controls]").forEach((v) => v.pause());
    };
    btnNext.addEventListener("click", stopAll);
    btnPrev.addEventListener("click", stopAll);
    document.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) stopAll();
    });
  })();

  /* ---------- 9. Loader d'entrée ---------- */
  let booted = false;
  function runLoader() {
    if (booted) return;
    booted = true;
    const tl = gsap.timeline();
    // même normalisation %→xPercent que pour le rideau
    gsap.set(".loader__title span", { yPercent: 110, y: 0 });
    tl.to(".loader__title span", { yPercent: 0, duration: 1, ease: "expo.out" }, 0.2);
    const p = { v: 0 };
    tl.to(p, {
      v: 100, duration: 1.4, ease: "power2.inOut",
      onUpdate() {
        const v = Math.round(p.v);
        document.getElementById("loaderPct").textContent = v;
        document.getElementById("loaderBar").style.width = v + "%";
      },
    }, 0.3);
    tl.to(".loader", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "+=0.15");
    tl.call(() => {
      slides[0].classList.add("is-active");
      setTheme(slides[0]);
      resetSpecials(slides[0]);
      updateHUD(0);
    });
    addEnter(tl, slides[0], 1, tl.duration() + 0.05);
    // le hint s'efface tout seul après quelques secondes
    gsap.to("#hint", { opacity: 0, duration: 1.2, delay: 8, pointerEvents: "none" });
  }

  // démarre dès que le DOM est prêt — sans attendre l'iframe de l'app,
  // qui peut être longue à charger et bloquerait le loader
  if (document.readyState !== "loading") runLoader();
  else document.addEventListener("DOMContentLoaded", runLoader);
  window.addEventListener("load", runLoader); // filet de sécurité
})();
