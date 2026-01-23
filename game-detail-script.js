document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.sticky-nav');
    const navLinks = nav.querySelectorAll('a');
    const sections = document.querySelectorAll('.content-section');

    if (!nav) return;

    const onScroll = () => {
        const scrollPosition = window.scrollY + nav.offsetHeight + 100;

        let activeSection = null;

        sections.forEach(section => {
            if (section.offsetTop <= scrollPosition) {
                activeSection = section.id;
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${activeSection}`) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', onScroll);
});
