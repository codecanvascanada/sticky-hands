const translations = {};
let currentLang = 'ja';

async function setLanguage(lang) {
    if (!translations[lang]) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load language file: ${lang}.json`);
            }
            translations[lang] = await response.json();
        } catch (error) {
            console.error(error);
            return; // Exit if language file fails to load
        }
    }

    currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    updateContent();

    // Dispatch a custom event to notify other scripts that the language has changed
    const event = new CustomEvent('language-changed', { detail: { lang: currentLang } });
    document.dispatchEvent(event);
}

function updateContent() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(el => {
        const key = el.getAttribute('data-translate');
        const translation = translations[currentLang][key];
        if (translation !== undefined) {
            el.innerHTML = translation;
        } else {
            console.warn(`Translation key not found: ${key}`);
        }
    });

    // Special case for the title
    if (translations[currentLang].title) {
        document.title = translations[currentLang].title;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'ja';

    // Setup language switcher
    const langSelector = document.querySelector('.lang-selector');
    if (langSelector) {
        const languages = {
            'ko': '한국어',
            'en': 'English',
            'es': 'Español',
            'zh': '中文',
            'ja': '日本語'
        };

        const selectElement = document.createElement('select');
        selectElement.id = 'language-switcher';

        Object.entries(languages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            selectElement.appendChild(option);
        });

        langSelector.innerHTML = ''; // Clear previous content
        langSelector.appendChild(selectElement);

        selectElement.value = savedLang; // Set initial selection

        selectElement.addEventListener('change', e => {
            const targetLang = e.target.value;
            if (targetLang && targetLang !== currentLang) {
                setLanguage(targetLang);
            }
        });
    }

    setLanguage(savedLang);
});
