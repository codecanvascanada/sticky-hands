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

    // --- Media Popup ---
    const mediaItems = document.querySelectorAll('.media-item');
    const mediaPopup = document.getElementById('media-popup');
    const mediaPopupContainer = document.getElementById('media-popup-container');
    const closeBtn = document.querySelector('.media-popup-close');

    if (mediaItems.length > 0 && mediaPopup && mediaPopupContainer && closeBtn) {
        const openPopup = (e) => {
            e.preventDefault();
            const mediaItem = e.currentTarget;
            const videoId = mediaItem.getAttribute('data-video-id');
            const imgSrc = mediaItem.querySelector('img')?.getAttribute('src');

            // Clear previous content
            mediaPopupContainer.innerHTML = '';

            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`);
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', 'true');
                mediaPopupContainer.appendChild(iframe);
            } else if (imgSrc) {
                const img = document.createElement('img');
                img.setAttribute('src', imgSrc);
                mediaPopupContainer.appendChild(img);
            }

            mediaPopup.classList.add('active');
        };

        const closePopup = () => {
            mediaPopupContainer.innerHTML = ''; // Stop video and remove content
            mediaPopup.classList.remove('active');
        };

        mediaItems.forEach(item => {
            item.addEventListener('click', openPopup);
        });

        closeBtn.addEventListener('click', closePopup);

        mediaPopup.addEventListener('click', function(e) {
            if (e.target === mediaPopup) {
                closePopup();
            }
        });
    }
});
