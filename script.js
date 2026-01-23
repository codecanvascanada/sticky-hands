document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mainNav = document.getElementById('mainNav');
    const navLinks = mainNav.querySelector('.nav-links'); // Get the nav-links UL

    if (hamburgerMenu && mainNav && navLinks) {
        hamburgerMenu.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });

        // Add event listeners to each navigation link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', function() {
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active'); // Close the menu
                }
            });
        });
    }
});