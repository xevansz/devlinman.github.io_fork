document.addEventListener("DOMContentLoaded", () => {
    // --- Loading Screen Logic ---
    const loadingScreen = document.getElementById("loading-screen");

    // Ensure all resources are loaded
    window.addEventListener("load", () => {
        if (loadingScreen) {
            loadingScreen.classList.add("hidden");
            setTimeout(() => {
                loadingScreen.remove();
            }, 1500); // Matches CSS transition duration
        }
    });

    // --- Card Logic (delegated + keyboard for role="link") ---
    document.body.addEventListener("click", (e) => {
        const card = e.target.closest(".card[data-href]");
        if (!card || e.target.closest("a")) return;
        const url = card.getAttribute("data-href");
        if (url) window.open(url, "_blank");
    });

    document.body.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".card[data-href]");
        if (!card) return;
        e.preventDefault();
        const url = card.getAttribute("data-href");
        if (url) window.open(url, "_blank");
    });

    // --- Particle Logic ---
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");

    let width, height;
    let particles = [];
    let ripples = [];

    // Configuration (re-evaluated on resize)
    const getParticleCount = () => (window.innerWidth < 800 ? 180 : 1000);
    let particleCount = getParticleCount();
    const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#270434", "#ffffff"]; // violet, White
    const mouse = { x: -1000, y: -1000 };
    const interactionRadius = 100;

    // Themes
    const themes = ["", "theme-blue", "theme-green", "theme-gold"];
    let currentThemeIndex = 0;
    let targetColor = { r: 255, g: 0, b: 0 }; // Default Red

    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(
            shorthandRegex,
            (m, r, g, b) => r + r + g + g + b + b,
        );
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 255, g: 0, b: 0 };
    }

    function updateTheme() {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;

        themes.forEach((t) => {
            if (t) document.body.classList.remove(t);
        });

        const newTheme = themes[currentThemeIndex];
        if (newTheme) {
            document.body.classList.add(newTheme);
        }

        requestAnimationFrame(() => {
            const computedStyle = getComputedStyle(document.body);
            const redVar = computedStyle.getPropertyValue("--red").trim();
            targetColor = hexToRgb(redVar);
        });
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        const newCount = getParticleCount();
        if (newCount !== particleCount) {
            particleCount = newCount;
            initParticles();
        }
    }

    class Particle {
        constructor() {
            this.init(true);
        }

        init(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : -10; // Start above screen if not random
            this.vx = (Math.random() - 0.5) * 0.5; // slight initial horizontal drift
            this.vy = Math.random() * 0.8 + 0.2; // falling speed (0.2 to 1.0)
            this.size = Math.random() * 1.5 + 1; // Size 1 to 2.5
            const randomColor =
                colors[Math.floor(Math.random() * colors.length)];
            this.color = randomColor;
            // Parse Hex to RGB
            this.rgb = {
                r: parseInt(randomColor.slice(1, 3), 16),
                g: parseInt(randomColor.slice(3, 5), 16),
                b: parseInt(randomColor.slice(5, 7), 16),
            };
            this.alpha = Math.random() * 0.3 + 0.1; // Opacity 0.1 to 0.4
            this.drift = Math.random();
            this.dx = 0;
            this.dy = 0;
            this.rippleLife = 0;
        }

        update(time) {
            this.dx = 0;
            this.dy = 0;
            this.rippleLife *= 0.85;

            // Mouse Interaction
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 10000) {
                // 100 * 100
                const distance = Math.sqrt(distSq);
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (100 - distance) / 100;

                this.vx += forceDirectionX * force * 0.5;
                this.vy += forceDirectionY * force * 0.5;
            }

            // Ripple Interaction
            const bandWidth = 100;

            ripples.forEach((ripple) => {
                const rx = this.x - ripple.x;
                const ry = this.y - ripple.y;
                const rDistSq = rx * rx + ry * ry;

                const minR = ripple.radius - bandWidth;
                const maxR = ripple.radius + bandWidth;
                const minRSq = minR > 0 ? minR * minR : 0;
                const maxRSq = maxR * maxR;

                if (rDistSq >= minRSq && rDistSq <= maxRSq) {
                    const distance = Math.sqrt(rDistSq);
                    const diff = distance - ripple.radius;

                    if (Math.abs(diff) < bandWidth) {
                        const forceDirectionX = rx / distance;
                        const forceDirectionY = ry / distance;

                        const normalizedDist = diff / bandWidth;
                        const angle = normalizedDist * (Math.PI / 2);
                        const wave = Math.cos(angle);

                        const displacement = wave * ripple.strength;

                        this.dx += forceDirectionX * displacement;
                        this.dy += forceDirectionY * displacement;
                        this.rippleLife = 1.0;
                    }
                }
            });

            // Simulate gusty wind
            const t = Date.now() * 0.001;

            const base = Math.sin(t * 0.7 + this.drift) * 0.015;
            const noise = Math.cos(t * 1.3 + this.drift * 2) * 0.01;

            const gustTrigger = Math.sin(t * 0.4 + this.drift * 5);
            const gust = gustTrigger ** 9 * 0.04;

            this.vx += base + noise + gust;
            // // // // // // // // // //

            this.x += this.vx;
            this.y += this.vy;

            this.vx *= 0.97;
            this.vy *= 0.97;

            // Reduced gravity
            if (this.vy < 1) {
                this.vy += 0.05;
            }

            // Reset if out of bounds
            if (this.y > height + 10 || this.x < -50 || this.x > width + 50) {
                this.init();
            }
        }

        draw() {
            let currentAlpha = this.alpha;

            // Interpolate Color: Original -> Target (Theme Color)
            // rippleLife is 1.0 (Target) -> 0.0 (Original)
            const factor = Math.min(1, Math.max(0, this.rippleLife));

            // Target Color from global state
            const r = Math.round(
                this.rgb.r + (targetColor.r - this.rgb.r) * factor,
            );
            const g = Math.round(
                this.rgb.g + (targetColor.g - this.rgb.g) * factor,
            );
            const b = Math.round(
                this.rgb.b + (targetColor.b - this.rgb.b) * factor,
            );

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

            if (this.rippleLife > 0.1) {
                ctx.shadowBlur = 15 * this.rippleLife;
                ctx.shadowColor = `rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, ${this.rippleLife})`;
                currentAlpha = Math.max(this.alpha, this.rippleLife * 0.8);
            } else {
                ctx.shadowBlur = 0;
                ctx.shadowColor = "transparent";
            }

            ctx.globalAlpha = currentAlpha;
            ctx.beginPath();
            // Draw at position + visual offset
            ctx.arc(
                this.x + this.dx,
                this.y + this.dy,
                this.size,
                0,
                Math.PI * 2,
            );
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    let animId = null;

    function animate() {
        if (prefersReducedMotion()) {
            ctx.clearRect(0, 0, width, height);
            animId = requestAnimationFrame(animate);
            return;
        }
        ctx.clearRect(0, 0, width, height);

        for (let i = ripples.length - 1; i >= 0; i--) {
            const ripple = ripples[i];
            ripple.radius += ripple.speed;
            if (ripple.radius > ripple.maxRadius) ripples.splice(i, 1);
        }

        const time = Date.now() * 0.001;
        particles.forEach((p) => {
            p.update(time);
            p.draw();
        });
        animId = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);

    // --- Logo Ripple Trigger ---
    const logo = document.querySelector(".header-logo");
    if (logo) {
        logo.addEventListener("pointerdown", (e) => {
            // Cycle Theme
            updateTheme();

            // Animation Trigger
            logo.classList.remove("animate-pop");
            void logo.offsetWidth; // Force reflow to restart animation
            logo.classList.add("animate-pop");

            const rect = logo.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // // // Wave speed, strength
            ripples.push({
                x: centerX,
                y: centerY,
                radius: 0,
                maxRadius: Math.max(width, height) * 1.5,
                strength: 50,
                speed: 20,
            });
        });

        logo.addEventListener("dragstart", (e) => e.preventDefault());
        logo.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // --- Touch interactions for mobile ---
    const handleTouch = (e) => {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    };

    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });

    window.addEventListener("touchend", () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    // Reset mouse when leaving window
    document.addEventListener("mouseleave", () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    // --- Scroll Event ---
    const heroSection = document.getElementById("hero");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            document.body.classList.add("scrolled");
        } else {
            document.body.classList.remove("scrolled");
        }

        if (heroSection && window.scrollY > heroSection.offsetHeight) {
            document.body.classList.add("past-hero");
        } else {
            document.body.classList.remove("past-hero");
        }
    });

    // --- Lights Off Logic ---
    const toggleBtn = document.getElementById("lights-toggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("lights-off-mode");
        });
    }

    // --- Scroll Animation Logic ---
    const sections = document.querySelectorAll("main section:not(.about)");

    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
    }, observerOptions);

    sections.forEach((section) => {
        section.classList.add("fade-in-section");
        observer.observe(section);
    });

    // --- Start ---
    resize();
    initParticles();
    animate();
});
