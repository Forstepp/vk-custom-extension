if (!window.location.hostname.includes('vk.com')) throw new Error('Not VK');
if (window.__vkc5) throw new Error('Loaded');
window.__vkc5 = true;

let S = {
    bg: 'https://gifer.com/embed/C3Jb',
    accent: '#4a76a8',
    radius: '12px',
    overlay: 40,
    tint: '#000000',
    chat: 10,
    dialogs: 10,
    header: 15,
    input: 20,
    topbar: 10,
    sidebar: 15,
    panels: 30,
    blocks: 85,
    ownOp: 60,
    otherOp: 50,
    ownClr: '#4a76a8',
    otherClr: '#2d2d2d',
    clockOn: true,
    clockSize: 48,
    clockX: -1,
    clockY: 60,
    clockColor: '#ffffff',
    clockBg: 30,
    clockSeconds: true,
    clockDate: true,
    clock24h: true,
    clockFont: 'default'
};

let panelOpen = false;
let clockInterval = null;
let clockDragging = false;

const rgba = (hex, pct) => {
    const h = hex.replace('#', '');
    const p = h.length === 3;
    const r = parseInt(p ? h[0]+h[0] : h.substring(0,2), 16);
    const g = parseInt(p ? h[1]+h[1] : h.substring(2,4), 16);
    const b = parseInt(p ? h[2]+h[2] : h.substring(4,6), 16);
    return `rgba(${r},${g},${b},${pct/100})`;
};

const gifId = (s) => {
    s = s.trim();
    let m = s.match(/gifer\.com\/embed\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    m = s.match(/gifer\.com\/\w+\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    m = s.match(/gifer\.com\/([a-zA-Z0-9]+)/);
    if (m && m[1] !== 'embed') return m[1];
    if (/^[a-zA-Z0-9]+$/.test(s)) return s;
    return null;
};

const CLOCK_FONTS = {
    'default': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'mono': '"SF Mono", "Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
    'digital': '"Courier New", "Lucida Console", monospace',
    'elegant': '"Georgia", "Times New Roman", "Playfair Display", serif',
    'rounded': '"Nunito", "Varela Round", "Comfortaa", sans-serif'
};

async function boot() {
    try { const l = localStorage.getItem('vkc5'); if (l) S = {...S, ...JSON.parse(l)}; } catch(e) {}
    try {
        if (chrome?.storage?.sync) {
            const r = await chrome.storage.sync.get('vkc5');
            if (r?.vkc5) S = {...S, ...r.vkc5};
        }
    } catch(e) {}

    if (S.bg) setBg(S.bg);
    makePanel();
    if (S.clockOn) createClock();
    runFixer();
}

function runFixer() {
    fix();
    setInterval(fix, 500);
    new MutationObserver(() => fix())
        .observe(document.body, { childList: true, subtree: true });
    let u = location.href;
    setInterval(() => {
        if (location.href !== u) { u = location.href; fix(); }
    }, 200);
}

function fix() {
    if (!document.getElementById('vk-bg')) return;
    nukeIM();
    nukeGlobal();
}

function createClock() {
    removeClock();

    const w = document.createElement('div');
    w.id = 'vk-clock';

    const posX = S.clockX < 0 ? 'calc(50% - 100px)' : S.clockX + 'px';
    const posY = S.clockY + 'px';

    Object.assign(w.style, {
        position: 'fixed',
        top: posY,
        left: posX,
        zIndex: '9999',
        padding: '12px 22px',
        borderRadius: '16px',
        background: rgba('#000', S.clockBg),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'box-shadow 0.3s, transform 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        minWidth: '80px'
    });

    const timeEl = document.createElement('div');
    timeEl.id = 'vk-clock-time';
    Object.assign(timeEl.style, {
        fontSize: S.clockSize + 'px',
        fontWeight: '700',
        color: S.clockColor,
        fontFamily: CLOCK_FONTS[S.clockFont] || CLOCK_FONTS['default'],
        letterSpacing: '2px',
        lineHeight: '1.1',
        textShadow: '0 2px 10px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap'
    });
    w.appendChild(timeEl);

    const dateEl = document.createElement('div');
    dateEl.id = 'vk-clock-date';
    Object.assign(dateEl.style, {
        fontSize: Math.max(11, S.clockSize * 0.28) + 'px',
        fontWeight: '400',
        color: S.clockColor,
        opacity: '0.55',
        fontFamily: CLOCK_FONTS[S.clockFont] || CLOCK_FONTS['default'],
        letterSpacing: '1px',
        display: S.clockDate ? 'block' : 'none',
        whiteSpace: 'nowrap'
    });
    w.appendChild(dateEl);

    const controls = document.createElement('div');
    controls.id = 'vk-clock-controls';
    Object.assign(controls.style, {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        display: 'none',
        gap: '3px',
        flexDirection: 'row'
    });

    const makeBtn = (text, onClick) => {
        const b = document.createElement('div');
        b.textContent = text;
        Object.assign(b.style, {
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(74,118,168,0.85)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            lineHeight: '1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'transform 0.15s, background 0.2s',
            userSelect: 'none'
        });
        b.onmouseenter = () => { b.style.transform = 'scale(1.2)'; b.style.background = '#4a76a8'; };
        b.onmouseleave = () => { b.style.transform = ''; b.style.background = 'rgba(74,118,168,0.85)'; };
        b.onclick = (e) => { e.stopPropagation(); onClick(); };
        return b;
    };

    controls.appendChild(makeBtn('−', () => resizeClock(-4)));
    controls.appendChild(makeBtn('+', () => resizeClock(+4)));

    w.appendChild(controls);

    w.onmouseenter = () => {
        controls.style.display = 'flex';
        w.style.boxShadow = '0 8px 40px rgba(74,118,168,0.25)';
    };
    w.onmouseleave = () => {
        controls.style.display = 'none';
        w.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    };

    setupDrag(w);

    document.body.appendChild(w);

    updateClock();
    clockInterval = setInterval(updateClock, 500);
}

function updateClock() {
    const timeEl = document.getElementById('vk-clock-time');
    const dateEl = document.getElementById('vk-clock-date');
    if (!timeEl) return;

    const now = new Date();

    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    let ampm = '';

    if (!S.clock24h) {
        ampm = h >= 12 ? ' PM' : ' AM';
        h = h % 12 || 12;
    }

    const pad = n => n < 10 ? '0' + n : '' + n;

    let timeStr = pad(h) + ':' + pad(m);
    if (S.clockSeconds) timeStr += ':' + pad(s);
    timeStr += ampm;

    timeEl.textContent = timeStr;

    if (dateEl && S.clockDate) {
        const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
        const months = ['января','февраля','марта','апреля','мая','июня',
                        'июля','августа','сентября','октября','ноября','декабря'];
        dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()];
        dateEl.style.display = 'block';
    } else if (dateEl) {
        dateEl.style.display = 'none';
    }
}

function resizeClock(delta) {
    S.clockSize = Math.max(14, Math.min(120, S.clockSize + delta));

    const timeEl = document.getElementById('vk-clock-time');
    const dateEl = document.getElementById('vk-clock-date');
    if (timeEl) timeEl.style.fontSize = S.clockSize + 'px';
    if (dateEl) dateEl.style.fontSize = Math.max(11, S.clockSize * 0.28) + 'px';

    const slider = document.getElementById('vk-cksz');
    const label = document.getElementById('vk-cksz-v');
    if (slider) slider.value = S.clockSize;
    if (label) label.textContent = S.clockSize + 'px';

    save();
}

function removeClock() {
    const el = document.getElementById('vk-clock');
    if (el) el.remove();
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}

function refreshClock() {
    if (S.clockOn) createClock();
    else removeClock();
}

function setupDrag(el) {
    let startX, startY, origX, origY;

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });

    function onDown(e) {
        if (e.target.closest('#vk-clock-controls')) return;

        clockDragging = true;
        el.style.cursor = 'grabbing';
        el.style.transition = 'box-shadow 0.3s';
        el.style.zIndex = '10000';

        const rect = el.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;

        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        } else {
            startX = e.clientX;
            startY = e.clientY;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        e.preventDefault();
    }

    function onMove(e) {
        if (!clockDragging) return;
        let cx, cy;
        if (e.type === 'touchmove') {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
            e.preventDefault();
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }

        let newX = origX + (cx - startX);
        let newY = origY + (cy - startY);

        newX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newY));

        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
    }

    function onUp() {
        clockDragging = false;
        el.style.cursor = 'grab';
        el.style.transition = 'box-shadow 0.3s, transform 0.15s';
        el.style.zIndex = '9999';

        S.clockX = parseInt(el.style.left);
        S.clockY = parseInt(el.style.top);
        save();

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    }
}

function nukeIM() {
    const inIM = location.pathname.startsWith('/im') ||
                 location.pathname.startsWith('/mail') ||
                 !!document.querySelector('.im-page, [class*="im-page"], [class*="Messenger"]');
    if (!inIM) return;

    const chatBg = rgba(S.tint, S.chat);
    const ownBg = rgba(S.ownClr, S.ownOp);
    const otherBg = rgba(S.otherClr, S.otherOp);
    const headerBg = rgba('#000', S.header);
    const inputBg = rgba('#000', S.input);
    const dialogsBg = rgba('#000', S.dialogs);
    const dialogItem = rgba('#1a1a1a', Math.min(S.dialogs + 12, 50));

    const all = document.querySelectorAll('*');
    const len = all.length;

    for (let i = 0; i < len; i++) {
        const el = all[i];
        if (skipEl(el)) continue;

        let bg;
        try { bg = getComputedStyle(el).backgroundColor; } catch(e) { continue; }
        if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') continue;
        if (!isGray(bg)) continue;

        const type = getType(el);

        switch (type) {
            case 'own-root':
                paint(el, ownBg);
                el.style.setProperty('border-radius', S.radius, 'important');
                break;
            case 'other-root':
                paint(el, otherBg);
                el.style.setProperty('border-radius', S.radius, 'important');
                break;
            case 'msg-inner':
                paint(el, 'transparent');
                break;
            case 'header-root':
                paint(el, headerBg);
                break;
            case 'header-inner':
                paint(el, 'transparent');
                break;
            case 'input-root':
                paint(el, inputBg);
                break;
            case 'input-field':
                paint(el, rgba('#1a1a1a', Math.min(S.input + 10, 45)));
                break;
            case 'input-inner':
                paint(el, 'transparent');
                break;
            case 'dialog-root':
                paint(el, dialogItem);
                el.style.setProperty('border-radius', '8px', 'important');
                el.style.setProperty('margin', '1px 3px', 'important');
                break;
            case 'dialog-selected':
                paint(el, rgba(S.accent, 22));
                el.style.setProperty('border-radius', '8px', 'important');
                el.style.setProperty('border-left', `3px solid ${S.accent}`, 'important');
                break;
            case 'dialog-inner':
                paint(el, 'transparent');
                break;
            case 'dialog-list-root':
                paint(el, dialogsBg);
                break;
            case 'dialog-list-inner':
                paint(el, 'transparent');
                break;
            case 'im-general':
                paint(el, chatBg);
                break;
            case 'top':
                paint(el, rgba('#000', S.topbar));
                break;
            case 'sidebar':
                paint(el, rgba('#000', S.sidebar));
                break;
            case 'sidebar-inner':
                paint(el, 'transparent');
                break;
            default:
                break;
        }
    }
}

function getType(el) {
    const cls = typeof el.className === 'string' ? el.className : '';

    if (matchCls(cls, ['mess-stack']) && matchCls(cls, ['--out', '_out', 'outgoing'])) {
        return 'own-root';
    }
    if (el.closest('[class*="--out"], [class*="_out"]')?.closest('[class*="mess-stack"], [class*="mess"]')) {
        if (matchCls(cls, ['mess-stack'])) return 'own-root';
        return 'msg-inner';
    }
    if (matchCls(cls, ['mess-stack', 'im-mess']) && !matchCls(cls, ['--out', '_out', 'content', 'text'])) {
        if (el.closest('[class*="--out"], [class*="_out"]')) return 'msg-inner';
        return 'other-root';
    }
    if (el.closest('[class*="mess-stack"], [class*="im-mess"]')) {
        return 'msg-inner';
    }

    if (matchCls(cls, ['page--header', 'chat-header', 'ChatHeader', 'PeerHeader'])) {
        return 'header-root';
    }
    if (el.closest('[class*="page--header"], [class*="chat-header"], [class*="ChatHeader"]')) {
        return 'header-inner';
    }

    if (matchCls(cls, ['page--chat-input', 'chat-input', 'ChatInput', 'Writebar', 'writebar'])) {
        return 'input-root';
    }
    if (el.closest('[class*="chat-input"], [class*="ChatInput"], [class*="Writebar"], [class*="page--chat-input"]')) {
        if (isTextInput(el)) return 'input-field';
        return 'input-inner';
    }

    if (matchCls(cls, ['nim-dialog', '_im_dialog', 'DialogItem', 'ConversationItem'])) {
        if (matchCls(cls, ['selected', 'active', '_selected'])) return 'dialog-selected';
        return 'dialog-root';
    }
    if (el.closest('[class*="nim-dialog"], [class*="DialogItem"], [class*="_im_dialog"]')) {
        return 'dialog-inner';
    }

    if (matchCls(cls, ['page--dialogs', 'page--aside', 'DialogsList', 'LeftColumn', 'ChatList', 'im-nav', 'im-dialogs', '_im_dialogs', 'aside-wrap'])) {
        return 'dialog-list-root';
    }
    if (el.closest('[class*="page--dialogs"], [class*="page--aside"], [class*="DialogsList"], [class*="ChatList"], [class*="im-nav"], [class*="im-dialogs"]')) {
        return 'dialog-list-inner';
    }

    if (el.closest('#top_nav, .top_nav_wrap, header, [class*="TopNav"]')) {
        return 'top';
    }

    if (el.id === 'side_bar' || el.id === 'side_bar_inner' || matchCls(cls, ['side_bar'])) {
        return 'sidebar';
    }
    if (el.closest('#side_bar, #side_bar_inner, .side_bar')) {
        return 'sidebar-inner';
    }

    if (el.closest('[class*="im-page"], [class*="im_page"], [class*="Messenger"], [class*="im-"], #im_wrap, .im-messengers')) {
        return 'im-general';
    }

    return null;
}

function matchCls(cls, patterns) {
    for (let i = 0; i < patterns.length; i++) {
        if (cls.includes(patterns[i])) return true;
    }
    return false;
}

function isTextInput(el) {
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    const cls = typeof el.className === 'string' ? el.className : '';
    return cls.includes('editable') || cls.includes('textarea');
}

const SKIP_TAGS = new Set([
    'IMG','VIDEO','CANVAS','SVG','IFRAME','svg','path','circle',
    'rect','line','polygon','g','defs','clipPath','use',
    'STYLE','SCRIPT','LINK','META','HEAD','BR','HR','WBR'
]);

function skipEl(el) {
    if (el.id === 'vk-panel' || el.id === 'vk-toggle' ||
        el.id === 'vk-bg' || el.id === 'vk-overlay' ||
        el.id === 'vk-clock') return true;
    if (el.closest('#vk-panel, #vk-toggle, #vk-clock')) return true;

    const tag = el.tagName;
    if (SKIP_TAGS.has(tag)) return true;

    if (tag === 'BUTTON' || tag === 'SELECT' || tag === 'OPTION' || tag === 'LABEL') return true;
    if (tag === 'A' && el.closest('[class*="btn"], [class*="Btn"], [class*="Button"]')) return true;
    if (el.closest('button')) return true;

    const cls = typeof el.className === 'string' ? el.className : '';
    if (cls.includes('btn') || cls.includes('Btn') ||
        cls.includes('button') || cls.includes('Button') ||
        cls.includes('icon') || cls.includes('Icon') ||
        cls.includes('badge') || cls.includes('Badge') ||
        cls.includes('counter') || cls.includes('Counter') ||
        cls.includes('avatar') || cls.includes('Avatar') ||
        cls.includes('photo') || cls.includes('Photo') ||
        cls.includes('thumb') || cls.includes('Thumb') ||
        cls.includes('emoji') || cls.includes('Emoji') ||
        cls.includes('sticker') || cls.includes('Sticker') ||
        cls.includes('typing') || cls.includes('Typing') ||
        cls.includes('online') || cls.includes('Online') ||
        cls.includes('verified') || cls.includes('Verified') ||
        cls.includes('popup') || cls.includes('Popup') ||
        cls.includes('modal') || cls.includes('Modal') ||
        cls.includes('tooltip') || cls.includes('Tooltip') ||
        cls.includes('dropdown') || cls.includes('Dropdown') ||
        cls.includes('menu') || cls.includes('Menu') ||
        cls.includes('ActionSheet')) return true;

    if (el.getAttribute('role') === 'button' ||
        el.getAttribute('role') === 'link' ||
        el.getAttribute('role') === 'menuitem' ||
        el.getAttribute('role') === 'tab') return true;

    return false;
}

function isGray(bgStr) {
    const m = bgStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return true;
    const diff = Math.max(+m[1],+m[2],+m[3]) - Math.min(+m[1],+m[2],+m[3]);
    return diff < 30;
}

function nukeGlobal() {
    if (!document.getElementById('vk-bg')) return;

    document.querySelectorAll('#page_body, #content, #main, .page_body').forEach(el => {
        paint(el, rgba('#000', S.panels));
    });

    document.querySelectorAll('.page_block').forEach(el => {
        if (el.closest('#vk-panel, [class*="im-page"], [class*="im_page"], [class*="im-"]')) return;
        paint(el, rgba('#111', S.blocks));
        el.style.setProperty('border-radius', S.radius, 'important');
    });

    document.querySelectorAll('.post, .wall_post, .feed_row, .page_post').forEach(el => {
        paint(el, rgba('#111', S.blocks));
        el.style.setProperty('border-radius', S.radius, 'important');
    });
}

function paint(el, color) {
    el.style.setProperty('background-color', color, 'important');
    el.style.setProperty('background-image', 'none', 'important');
}

function setBg(url) {
    rmBg();
    const c = document.createElement('div');
    c.id = 'vk-bg';
    c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;overflow:hidden;pointer-events:none';
    const f = document.createElement('iframe');
    f.src = url;
    f.style.cssText = 'position:absolute;top:50%;left:50%;min-width:100vw;min-height:100vh;width:177.78vh;height:56.25vw;transform:translate(-50%,-50%);border:none;pointer-events:none';
    f.allow = 'autoplay;fullscreen';
    f.setAttribute('frameborder','0');
    c.appendChild(f);
    document.body.prepend(c);
    const o = document.createElement('div');
    o.id = 'vk-overlay';
    o.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,${S.overlay/100});z-index:-1;pointer-events:none;transition:background .3s`;
    document.body.prepend(o);
}

function rmBg() {
    ['vk-bg','vk-overlay'].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); });
}

function makePanel() {
    if (document.getElementById('vk-panel')) return;

    const btn = document.createElement('div');
    btn.id = 'vk-toggle';
    btn.innerHTML = '🎨';
    Object.assign(btn.style, {
        position:'fixed', top:'10px', left:'10px',
        width:'42px', height:'42px',
        background:'rgba(20,20,22,.92)',
        border:'2px solid rgba(74,118,168,.5)',
        borderRadius:'12px',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'20px', cursor:'pointer', zIndex:'10002',
        transition:'all .3s', backdropFilter:'blur(10px)',
        boxShadow:'0 4px 15px rgba(0,0,0,.4)', userSelect:'none'
    });
    document.body.appendChild(btn);

    const p = document.createElement('div');
    p.id = 'vk-panel';
    Object.assign(p.style, {
        position:'fixed', top:'0', left:'-290px',
        width:'280px', height:'100vh',
        background:'rgba(18,18,22,.97)',
        borderRight:'1px solid rgba(74,118,168,.15)',
        zIndex:'10001', transition:'left .35s cubic-bezier(.4,0,.2,1)',
        backdropFilter:'blur(20px)', display:'flex', flexDirection:'column',
        fontFamily:'-apple-system,sans-serif',
        boxShadow:'5px 0 30px rgba(0,0,0,.6)',
        color:'#ccc', overflow:'hidden'
    });
    fillPanel(p);
    document.body.appendChild(p);

    btn.onmouseenter = () => { btn.style.transform='scale(1.1) rotate(15deg)'; btn.style.borderColor='#4a76a8'; };
    btn.onmouseleave = () => { if(!panelOpen){btn.style.transform='';btn.style.borderColor='rgba(74,118,168,.5)';} };
    btn.onclick = () => {
        panelOpen = !panelOpen;
        p.style.left = panelOpen ? '0' : '-290px';
        btn.style.left = panelOpen ? '290px' : '10px';
        btn.style.background = panelOpen ? 'rgba(74,118,168,.3)' : 'rgba(20,20,22,.92)';
    };
}

function fillPanel(p) {
    const g = S.bg ? (S.bg.split('/embed/')[1] || 'C3Jb') : 'C3Jb';
    p.innerHTML = `
<div style="display:flex;align-items:center;gap:8px;padding:14px 14px 10px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0">
    <span style="font-size:20px">🎨</span>
    <span style="font-size:15px;font-weight:700;color:#ddd">VK Custom</span>
    <span style="background:linear-gradient(135deg,#4a76a8,#6a8ab8);color:#fff;font-size:8px;font-weight:700;padding:2px 6px;border-radius:7px;letter-spacing:1px">PRO</span>
</div>
<div style="flex:1;overflow-y:auto;padding:6px;scrollbar-width:thin">
${grp('🖼️ Фон',`
    <textarea id="vk-gif" rows="2" style="${IS};resize:vertical">${g}</textarea>
    ${BT('vk-set-gif','🖼️ Установить','#4a76a8')}
    ${BT('vk-rm-bg','🗑️ Убрать','#dc3545')}
`)}
${grp('🌙 Затемнение',`${RN('vk-ov','Затемнение',S.overlay)}`)}
${grp('🕐 Часы',`
    ${TG('vk-ckon','Показать часы',S.clockOn)}
    ${RNpx('vk-cksz','Размер',S.clockSize,14,120)}
    ${RN('vk-ckbg','Фон часов',S.clockBg)}
    ${CR('vk-ckcl','Цвет текста',S.clockColor)}
    ${TG('vk-cksc','Секунды',S.clockSeconds)}
    ${TG('vk-ckdt','Дата',S.clockDate)}
    ${TG('vk-ck24','24-часовой',S.clock24h)}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:10px;color:#777">Шрифт</span>
        <select id="vk-ckfn" style="padding:4px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#ccc;font-size:10px;outline:none;cursor:pointer">
            <option value="default" ${S.clockFont==='default'?'selected':''}>Обычный</option>
            <option value="mono" ${S.clockFont==='mono'?'selected':''}>Моно</option>
            <option value="digital" ${S.clockFont==='digital'?'selected':''}>Цифровой</option>
            <option value="elegant" ${S.clockFont==='elegant'?'selected':''}>Элегантный</option>
            <option value="rounded" ${S.clockFont==='rounded'?'selected':''}>Округлый</option>
        </select>
    </div>
    ${BT('vk-ckcenter','📍 В центр','#4a76a8')}
    <div style="font-size:9px;color:#444;padding:5px 7px;background:rgba(255,255,255,.02);border-radius:5px;border-left:2px solid rgba(74,118,168,.2);margin-top:4px">Виджет можно перетаскивать мышью.<br>Кнопки +/− при наведении на часы.</div>
`)}
${grp('🔮 Прозрачность',`
    ${RN('vk-ch','💬 Фон чата',S.chat)}
    ${RN('vk-dl','📋 Список чатов',S.dialogs)}
    ${RN('vk-hd','📌 Шапка',S.header)}
    ${RN('vk-in','⌨️ Ввод',S.input)}
    ${RN('vk-tp','🔝 Верх',S.topbar)}
    ${RN('vk-sd','📂 Меню',S.sidebar)}
    ${CR('vk-tn','Тонировка',S.tint)}
    <div style="font-size:9px;color:#444;padding:5px 7px;background:rgba(255,255,255,.02);border-radius:5px;border-left:2px solid rgba(74,118,168,.2);margin-top:4px">0% = полностью прозрачно</div>
`)}
${grp('✉️ Сообщения',`
    ${RN('vk-ow','Свои',S.ownOp)}
    ${CR('vk-oc','Цвет своих',S.ownClr)}
    ${RN('vk-ot','Чужие',S.otherOp)}
    ${CR('vk-tc','Цвет чужих',S.otherClr)}
`)}
${grp('📦 Общее',`
    ${RN('vk-bl','Блоки',S.blocks)}
    ${RN('vk-pn','Панели',S.panels)}
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <span style="font-size:10px;color:#777">Скругление</span>
        <input type="text" id="vk-rd" value="${S.radius}" style="${IS};width:75px">
    </div>
    ${CR('vk-ac','Акцент',S.accent)}
`)}
<div style="padding:6px 0 14px;display:flex;flex-direction:column;gap:3px">
    ${BT('vk-save','💾 Сохранить','#28a745')}
    ${BT('vk-reset','🔄 Сброс','#fd7e14')}
</div>
</div>`;
    bindPanel(p);
}

const IS = 'width:100%;padding:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:7px;color:#ccc;font-size:11px;outline:none;box-sizing:border-box;font-family:monospace';

function grp(t,c){return `<details open style="margin-bottom:3px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.03)"><summary style="padding:9px 10px;color:#7a9ab8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;cursor:pointer;user-select:none">${t}</summary><div style="padding:4px 10px 10px">${c}</div></details>`;}

function RN(id,l,v){return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:11px;color:#888">${l}</span><span id="${id}-v" style="font-size:11px;color:#4a76a8;font-weight:700">${v}%</span></div><input type="range" id="${id}" min="0" max="100" value="${v}" style="width:100%;height:4px;-webkit-appearance:none;background:rgba(255,255,255,.06);border-radius:2px;outline:none;cursor:pointer;accent-color:#4a76a8"></div>`;}

function RNpx(id,l,v,min,max){return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:11px;color:#888">${l}</span><span id="${id}-v" style="font-size:11px;color:#4a76a8;font-weight:700">${v}px</span></div><input type="range" id="${id}" min="${min}" max="${max}" value="${v}" style="width:100%;height:4px;-webkit-appearance:none;background:rgba(255,255,255,.06);border-radius:2px;outline:none;cursor:pointer;accent-color:#4a76a8"></div>`;}

function CR(id,l,v){return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:10px;color:#777">${l}</span><input type="color" id="${id}" value="${v}" style="width:28px;height:20px;border:1px solid rgba(255,255,255,.08);border-radius:5px;cursor:pointer;background:transparent;padding:0"></div>`;}

function BT(id,t,bg){return `<button id="${id}" style="width:100%;margin-top:4px;padding:8px;background:${bg};color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600">${t}</button>`;}

function TG(id,l,v){return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:11px;color:#888">${l}</span><label style="position:relative;width:36px;height:20px;flex-shrink:0"><input type="checkbox" id="${id}" ${v?'checked':''} style="opacity:0;width:0;height:0"><span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${v?'#4a76a8':'rgba(255,255,255,.12)'};border-radius:20px;transition:.3s"></span><span style="position:absolute;left:${v?'18px':'3px'};top:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span></label></div>`;}

function bindPanel(p) {
    p.querySelectorAll('input[type=range]').forEach(r => {
        r.addEventListener('input', e => {
            const v = document.getElementById(e.target.id+'-v');
            if(v) {
                const isPx = e.target.id === 'vk-cksz';
                v.textContent = e.target.value + (isPx ? 'px' : '%');
            }
            collect();

            if (['vk-cksz','vk-ckbg'].includes(e.target.id)) {
                refreshClock();
            }

            fix();
            const o = document.getElementById('vk-overlay');
            if(o) o.style.background = `rgba(0,0,0,${S.overlay/100})`;
        });
    });

    p.querySelectorAll('input[type=color]').forEach(c => {
        c.addEventListener('input', () => {
            collect();
            if (c.id === 'vk-ckcl') refreshClock();
            fix();
        });
    });

    p.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const label = cb.closest('label');
            if (label) {
                const bg = label.querySelectorAll('span')[0];
                const dot = label.querySelectorAll('span')[1];
                if (bg) bg.style.background = cb.checked ? '#4a76a8' : 'rgba(255,255,255,.12)';
                if (dot) dot.style.left = cb.checked ? '18px' : '3px';
            }
            collect();
            if (['vk-ckon','vk-cksc','vk-ckdt','vk-ck24'].includes(cb.id)) {
                refreshClock();
            }
        });
    });

    const fontSel = p.querySelector('#vk-ckfn');
    if (fontSel) {
        fontSel.addEventListener('change', () => {
            collect();
            refreshClock();
        });
    }

    const centerBtn = p.querySelector('#vk-ckcenter');
    if (centerBtn) {
        centerBtn.onclick = () => {
            S.clockX = -1;
            S.clockY = 60;
            refreshClock();
            save();
            toast('📍 Часы в центре');
        };
    }

    p.querySelector('#vk-set-gif').onclick = () => {
        const id = gifId(p.querySelector('#vk-gif').value);
        if(id){S.bg=`https://gifer.com/embed/${id}`;setBg(S.bg);p.querySelector('#vk-gif').value=id;toast(`✅ "${id}" ok`);}
        else toast('❌ Ошибка');
    };
    p.querySelector('#vk-rm-bg').onclick = () => { S.bg=null;rmBg();toast('🗑️ Убрано'); };
    p.querySelector('#vk-save').onclick = () => { collect();save();toast('💾 Ок!'); };
    p.querySelector('#vk-reset').onclick = () => {
        if(!confirm('Сбросить?'))return;
        S={bg:'https://gifer.com/embed/C3Jb',accent:'#4a76a8',radius:'12px',overlay:40,tint:'#000000',chat:10,dialogs:10,header:15,input:20,topbar:10,sidebar:15,panels:30,blocks:85,ownOp:60,otherOp:50,ownClr:'#4a76a8',otherClr:'#2d2d2d',clockOn:true,clockSize:48,clockX:-1,clockY:60,clockColor:'#ffffff',clockBg:30,clockSeconds:true,clockDate:true,clock24h:true,clockFont:'default'};
        setBg(S.bg);refreshClock();save();fillPanel(document.getElementById('vk-panel'));toast('🔄 Ок');
    };
}

function collect() {
    const v=id=>{const e=document.getElementById(id);return e?e.value:null;};
    const n=(id,d)=>{const x=v(id);return x!==null?parseInt(x):d;};
    const b=(id,d)=>{const e=document.getElementById(id);return e?e.checked:d;};

    S.overlay=n('vk-ov',40); S.chat=n('vk-ch',10); S.dialogs=n('vk-dl',10);
    S.header=n('vk-hd',15); S.input=n('vk-in',20); S.topbar=n('vk-tp',10);
    S.sidebar=n('vk-sd',15); S.ownOp=n('vk-ow',60); S.otherOp=n('vk-ot',50);
    S.blocks=n('vk-bl',85); S.panels=n('vk-pn',30);
    S.ownClr=v('vk-oc')||S.ownClr; S.otherClr=v('vk-tc')||S.otherClr;
    S.accent=v('vk-ac')||S.accent; S.tint=v('vk-tn')||S.tint;
    const r=v('vk-rd');if(r)S.radius=r;

    S.clockOn=b('vk-ckon',true);
    S.clockSize=n('vk-cksz',48);
    S.clockBg=n('vk-ckbg',30);
    S.clockColor=v('vk-ckcl')||S.clockColor;
    S.clockSeconds=b('vk-cksc',true);
    S.clockDate=b('vk-ckdt',true);
    S.clock24h=b('vk-ck24',true);
    const fn=v('vk-ckfn');if(fn)S.clockFont=fn;
}

function save() {
    try{chrome.runtime?.sendMessage({type:'saveSettings',settings:S});}catch(e){}
    try{localStorage.setItem('vkc5',JSON.stringify(S));}catch(e){}
}

function toast(msg) {
    document.querySelectorAll('.vk-toast').forEach(t => t.remove());
    const n=document.createElement('div');n.textContent=msg;n.className='vk-toast';
    Object.assign(n.style,{position:'fixed',top:'15px',right:'15px',background:'rgba(18,18,22,.95)',color:'#ddd',padding:'11px 18px',borderRadius:'9px',zIndex:'10003',boxShadow:'0 5px 20px rgba(0,0,0,.5)',borderLeft:'3px solid #4a76a8',backdropFilter:'blur(10px)',fontSize:'12px',transition:'all .3s'});
    document.body.appendChild(n);
    setTimeout(()=>{n.style.opacity='0';n.style.transform='translateX(40px)';setTimeout(()=>n.remove(),300);},2500);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();
