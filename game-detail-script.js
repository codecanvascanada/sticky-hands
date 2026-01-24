document.addEventListener('DOMContentLoaded', () => {
    // --- Sticky Nav and Scroll Spy ---
    const nav = document.querySelector('.sticky-nav');
    if (nav) {
        const navLinks = nav.querySelectorAll('a');
        const sections = document.querySelectorAll('.content-section');

        const onScroll = () => {
            const scrollPosition = window.scrollY + nav.offsetHeight + 100;
            let activeSectionId = null;

            sections.forEach(section => {
                if (section.offsetTop <= scrollPosition) {
                    activeSectionId = section.id;
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${activeSectionId}`) {
                    link.classList.add('active');
                }
            });
        };

        window.addEventListener('scroll', onScroll);
    }

    // --- Scroll-triggered Fade-in Animation ---
    const animatedSections = document.querySelectorAll('.content-section, .separator-image');

    if (animatedSections.length > 0) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            rootMargin: '0px',
            threshold: 0.5 // Trigger when 50% of the element is visible
        });

        animatedSections.forEach(section => {
            observer.observe(section);
        });
    }
});
