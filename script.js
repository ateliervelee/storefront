// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const body = document.body;

if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('active');
        body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : 'auto';
    });
}

// Close mobile menu when clicking on a link
const mobileLinks = document.querySelectorAll('.mobile-link');
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenu && hamburger) {
            mobileMenu.classList.remove('open');
            hamburger.classList.remove('active');
            body.style.overflow = 'auto';
        }
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (mobileMenu && hamburger && !mobileMenu.contains(e.target) && !hamburger.contains(e.target) && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        body.style.overflow = 'auto';
    }
});

// Navbar Background Opacity on Scroll
const navbar = document.querySelector('.navbar');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const navbarEl = document.querySelector('.navbar');
    if (!navbarEl) return;

    // On product, store, or about pages, keep navbar in final scrolled state
    if (document.body.classList.contains('pd-page') || document.body.classList.contains('store-page') || document.body.classList.contains('about-page')) {
        navbarEl.style.setProperty('--navbar-bg-opacity', 1);
        navbarEl.classList.add('scrolled');
        return;
    }

    const currentScrollY = window.scrollY;
    const maxScroll = 200; // Distance to scroll for full background opacity
    
    // Calculate background opacity based on scroll position (0 to 1)
    let bgOpacity = Math.min(currentScrollY / maxScroll, 1);
    
    // Set navbar background opacity using CSS custom property
    navbarEl.style.setProperty('--navbar-bg-opacity', bgOpacity);
    
    // Add/remove scrolled class for text color changes
    if (currentScrollY > 50) {
        navbarEl.classList.add('scrolled');
    } else {
        navbarEl.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
});

// Scroll Animation Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Add fade-in animation to elements
const animatedElements = document.querySelectorAll('.fashion-week, .feature-collection, .seasonal-highlight, .newsletter');
animatedElements.forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

// Parallax Effect for Hero Image
const heroImage = document.querySelector('.hero-image');
const hero = document.querySelector('.hero');

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroHeight = hero.offsetHeight;
    const rate = scrolled * -0.5;
    
    if (scrolled < heroHeight) {
        heroImage.style.transform = `translateY(${rate}px)`;
    }
});

// Smooth Scrolling for Navigation Links
const navLinks = document.querySelectorAll('.nav-link, .mobile-link');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        
        if (href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Image Hover Effects Enhancement
const imageBlocks = document.querySelectorAll('.image-block, .seasonal-tile, .collection-image');
imageBlocks.forEach(block => {
    const img = block.querySelector('img');
    
    block.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.05)';
        img.style.filter = 'brightness(1.1) contrast(1.1)';
    });
    
    block.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.filter = 'brightness(1) contrast(1)';
    });
});

// CTA Button Animations
const ctaButtons = document.querySelectorAll('.cta-button');
ctaButtons.forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
    });
});

// Scroll Progress Indicator
const scrollProgress = document.createElement('div');
scrollProgress.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 2px;
    background: linear-gradient(90deg, #D4C5A0, #C9B896);
    z-index: 9999;
    transition: width 0.1s ease;
`;
document.body.appendChild(scrollProgress);

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = scrollPercent + '%';
});

// Performance: Throttle scroll events
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply throttling to scroll-heavy functions
const throttledScroll = throttle(() => {
    // Parallax and other scroll effects here
}, 16); // ~60fps

window.addEventListener('scroll', throttledScroll);

// Simple image fade-in without interfering with hover transitions
const images = document.querySelectorAll('img');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            // Just add a class for fade-in, don't override inline styles
            if (!img.classList.contains('fade-in-complete')) {
                img.classList.add('fade-in-complete');
            }
            observer.unobserve(img);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '50px'
});

// Only observe non-hero images
images.forEach(img => {
    if (!img.closest('.hero')) {
        // Set initial state via CSS class instead of inline styles
        img.classList.add('image-will-fade');
        imageObserver.observe(img);
    }
});

// Accessibility Improvements
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        body.style.overflow = 'auto';
    }
});

// Add focus indicators for keyboard navigation
const focusableElements = document.querySelectorAll('a, button, input, [tabindex]');
focusableElements.forEach(element => {
    element.addEventListener('focus', () => {
        element.style.outline = '2px solid #C9B896';
        element.style.outlineOffset = '2px';
    });
    
    element.addEventListener('blur', () => {
        element.style.outline = 'none';
    });
});

// Component Loader System
// =====================
// This system allows you to extract HTML components into separate files
// and inject them into placeholder elements. Perfect for modular development!
//
// Usage:
// 1. Create a component file (e.g., 'header.html', 'nav.html')
// 2. Add a placeholder in index.html: <header-placeholder></header-placeholder>
// 3. Load it: await loadComponent('header.html', 'header-placeholder');
//
// The placeholder will be completely replaced with the component content.

async function loadComponent(componentPath, placeholderSelector) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load ${componentPath}: ${response.status}`);
        }
        const html = await response.text();
        const placeholder = document.querySelector(placeholderSelector);
        if (placeholder) {
            placeholder.outerHTML = html;
            document.dispatchEvent(new CustomEvent('headerLoaded'));
            console.log(`✅ Component loaded: ${componentPath}`);
        } else {
            console.warn(`⚠️ Placeholder not found: ${placeholderSelector}`);
        }
    } catch (error) {
        console.error(`❌ Error loading component: ${error.message}`);
    }
}

// Initialize components and animations when scripts are ready
document.addEventListener('allScriptsLoaded', async () => {
    // Load header first (needed for nav/cart bindings)
    await loadComponent('header.html', 'header-placeholder');

    // After header is injected, (re)bind header-dependent behavior safely
    // Mobile menu toggle and navbar opacity code relies on these elements
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const navbar = document.querySelector('.navbar');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            hamburger.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : 'auto';
        });

        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                hamburger.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target) && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                hamburger.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Initialize navbar background state
    const navEl = document.querySelector('.navbar');
    if (navEl) {
        if (document.body.classList.contains('pd-page') || document.body.classList.contains('store-page') || document.body.classList.contains('about-page')) {
            // Force final scrolled style on product/store/about pages
            navEl.style.setProperty('--navbar-bg-opacity', 1);
            navEl.classList.add('scrolled');
        } else {
            const currentScrollY = window.scrollY;
            const maxScroll = 200;
            let bgOpacity = Math.min(currentScrollY / maxScroll, 1);
            navEl.style.setProperty('--navbar-bg-opacity', bgOpacity);
            if (currentScrollY > 50) {
                navEl.classList.add('scrolled');
            }
        }
    }

    // Account avatar state with session cache for instant paint
    try {
        const PROFILE_KEY = 'av:profile';
        const auth = window.firebaseServices && window.firebaseServices.auth;
        const avatarImg = document.getElementById('accountAvatar');
        const avatarFallback = document.getElementById('accountFallbackIcon');

        const readCachedProfile = () => {
            try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
        };
        const writeCachedProfile = (profile) => {
            try {
                if (profile) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
                else sessionStorage.removeItem(PROFILE_KEY);
            } catch {}
        };
        const applyAvatar = (profile) => {
            if (!avatarImg || !avatarFallback) return;
            const url = profile && profile.photoURL ? profile.photoURL : '';
            if (url) {
                avatarImg.src = url;
                avatarImg.style.display = '';
                avatarFallback.style.display = 'none';
            } else {
                avatarImg.style.display = 'none';
                avatarFallback.style.display = '';
            }
        };

        // Hydrate immediately from cache after header is injected
        const cached = readCachedProfile();
        if (cached) applyAvatar(cached);

        if (auth && (avatarImg || avatarFallback)) {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    const profile = {
                        uid: user.uid || '',
                        displayName: user.displayName || '',
                        email: user.email || '',
                        photoURL: user.photoURL || ''
                    };
                    writeCachedProfile(profile);
                    applyAvatar(profile);
                } else {
                    writeCachedProfile(null);
                    applyAvatar(null);
                }
            });
        }

        // Account icon routing: go to profile if cached, else signup
        const accountIcon = document.getElementById('accountIcon');
        if (accountIcon) {
            accountIcon.addEventListener('click', (e) => {
                e.preventDefault();
                const prof = readCachedProfile();
                window.location.href = prof ? 'profile.html' : 'signup.html';
            });
        }
    } catch (e) {}

    // Load footer component
    await loadComponent('footer.html', 'footer-placeholder');

    // Footer year
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Initial hero animation
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';
        setTimeout(() => {
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
            heroContent.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        }, 300);
    }

    console.log('🎨 Header and footer loaded; components initialized');
});

// Mouse cursor enhancement for interactive elements
const interactiveElements = document.querySelectorAll('a, button, .image-block, .seasonal-tile');
interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
        document.body.style.cursor = 'pointer';
    });
    
    element.addEventListener('mouseleave', () => {
        document.body.style.cursor = 'default';
    });
});

