document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Загружаем настройки
        let settings = {};
        try {
            const result = await chrome.storage.sync.get('vkCustomSettings');
            settings = result.vkCustomSettings || {};
            console.log('Загруженные настройки:', settings);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }

        // Заполняем форму
        document.getElementById('themeSelect').value = settings.theme || 'dark';
        document.getElementById('bgColor').value = settings.backgroundColor || '#1e1e1e';
        document.getElementById('accentColor').value = settings.accentColor || '#4a76a8';
        document.getElementById('borderRadius').value = parseInt(settings.borderRadius) || 8;
        document.getElementById('borderRadiusValue').textContent = settings.borderRadius || '8px';
        document.getElementById('showVisualizer').checked = settings.showVisualizer || false;

        // Обновление статуса
        updateStatus();

        // Обработка фона
        const bgType = document.getElementById('backgroundType');
        if (settings.backgroundVideo) {
            if (settings.backgroundVideo.includes('gifer.com') || settings.backgroundVideo.match(/^[a-zA-Z0-9]+$/)) {
                bgType.value = 'gifer';
                showGiferSettings(true);
                document.getElementById('giferCode').value = settings.backgroundVideo;
            } else if (settings.backgroundVideo.includes('youtube') || settings.backgroundVideo.includes('youtu.be')) {
                bgType.value = 'youtube';
                showYoutubeSettings(true);
                document.getElementById('youtubeUrl').value = settings.backgroundVideo;
            } else {
                bgType.value = 'custom';
                showCustomUrlSettings(true);
                document.getElementById('mediaUrl').value = settings.backgroundVideo;
            }
            
            showCurrentBackground(settings.backgroundVideo);
        }

        // Переключение типов фона
        bgType.addEventListener('change', (e) => {
            hideAllSettings();
            
            switch(e.target.value) {
                case 'gifer':
                    showGiferSettings(true);
                    break;
                case 'gallery':
                    showGallerySettings(true);
                    break;
                case 'custom':
                    showCustomUrlSettings(true);
                    break;
                case 'youtube':
                    showYoutubeSettings(true);
                    break;
            }
        });

        // Выбор GIF из галереи
        document.querySelectorAll('.gif-item').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.dataset.url;
                const type = el.dataset.type;
                
                // Убираем выделение со всех
                document.querySelectorAll('.gif-item').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                
                if (type === 'gifer') {
                    setBackground(`https://gifer.com/embed/${url}`);
                } else {
                    setBackground(url);
                }
            });
        });

        // Установка Gifer
        document.getElementById('setGiferBg').addEventListener('click', () => {
            const code = document.getElementById('giferCode').value.trim();
            if (code) {
                // Если это просто ID (буквы и цифры)
                if (code.match(/^[a-zA-Z0-9]+$/)) {
                    setBackground(`https://gifer.com/embed/${code}`);
                } 
                // Если это полный embed код
                else if (code.includes('<iframe')) {
                    const srcMatch = code.match(/src="([^"]+)"/);
                    if (srcMatch && srcMatch[1]) {
                        setBackground(srcMatch[1]);
                    }
                }
                // Если это URL
                else {
                    setBackground(code);
                }
            }
        });

        // Установка своего URL
        document.getElementById('setCustomMedia').addEventListener('click', () => {
            const url = document.getElementById('mediaUrl').value;
            if (url) setBackground(url);
        });

        // Установка YouTube
        document.getElementById('setYoutube').addEventListener('click', () => {
            const url = document.getElementById('youtubeUrl').value;
            if (url) setBackground(url);
        });

        // Удаление фона
        document.getElementById('removeBg').addEventListener('click', () => {
            setBackground(null);
            hideCurrentBackground();
            bgType.value = 'none';
            hideAllSettings();
        });

        // Сохранение всех настроек
        document.getElementById('saveSettings').addEventListener('click', saveAllSettings);
        
        // Сброс настроек
        document.getElementById('resetSettings').addEventListener('click', resetSettings);

        // Обновление отображения значения скругления
        document.getElementById('borderRadius').addEventListener('input', (e) => {
            document.getElementById('borderRadiusValue').textContent = e.target.value + 'px';
        });

        // Функции отображения
        function hideAllSettings() {
            showGiferSettings(false);
            showGallerySettings(false);
            showCustomUrlSettings(false);
            showYoutubeSettings(false);
        }

        function showGiferSettings(show) {
            document.getElementById('giferSettings').style.display = show ? 'block' : 'none';
        }

        function showGallerySettings(show) {
            document.getElementById('gifGallery').style.display = show ? 'block' : 'none';
        }

        function showCustomUrlSettings(show) {
            document.getElementById('customUrlSettings').style.display = show ? 'block' : 'none';
        }

        function showYoutubeSettings(show) {
            document.getElementById('youtubeSettings').style.display = show ? 'block' : 'none';
        }

        function showCurrentBackground(url) {
            const currentBg = document.getElementById('currentBackground');
            currentBg.style.display = 'block';
            document.getElementById('currentBgUrl').value = url;
        }

        function hideCurrentBackground() {
            document.getElementById('currentBackground').style.display = 'none';
        }

        function updateStatus() {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const statusEl = document.getElementById('statusMessage');
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('vk.com')) {
                    statusEl.textContent = '✅ ВКонтакте активен';
                    statusEl.className = 'status';
                } else {
                    statusEl.textContent = '⚠️ Откройте ВКонтакте для применения тем';
                    statusEl.className = 'status warning';
                }
            });
        }

        function setBackground(url) {
            const settings = getCurrentSettings();
            settings.backgroundVideo = url;
            
            saveSettings(settings);
            
            if (url) {
                showCurrentBackground(url);
                showNotification('Фон установлен!');
            } else {
                hideCurrentBackground();
                showNotification('Фон удален');
            }
        }

        function saveAllSettings() {
            const settings = getCurrentSettings();
            saveSettings(settings);
            showNotification('Все настройки сохранены!');
        }

        function resetSettings() {
            if (confirm('Сбросить все настройки?')) {
                const defaultSettings = {
                    theme: 'dark',
                    backgroundColor: '#1e1e1e',
                    accentColor: '#4a76a8',
                    borderRadius: '8px',
                    showVisualizer: false,
                    backgroundVideo: null
                };
                
                saveSettings(defaultSettings);
                
                // Обновляем форму
                document.getElementById('themeSelect').value = defaultSettings.theme;
                document.getElementById('bgColor').value = defaultSettings.backgroundColor;
                document.getElementById('accentColor').value = defaultSettings.accentColor;
                document.getElementById('borderRadius').value = 8;
                document.getElementById('borderRadiusValue').textContent = '8px';
                document.getElementById('showVisualizer').checked = false;
                
                hideCurrentBackground();
                document.getElementById('backgroundType').value = 'none';
                hideAllSettings();
                
                showNotification('Настройки сброшены');
            }
        }

        function getCurrentSettings() {
            return {
                theme: document.getElementById('themeSelect').value,
                backgroundColor: document.getElementById('bgColor').value,
                accentColor: document.getElementById('accentColor').value,
                borderRadius: document.getElementById('borderRadius').value + 'px',
                showVisualizer: document.getElementById('showVisualizer').checked,
                backgroundVideo: document.getElementById('currentBackground').style.display === 'block' 
                    ? document.getElementById('currentBgUrl').value 
                    : null
            };
        }

        function saveSettings(settings) {
            chrome.storage.sync.set({ vkCustomSettings: settings }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Ошибка сохранения:', chrome.runtime.lastError);
                    showNotification('Ошибка сохранения', 'error');
                }
            });
            
            // Отправляем на активную вкладку
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('vk.com')) {
