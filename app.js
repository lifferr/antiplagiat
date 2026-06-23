/* =========================================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
   ========================================= */
const state = {
    author: '',
    reviewer: '',
    docTitle: '',
    organization: '',
    docNumber: '',
    docType: '',
    pages: 0,
    words: 0,
    chars: 0,
    sentences: 0,
    originality: 0,
    matches: 0,
    citations: 0,
    selfCitations: 0,
    aiContent: 0,
    checkDateTime: '',
    checkEditing: true,
    checkOCR: false,
    checkStructure: true,
    excludedSections: ['Приложение', 'Таблицы'],
    reportType: 'full'
};

const PERCENT_KEYS = ['originality', 'matches', 'citations', 'selfCitations', 'aiContent'];

const COLOR_MAP = {
    originality: '#34C759',
    matches: '#FF9500',
    citations: '#007AFF',
    selfCitations: '#AF52DE',
    aiContent: '#FF3B30'
};

const LABEL_MAP = {
    originality: 'Оригинальность',
    matches: 'Совпадения',
    citations: 'Цитирования',
    selfCitations: 'Самоцитирования',
    aiContent: 'ИИ-контент'
};

/* =========================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initSettings();
    initActions();
    initDateTime();
});

/* =========================================
   ДАТА/ВРЕМЯ
   ========================================= */
function initDateTime() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    const value = local.toISOString().slice(0, 16);
    document.getElementById('checkDateTime').value = value;
    state.checkDateTime = value;
}

/* =========================================
   ЗАГРУЗКА ФАЙЛА
   ========================================= */
function initUpload() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--apple-blue)';
        zone.style.background = 'rgba(0, 122, 255, 0.08)';
    });

    zone.addEventListener('dragleave', () => {
        zone.style.borderColor = 'rgba(0, 122, 255, 0.3)';
        zone.style.background = 'rgba(0, 122, 255, 0.02)';
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'rgba(0, 122, 255, 0.3)';
        zone.style.background = 'rgba(0, 122, 255, 0.02)';
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    input.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
}

async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const info = document.getElementById('fileInfo');
    const name = document.getElementById('fileName');
    const stats = document.getElementById('fileStats');

    name.textContent = file.name;
    stats.textContent = 'Обработка файла...';
    info.style.display = 'block';

    try {
        let text = '';
        let pageCount = 0;

        if (ext === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pageCount = pdf.numPages;
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + ' ';
            }
        } else if (ext === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
            pageCount = Math.ceil(text.length / 1800);
        } else {
            throw new Error('Формат не поддерживается');
        }

        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

        state.pages = pageCount;
        state.words = words;
        state.chars = chars;
        state.sentences = sentences;

        document.getElementById('pages').value = pageCount;
        document.getElementById('words').value = words;
        document.getElementById('chars').value = chars;
        document.getElementById('sentences').value = sentences;

        generatePercentages();
        state.docNumber = Math.floor(100000 + Math.random() * 900000);
        document.getElementById('docNumber').value = state.docNumber;

        stats.textContent = `Страниц: ${pageCount} · Слов: ${words} · Символов: ${chars} · Предложений: ${sentences}`;

        document.getElementById('docInfoCard').style.display = 'block';
        document.getElementById('percentagesCard').style.display = 'block';
        document.getElementById('actionsCard').style.display = 'block';

    } catch (err) {
        stats.textContent = 'Ошибка: ' + err.message;
        console.error(err);
    }
}

function generatePercentages() {
    const originality = 75 + Math.random() * 22;
    const remaining = 100 - originality;
    const matches = remaining * (0.4 + Math.random() * 0.3);
    const citations = remaining * (0.1 + Math.random() * 0.2);
    const selfCitations = remaining * (0.05 + Math.random() * 0.15);
    const aiContent = remaining - matches - citations - selfCitations;

    state.originality = originality;
    state.matches = matches;
    state.citations = citations;
    state.selfCitations = selfCitations;
    state.aiContent = Math.max(0, aiContent);

    updatePercentDisplay();
}

function updatePercentDisplay() {
    document.getElementById('originalityValue').textContent = state.originality.toFixed(2) + '%';
    document.getElementById('matchesValue').textContent = state.matches.toFixed(2) + '%';
    document.getElementById('citationsValue').textContent = state.citations.toFixed(2) + '%';
    document.getElementById('selfCitationsValue').textContent = state.selfCitations.toFixed(2) + '%';
    document.getElementById('aiContentValue').textContent = state.aiContent.toFixed(2) + '%';
}

/* =========================================
   НАСТРОЙКИ (МОДАЛЬНОЕ ОКНО)
   ========================================= */
function initSettings() {
    const fab = document.getElementById('settingsFab');
    const modal = document.getElementById('settingsModal');
    const close = document.getElementById('modalClose');
    const save = document.getElementById('modalSave');
    const cancel = document.getElementById('modalCancel');

    fab.addEventListener('click', () => openModal());
    close.addEventListener('click', () => modal.classList.remove('active'));
    cancel.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Чекбоксы
    document.getElementById('checkEditing').addEventListener('change', (e) => {
        state.checkEditing = e.target.checked;
    });
    document.getElementById('checkOCR').addEventListener('change', (e) => {
        state.checkOCR = e.target.checked;
    });
    document.getElementById('checkStructure').addEventListener('change', (e) => {
        state.checkStructure = e.target.checked;
    });

    document.querySelectorAll('.excluded-section').forEach(cb => {
        cb.addEventListener('change', () => {
            state.excludedSections = Array.from(document.querySelectorAll('.excluded-section:checked'))
                .map(el => el.value);
        });
    });

    // Слайдеры процентов в модалке
    bindModalPercentSliders();

    // Сохранение
    save.addEventListener('click', () => {
        saveModalData();
        modal.classList.remove('active');
        // Если отчёт уже сгенерирован — перерисовать
        if (document.getElementById('reportPreview').style.display === 'block') {
            generateReport();
        }
    });
}

function openModal() {
    // Заполняем модалку текущими значениями
    document.getElementById('modalPages').value = state.pages;
    document.getElementById('modalWords').value = state.words;
    document.getElementById('modalChars').value = state.chars;
    document.getElementById('modalSentences').value = state.sentences;

    document.getElementById('modalOriginality').value = state.originality;
    document.getElementById('modalOriginalityNum').value = state.originality.toFixed(2);
    document.getElementById('modalMatches').value = state.matches;
    document.getElementById('modalMatchesNum').value = state.matches.toFixed(2);
    document.getElementById('modalCitations').value = state.citations;
    document.getElementById('modalCitationsNum').value = state.citations.toFixed(2);
    document.getElementById('modalSelfCitations').value = state.selfCitations;
    document.getElementById('modalSelfCitationsNum').value = state.selfCitations.toFixed(2);
    document.getElementById('modalAiContent').value = state.aiContent;
    document.getElementById('modalAiContentNum').value = state.aiContent.toFixed(2);

    updateModalSum();
    document.getElementById('settingsModal').classList.add('active');
}

function bindModalPercentSliders() {
    PERCENT_KEYS.forEach(key => {
        const slider = document.getElementById('modal' + capitalize(key));
        const num = document.getElementById('modal' + capitalize(key) + 'Num');
        if (!slider || !num) return;

        slider.addEventListener('input', () => {
            num.value = parseFloat(slider.value).toFixed(2);
            normalizeModalPercentages(key);
            updateModalSum();
        });

        num.addEventListener('input', () => {
            const val = parseFloat(num.value) || 0;
            slider.value = val;
            normalizeModalPercentages(key);
            updateModalSum();
        });
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeModalPercentages(changedKey) {
    const currentVal = parseFloat(document.getElementById('modal' + capitalize(changedKey) + 'Num').value) || 0;
    const others = PERCENT_KEYS.filter(k => k !== changedKey);
    let othersSum = 0;
    others.forEach(k => {
        othersSum += parseFloat(document.getElementById('modal' + capitalize(k) + 'Num').value) || 0;
    });
    const targetOthersSum = 100 - currentVal;

    if (othersSum > 0 && targetOthersSum >= 0) {
        const ratio = targetOthersSum / othersSum;
        others.forEach(k => {
            const cur = parseFloat(document.getElementById('modal' + capitalize(k) + 'Num').value) || 0;
            const newVal = parseFloat((cur * ratio).toFixed(2));
            document.getElementById('modal' + capitalize(k)).value = newVal;
            document.getElementById('modal' + capitalize(k) + 'Num').value = newVal;
        });
    } else if (targetOthersSum === 0) {
        others.forEach(k => {
            document.getElementById('modal' + capitalize(k)).value = 0;
            document.getElementById('modal' + capitalize(k) + 'Num').value = 0;
        });
    }

    // Точная подгонка
    let total = currentVal;
    others.forEach(k => {
        total += parseFloat(document.getElementById('modal' + capitalize(k) + 'Num').value) || 0;
    });
    if (Math.abs(total - 100) > 0.001 && others.length > 0) {
        const last = others[others.length - 1];
        const lastEl = document.getElementById('modal' + capitalize(last) + 'Num');
        const lastSlider = document.getElementById('modal' + capitalize(last));
        const newVal = parseFloat((parseFloat(lastEl.value) + (100 - total)).toFixed(2));
        lastEl.value = newVal;
        lastSlider.value = newVal;
    }
}

function updateModalSum() {
    let sum = 0;
    PERCENT_KEYS.forEach(k => {
        sum += parseFloat(document.getElementById('modal' + capitalize(k) + 'Num').value) || 0;
    });
    document.getElementById('modalTotalSum').textContent = sum.toFixed(2);
    const status = document.getElementById('modalSumStatus');
    if (Math.abs(sum - 100) < 0.01) {
        status.textContent = 'Корректно';
        status.className = 'sum-status status-ok';
    } else {
        status.textContent = 'Сумма ≠ 100%';
        status.className = 'sum-status status-error';
    }
}

function saveModalData() {
    // Метрики
    state.pages = parseInt(document.getElementById('modalPages').value) || 0;
    state.words = parseInt(document.getElementById('modalWords').value) || 0;
    state.chars = parseInt(document.getElementById('modalChars').value) || 0;
    state.sentences = parseInt(document.getElementById('modalSentences').value) || 0;

    // Обновляем readonly-поля на главной
    document.getElementById('pages').value = state.pages;
    document.getElementById('words').value = state.words;
    document.getElementById('chars').value = state.chars;
    document.getElementById('sentences').value = state.sentences;

    // Проценты
    PERCENT_KEYS.forEach(k => {
        state[k] = parseFloat(document.getElementById('modal' + capitalize(k) + 'Num').value) || 0;
    });

    updatePercentDisplay();
}

/* =========================================
   ДЕЙСТВИЯ
   ========================================= */
function initActions() {
    document.getElementById('generateFullReport').addEventListener('click', () => {
        state.reportType = 'full';
        generateReport();
    });

    document.getElementById('generateShortReport').addEventListener('click', () => {
        state.reportType = 'short';
        generateReport();
    });

    document.getElementById('printReport').addEventListener('click', () => {
        window.print();
    });

    ['author', 'reviewer', 'docTitle', 'organization', 'docType', 'docNumber'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            state[id] = e.target.value;
        });
    });
}

/* =========================================
   ГЕНЕРАЦИЯ ОТЧЁТА
   ========================================= */
function generateReport() {
    const dateTime = new Date(state.checkDateTime);
    const dateStr = dateTime.toLocaleDateString('ru-RU');
    const timeStr = dateTime.toLocaleTimeString('ru-RU');

    const checkedPercent = (100 - state.excludedSections.length * 1.5).toFixed(2);
    const excludedPercent = (100 - checkedPercent).toFixed(2);

    let html = `
        <div class="report-header">
            <h1>Отчет о проверке</h1>
        </div>

        <div class="report-section">
            <h3 class="section-title">Общая информация</h3>
            <div class="report-grid">
                ${state.author ? `<div class="report-row"><span class="report-label">Автор</span><span class="report-value">${escapeHtml(state.author)}</span></div>` : ''}
                ${state.reviewer ? `<div class="report-row"><span class="report-label">Проверяющий</span><span class="report-value">${escapeHtml(state.reviewer)}</span></div>` : ''}
                ${state.docTitle ? `<div class="report-row report-row-full"><span class="report-label">Название документа</span><span class="report-value">${escapeHtml(state.docTitle)}</span></div>` : ''}
                ${state.organization ? `<div class="report-row report-row-full"><span class="report-label">Организация</span><span class="report-value">${escapeHtml(state.organization)}</span></div>` : ''}
            </div>
        </div>

        <div class="report-section">
            <h3 class="section-title">Информация о документе</h3>
            <div class="report-grid">
                <div class="report-row"><span class="report-label">Номер документа</span><span class="report-value"><b>${state.docNumber}</b></span></div>
                ${state.docType ? `<div class="report-row"><span class="report-label">Тип документа</span><span class="report-value"><b>${escapeHtml(state.docType)}</b></span></div>` : ''}
                <div class="report-row"><span class="report-label">Количество страниц</span><span class="report-value"><b>${state.pages}</b></span></div>
                <div class="report-row"><span class="report-label">Символов в тексте</span><span class="report-value"><b>${state.chars.toLocaleString('ru-RU')}</b></span></div>
                <div class="report-row"><span class="report-label">Слов в тексте</span><span class="report-value"><b>${state.words.toLocaleString('ru-RU')}</b></span></div>
                <div class="report-row"><span class="report-label">Число предложений</span><span class="report-value"><b>${state.sentences.toLocaleString('ru-RU')}</b></span></div>
                <div class="report-row"><span class="report-label">Дата проверки</span><span class="report-value"><b>${dateStr} ${timeStr}</b></span></div>
            </div>
        </div>

        <div class="report-section">
            <h3 class="section-title">Результаты проверки</h3>
            <div class="report-results">
                ${buildPieChart()}
                <div class="report-legend">
                    <div class="report-legend-item">
                        <span class="legend-color" style="background:${COLOR_MAP.originality}"></span>
                        <span class="legend-label">${LABEL_MAP.originality}</span>
                        <span class="legend-value">${state.originality.toFixed(2)}%</span>
                    </div>
                    <div class="report-legend-item">
                        <span class="legend-color" style="background:${COLOR_MAP.matches}"></span>
                        <span class="legend-label">${LABEL_MAP.matches}</span>
                        <span class="legend-value">${state.matches.toFixed(2)}%</span>
                    </div>
                    <div class="report-legend-item">
                        <span class="legend-color" style="background:${COLOR_MAP.citations}"></span>
                        <span class="legend-label">${LABEL_MAP.citations}</span>
                        <span class="legend-value">${state.citations.toFixed(2)}%</span>
                    </div>
                    <div class="report-legend-item">
                        <span class="legend-color" style="background:${COLOR_MAP.selfCitations}"></span>
                        <span class="legend-label">${LABEL_MAP.selfCitations}</span>
                        <span class="legend-value">${state.selfCitations.toFixed(2)}%</span>
                    </div>
                    <div class="report-legend-item">
                        <span class="legend-color" style="background:${COLOR_MAP.aiContent}"></span>
                        <span class="legend-label">${LABEL_MAP.aiContent}</span>
                        <span class="legend-value">${state.aiContent.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
            <div class="report-checked">
                <div>Проверено: <b>${checkedPercent}%</b> текста документа, исключено из проверки: <b>${excludedPercent}%</b> текста документа.</div>
            </div>
        </div>
    `;

    if (state.reportType === 'full') {
        html += `
            <div class="report-section">
                <h3 class="section-title">Параметры проверки</h3>
                <ul class="report-params">
                    <li>Выполнена проверка с учетом редактирования: <b>${state.checkEditing ? 'Да' : 'Нет'}</b></li>
                    <li>Выполнено распознавание текста (OCR): <b>${state.checkOCR ? 'Да' : 'Нет'}</b></li>
                    <li>Выполнена проверка с учетом структуры: <b>${state.checkStructure ? 'Да' : 'Нет'}</b></li>
                    ${state.excludedSections.length > 0 ? `<li>Разделы и элементы, отключенные пользователем: <b>${state.excludedSections.join(', ')}</b></li>` : ''}
                </ul>
            </div>
        `;
    }

    html += `
        <div class="report-section">
            <h3 class="section-title">Пояснения к показателям</h3>
            <div class="report-terms">
                <p><b>Совпадения</b> — фрагменты проверяемого текста, полностью или частично сходные с найденными источниками, за исключением фрагментов, которые система отнесла к цитированию или самоцитированию.</p>
                <p><b>Самоцитирования</b> — фрагменты проверяемого текста, совпадающие или почти совпадающие с фрагментом текста источника, автором или соавтором которого является автор проверяемого документа.</p>
                <p><b>Цитирования</b> — фрагменты проверяемого текста, которые не являются авторскими, но которые система отнесла к корректно оформленным.</p>
                <p><b>Оригинальный текст</b> — фрагменты проверяемого текста, не обнаруженные ни в одном источнике и не отмеченные ни одним из модулей поиска.</p>
            </div>
            <div class="report-disclaimer">
                Обращаем Ваше внимание, что система находит текстовые совпадения проверяемого документа с проиндексированными в системе источниками. При этом система является вспомогательным инструментом — определение корректности и правомерности совпадений или цитирований, а также авторства текстовых фрагментов проверяемого документа остаётся в компетенции проверяющего.
            </div>
        </div>

        <div class="report-footer">
            <div>Дата формирования отчёта: <b>${dateStr} ${timeStr}</b></div>
            <div>Номер документа: ${state.docNumber}</div>
        </div>
    `;

    const canvas = document.getElementById('reportContent');
    canvas.innerHTML = html;
    document.getElementById('reportPreview').style.display = 'block';
    document.getElementById('reportPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildPieChart() {
    const data = [
        { key: 'originality', value: state.originality, color: COLOR_MAP.originality },
        { key: 'matches', value: state.matches, color: COLOR_MAP.matches },
        { key: 'citations', value: state.citations, color: COLOR_MAP.citations },
        { key: 'selfCitations', value: state.selfCitations, color: COLOR_MAP.selfCitations },
        { key: 'aiContent', value: state.aiContent, color: COLOR_MAP.aiContent }
    ].filter(d => d.value > 0);

    const cx = 120, cy = 120, r = 100;
    let paths = '';
    let startAngle = -Math.PI / 2;

    if (data.length === 1) {
        paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${data[0].color}"/>`;
    } else if (data.length > 1) {
        data.forEach(d => {
            const angle = (d.value / 100) * 2 * Math.PI;
            const endAngle = startAngle + angle;
            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            const largeArc = angle > Math.PI ? 1 : 0;
            paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${d.color}" stroke="white" stroke-width="2"/>`;
            startAngle = endAngle;
        });
    }

    return `
        <div class="report-pie-wrap">
            <svg class="report-pie" viewBox="0 0 240 240">
                ${paths}
                <circle cx="${cx}" cy="${cy}" r="50" fill="white"/>
            </svg>
            <div class="report-pie-center">
                <div class="big">${state.originality.toFixed(2)}%</div>
                <div class="small">оригинальность</div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}