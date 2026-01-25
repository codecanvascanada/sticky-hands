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

    // Reusable function to open the popup
    const openVideoPopup = () => {
        if (playBtn && videoIframe && videoPopup) {
            const videoId = playBtn.getAttribute('data-video-id');
            const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            videoIframe.setAttribute('src', videoSrc);
            videoPopup.classList.add('active');
        }
    };

    // Setup for closing the popup
    if (videoPopup && closeBtn && videoIframe) {
        const closePopup = () => {
            videoIframe.setAttribute('src', ''); // Stop the video
            videoPopup.classList.remove('active');
        };

        closeBtn.addEventListener('click', closePopup);
        
        videoPopup.addEventListener('click', function(e) {
            if (e.target === videoPopup) {
                closePopup();
            }
        });
    }

    // --- Logo Click Animation (ico.png) ---
    // Animation removed as per user request.

    // --- Hero Logo Click Animation (sh2.gif) ---
    const heroLogoMain = document.getElementById('hero-logo-main');

    if (heroLogoMain) {
        // On press, start the squash animation
        heroLogoMain.addEventListener('mousedown', function(e) {
            e.preventDefault(); // Prevent default anchor behavior if any
            heroLogoMain.classList.remove('animate-release-up'); // Ensure clean state
            heroLogoMain.classList.add('animate-press-down');
        });

        // On release, start the rebound animation
        heroLogoMain.addEventListener('mouseup', function(e) {
            e.preventDefault(); // Prevent default if any
            heroLogoMain.classList.remove('animate-press-down'); // Remove press state
            heroLogoMain.classList.add('animate-release-up'); // Start release animation

            // Clean up the release animation class after it finishes
            setTimeout(() => {
                heroLogoMain.classList.remove('animate-release-up');
            }, 350); // Duration of release-up-anim
        });

        // If mouse leaves while pressed, treat as mouseup
        heroLogoMain.addEventListener('mouseleave', function(e) {
            if (heroLogoMain.classList.contains('animate-press-down')) {
                // Manually trigger the mouseup animation logic
                heroLogoMain.classList.remove('animate-press-down');
                heroLogoMain.classList.add('animate-release-up');
                setTimeout(() => {
                    heroLogoMain.classList.remove('animate-release-up');
                }, 350);
            }
        });
    }

    // --- Buttons without split animation ---
    const noAnimationButtons = [
        playBtn, // "Watch Video"
        document.querySelector('[data-translate="view_all_news"]'), // "View All News"
        document.querySelector('[data-translate="see_all_openings"]') // "See All Openings"
    ].filter(Boolean); // Filter out nulls if elements aren't found

    noAnimationButtons.forEach(button => {
        if (button) {
            // Remove any animation classes that might have been applied by mistake
            button.classList.remove('animate-press-down', 'animate-release-up');

            // Add simple shrink animation on press
            button.addEventListener('mousedown', function(e) {
                e.currentTarget.classList.add('shrink-on-press');
            });
            button.addEventListener('mouseup', function(e) {
                e.currentTarget.classList.remove('shrink-on-press');
            });
            button.addEventListener('mouseleave', function(e) {
                e.currentTarget.classList.remove('shrink-on-press');
            });

            // Restore original click functionality for these buttons
            button.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default behavior if handled
                if (button.tagName === 'A' && button.href && button.getAttribute('href') !== '#') {
                    window.location.href = button.href;
                } else if (button.id === 'play-video-btn') {
                    openVideoPopup();
                }
            });
        }
    });


    // --- Buttons WITH split animation (all .btn-primary, and .btn-primary-outline NOT in noAnimationButtons) ---
    // Select all buttons that potentially could have animation
    const allAnimatedCandidateButtons = document.querySelectorAll('.btn-primary, .btn-primary-outline');
    
    allAnimatedCandidateButtons.forEach(button => {
        // Only apply split animation logic if button is NOT in the noAnimationButtons list
        if (!noAnimationButtons.includes(button)) {
            // On press, start the squash animation
            button.addEventListener('mousedown', function(e) {
                const target = e.currentTarget;
                target.classList.remove('animate-release-up');
                target.classList.add('animate-press-down');
            });

            // On release, start the rebound animation
            button.addEventListener('mouseup', function(e) {
                const target = e.currentTarget;
                target.classList.remove('animate-press-down');
                target.classList.add('animate-release-up');
                setTimeout(() => {
                    target.classList.remove('animate-release-up');
                }, 350); // Duration of release-up-anim
            });
            
            // If mouse leaves while pressed, treat as mouseup
            button.addEventListener('mouseleave', function(e) {
                const target = e.currentTarget;
                if (target.classList.contains('animate-press-down')) {
                    target.classList.remove('animate-press-down');
                    target.classList.add('animate-release-up');
                    setTimeout(() => {
                        target.classList.remove('animate-release-up');
                    }, 350);
                }
            });
            
            // On click, execute the action after the release animation
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const target = e.currentTarget;

                let action = () => {};
                if (target.tagName === 'A' && target.href && target.getAttribute('href') !== '#') {
                    action = () => { window.location.href = target.href; };
                } else if (target.id === 'play-video-btn') { // playBtn will be in noAnimationButtons so this branch won't be taken for it
                    action = openVideoPopup;
                }
                
                if(action) {
                    setTimeout(action, 370);
                }
            });
        }
    });
});