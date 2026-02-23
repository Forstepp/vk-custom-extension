console.log('VK Custom: Фоновый скрипт запущен');


chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        
        chrome.storage.sync.set({
            vkCustomSettings: {
                theme: 'dark',
                backgroundColor: '#1e1e1e',
                accentColor: '#4a76a8',
                borderRadius: '8px',
                showVisualizer: false,
                enabled: true
            }
        });
        console.log('VK Custom: Установлены настройки по умолчанию');
    }
});
