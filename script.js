document.addEventListener('DOMContentLoaded', function() {
    // --- Mobile Hamburger Menu ---
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mainNav = document.getElementById('mainNav');

    if (hamburgerMenu && mainNav) {
        hamburgerMenu.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            hamburgerMenu.classList.toggle('is-active');
        });

        const links = mainNav.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', function() {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    hamburgerMenu.classList.remove('is-active');
                }
            });
        });
    }

    // --- Video Popup ---
    const playBtn = document.getElementById('play-video-btn');
    const videoPopup = document.getElementById('video-popup');
    const closeBtn = document.querySelector('.video-popup-close');
    const videoIframe = document.getElementById('video-popup-iframe');

    if (playBtn && videoPopup && closeBtn && videoIframe) {
        const videoId = playBtn.getAttribute('data-video-id');
        const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

        const openPopup = () => {
            videoIframe.setAttribute('src', videoSrc);
            videoPopup.classList.add('active');
        };

        const closePopup = () => {
            videoIframe.setAttribute('src', ''); // Stop the video
            videoPopup.classList.remove('active');
        };

        playBtn.addEventListener('click', openPopup);
        closeBtn.addEventListener('click', closePopup);
        
        // Close popup if user clicks on the background overlay
        videoPopup.addEventListener('click', function(e) {
            if (e.target === videoPopup) {
                closePopup();
            }
        });
    }
});