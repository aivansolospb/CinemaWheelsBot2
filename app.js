// (2.0) Мок TWA для отладки в браузере
if (typeof Telegram === 'undefined' || !Telegram.WebApp.initDataUnsafe) {
    console.log("Telegram WebApp SDK не найден. Используется мок.");
    window.Telegram = {
        WebApp: {
            initDataUnsafe: {
                user: { 
                    id: 123456789, // <-- ТЕСТОВЫЙ ID 
                    first_name: "Иван", 
                    last_name: "Иванов", 
                    username: "ivan_test"
                }
            },
            ready: () => console.log("TWA Mock Ready"),
            expand: () => console.log("TWA Mock Expand"),
            onEvent: (event, cb) => {
                if (event === 'backButtonClicked') {
                    window.TWA_BACK_BUTTON_CALLBACK = cb;
                }
            },
            BackButton: {
                show: () => console.log("TWA Mock BackButton Show"),
                hide: () => console.log("TWA Mock BackButton Hide"),
            },
            MainButton: {
                setText: (text) => console.log(`TWA Mock MainButton Text: ${text}`),
                show: () => console.log("TWA Mock MainButton Show"),
                hide: () => console.log("TWA Mock MainButton Hide"),
                setParams: (params) => console.log("TWA Mock MainButton Params:", params),
            },
            HapticFeedback: {
                notificationOccurred: (type) => console.log(`TWA Mock Haptic: ${type}`),
                impactOccurred: (style) => console.log(`TWA Mock Haptic: ${style}`),
            },
            CloudStorage: {
                setItem: (key, value, cb) => { 
                    localStorage.setItem(key, value); 
                    if(cb) cb(null, true);
                },
                getItem: (key, cb) => {
                    const val = localStorage.getItem(key);
                    if(cb) cb(null, val);
                },
                getItems: (keys, cb) => {
                    const result = {};
                    keys.forEach(key => result[key] = localStorage.getItem(key));
                    if(cb) cb(null, result);
                },
                removeItem: (key, cb) => {
                    localStorage.removeItem(key);
                    if(cb) cb(null, true);
                }
            }
        }
    };
}

// (2.0) API_BASE_URL (!!!) - [ИСПРАВЛЕНО]
// @ts-ignore
const API_BASE_URL = 'https://cinemawheels2-backend.aivansolo-spb.workers.dev';

/**
 * (2.0) Главный объект приложения
 */
const app = {
    tg: window.Telegram.WebApp,
    tgUser: window.Telegram.WebApp.initDataUnsafe.user,
    api: null,
    state: {
        currentPage: 'loading',
        user: null, // (4.0) { tg_id, driver_name, role, g_sheet_id }
        formData: { // (5.3)
            vehicles: [],
            trailers: [],
            recentProjects: []
        },
        reports: [], // (5.4)
        currentReport: null, // (5.4)
    },

    /**
     * (2.0) Инициализация
     */
    init() {
        this.tg.ready();
        this.tg.expand();
        
        // (2.0) Инициализируем API-клиент
        this.api = new ApiClient(API_BASE_URL);
        
        // (2.0) Назначаем обработчики событий
        this.bindEvents();

        // (5.1) Запускаем процесс аутентификации
        this.authenticate();
        
        // (5.3) Загружаем черновик
        this.loadDraft();
    },

    /**
     * (2.0) Назначение обработчиков
     */
    bindEvents() {
        // (5.1) Форма регистрации
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // (5.2) Форма смены имени
        document.getElementById('change-name-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangeName();
        });
        
        // (5.3) Форма отчета
        document.getElementById('page-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePreview();
        });
        
        // (5.3) Кнопки очистки полей
        ['trailer', 'overrun', 'comment'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => this.toggleClearButton(id, e.target.value));
            document.getElementById(`clear-${id}`).addEventListener('click', () => this.clearField(id));
        });
        
        // (5.3) Показать/Скрыть время прицепа
        document.getElementById('trailer').addEventListener('input', (e) => {
            document.getElementById('trailer-time-toggle').classList.toggle('hidden', !e.target.value);
            if (!e.target.value) {
                this.hideTrailerTime();
            }
        });

        // (5.3) Сохранение черновика при изменении
        ['date', 'project', 'vehicle', 'address', 'shift_start', 'shift_end', 'trailer', 'trailer_start', 'trailer_end', 'overrun', 'comment'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveDraft());
        });
        
        // (2.0) Кнопка "Назад" в хедере
        document.getElementById('header-back').addEventListener('click', () => this.goBack());
        
        // (2.0) Нативная TWA кнопка "Назад"
        this.tg.onEvent('backButtonClicked', () => this.goBack());
    },
    
    /**
     * (2.0) Навигация
     */
    showPage(pageId) {
        // Скрываем все страницы
        document.querySelectorAll('main > div, main > form').forEach(page => {
            page.classList.add('hidden');
        });
        
        // Показываем нужную
        const page = document.getElementById(`page-${pageId}`);
        if (page) {
            page.classList.remove('hidden');
        }
        
        // Обновляем хедер
        this.updateHeader(pageId);
        
        // Логика при открытии страницы
        switch (pageId) {
            case 'form':
                this.state.currentReport = null; // Сбрасываем редактирование
                document.getElementById('report_id').value = '';
                this.loadDraft(); // Восстанавливаем черновик, если он не для редактирования
                break;
            case 'profile':
                this.updateProfileUI();
                break;
            case 'change-name':
                document.getElementById('new_driver_name').value = this.state.user.driver_name;
                break;
            case 'edit-list':
                this.loadReportsForEdit();
                break;
        }
        
        this.state.currentPage = pageId;
    },
    
    /**
     * (2.0) Обновление хедера
     */
    updateHeader(pageId) {
        const titleEl = document.getElementById('header-title');
        const backEl = document.getElementById('header-back');
        
        const titles = {
            'loading': 'Загрузка...',
            'register': 'Регистрация',
            'form': 'Отчет о смене',
            'profile': 'Профиль',
            'change-name': 'Смена ФИО',
            'edit-list': 'Редактировать отчет',
        };
        
        titleEl.textContent = titles[pageId] || 'Отчеты';
        
        if (pageId === 'form' || pageId === 'loading' || pageId === 'register') {
            backEl.classList.add('hidden');
            this.tg.BackButton.hide();
        } else {
            backEl.classList.remove('hidden');
            this.tg.BackButton.show();
        }
    },
    
    /**
     * (2.0) Навигация "Назад"
     */
    goBack() {
        switch (this.state.currentPage) {
            case 'profile':
            case 'edit-list':
            case 'change-name':
                this.showPage('form');
                break;
            default:
                this.showPage('form');
                break;
        }
    },
    
    /**
     * (5.1) Аутентификация
     */
    async authenticate() {
        if (!this.tgUser || !this.tgUser.id) {
            return this.showAuthError("Не удалось получить ID пользователя Telegram.");
        }
        
        try {
            const response = await this.api.get(`/user/${this.tgUser.id}`);
            
            if (response.error) {
                if (response.error === 'not_found') {
                    // (5.1) (ИЗМЕНЕНО) Пользователя нет в D1. Показываем регистрацию.
                    this.showPage('register');
                    document.getElementById('driver_name').value = `${this.tgUser.first_name || ''} ${this.tgUser.last_name || ''}`.trim();
                } else {
                    // (5.1) Какая-то другая ошибка от бэка
                    this.showAuthError(response.error);
                }
            } else {
                // (5.1) Успешная аутентификация, пользователь найден в D1
                this.state.user = response.data;
                await this.loadInitialData();
                this.showPage('form');
            }
        } catch (e) {
            this.showAuthError(`Ошибка сети: ${e.message}`);
        }
    },

    /**
     * (5.1) Обработка Регистрации
     */
    async handleRegister() {
        const name = document.getElementById('driver_name').value;
        if (!name) return;
        
        // (5.1) Валидация
        if (['техника', 'пользователи', 'admin'].includes(name.toLowerCase())) {
            return this.showToast('Это имя зарезервировано. Введите другое.');
        }
        if (['=', '+', '-', '@'].includes(name[0])) {
            return this.showToast('ФИО не должно начинаться с символов =, +, -, @');
        }

        this.setLoading('register-button', true);

        try {
            const response = await this.api.post('/register', {
                tgId: this.tgUser.id.toString(),
                driverName: name,
                username: this.tgUser.username || ""
            });
            
            if (response.error) {
                this.showToast(response.error);
            } else {
                this.state.user = response.data;
                await this.loadInitialData();
                this.showPage('form');
                this.showToast('Вы успешно зарегистрированы!');
            }
        } catch (e) {
            this.showToast(`Ошибка сети: ${e.message}`);
        } finally {
            this.setLoading('register-button', false);
        }
    },
    
    /**
     * (5.2) Обработка Смены Имени
     */
    async handleChangeName() {
        const newName = document.getElementById('new_driver_name').value;
        if (!newName || newName === this.state.user.driver_name) return;

        // (5.2) Валидация
        if (['техника', 'пользователи', 'admin'].includes(newName.toLowerCase())) {
            return this.showToast('Это имя зарезервировано.');
        }
        if (['=', '+', '-', '@'].includes(newName[0])) {
            return this.showToast('ФИО не должно начинаться с символов =, +, -, @');
        }

        this.setLoading('change-name-button', true);
        
        try {
            const response = await this.api.post('/changeName', {
                tgId: this.state.user.tg_id,
                newName: newName,
            });

            if (response.error) {
                this.showToast(response.error);
            } else {
                this.state.user.driver_name = newName;
                this.updateProfileUI();
                this.showPage('profile');
                this.showToast('Имя успешно изменено!');
            }
        } catch (e) {
            this.showToast(`Ошибка сети: ${e.message}`);
        } finally {
            this.setLoading('change-name-button', false);
        }
    },

    /**
     * (5.1) Показать ошибку авторизации
     */
    showAuthError(message) {
        document.getElementById('loading-text').textContent = message;
        setTimeout(() => {
            document.getElementById('page-loading').classList.add('hidden');
            document.getElementById('modal-auth-error').classList.remove('hidden');
            document.getElementById('auth-error-message').textContent = message;
            document.getElementById('auth-error-tgid').textContent = `Ваш ID: ${this.tgUser.id}`;
        }, 1000);
    },
    
    /**
     * (5.2) Обновить UI Профиля
     */
    updateProfileUI() {
        document.getElementById('profile-name').textContent = this.state.user.driver_name;
        document.getElementById('profile-tg-id').textContent = this.state.user.tg_id;
    },

    /**
     * (5.3) Загрузка данных для форм (техника, проекты)
     */
    async loadInitialData() {
        try {
            const response = await this.api.get('/formData');
            if (response.data) {
                this.state.formData = response.data;
                
                // (5.3) Заполняем селекты
                const vehicleSelect = document.getElementById('vehicle');
                response.data.vehicles.forEach(v => {
                    vehicleSelect.options.add(new Option(v.vehicle_name, v.vehicle_name));
                });
                
                const trailerSelect = document.getElementById('trailer');
                response.data.trailers.forEach(t => {
                    trailerSelect.options.add(new Option(t.vehicle_name, t.vehicle_name));
                });
                
                // (5.3) Заполняем datalist проектов
                const projectList = document.getElementById('project-list');
                response.data.recentProjects.forEach(p => {
                    if (p.project) { // Игнорируем null
                        projectList.options.add(new Option(p.project, p.project));
                    }
                });
            }
        } catch (e) {
            this.showToast('Не удалось загрузить списки техники');
        }
    },
    
    /**
     * (5.3) Показать/Скрыть время прицепа
     */
    toggleTrailerTime() {
        const fields = document.getElementById('trailer-time-fields');
        fields.classList.toggle('hidden');
    },
    hideTrailerTime() {
        const fields = document.getElementById('trailer-time-fields');
        fields.classList.add('hidden');
        document.getElementById('trailer_start').value = '';
        document.getElementById('trailer_end').value = '';
    },

    /**
     * (5.3) Кнопки "Убрать" для полей
     */
    toggleClearButton(id, value) {
        document.getElementById(`clear-${id}`).classList.toggle('hidden', !value);
    },
    clearField(id) {
        const field = document.getElementById(id);
        field.value = '';
        field.dispatchEvent(new Event('input')); // Обновить UI
        field.dispatchEvent(new Event('change')); // Сохранить черновик
    },
    
    /**
     * (5.3) (5.4) Сбор данных с формы
     */
    getFormData() {
        const data = {
            date: document.getElementById('date').value,
            project: document.getElementById('project').value,
            vehicle: document.getElementById('vehicle').value,
            address: document.getElementById('address').value,
            shift_start: document.getElementById('shift_start').value,
            shift_end: document.getElementById('shift_end').value,
            trailer: document.getElementById('trailer').value || null,
            trailer_start: document.getElementById('trailer_start').value || null,
            trailer_end: document.getElementById('trailer_end').value || null,
            overrun: document.getElementById('overrun').value || null,
            comment: document.getElementById('comment').value || null,
        };
        
        // (5.3) Санитизация (на всякий случай, хотя бэк тоже должен)
        data.project = this.sanitize(data.project);
        data.address = this.sanitize(data.address);
        data.comment = this.sanitize(data.comment);
        
        return data;
    },
    
    /**
     * (5.3) Санитизация от = + -
     */
    sanitize(str) {
        if (!str) return str;
        if (['=', '+', '-', '@'].includes(str[0])) {
            return `'${str}`; // Экранируем
        }
        return str;
    },

    /**
     * (5.3) Сохранение черновика
     */
    saveDraft() {
        // (5.4) Не сохраняем черновик, если мы в режиме редактирования
        if (this.state.currentReport) {
            return;
        }
        const data = this.getFormData();
        // (5.3) Используем TWA CloudStorage
        this.tg.CloudStorage.setItem('report_draft', JSON.stringify(data), (err, res) => {
            if (err) console.error("Ошибка сохранения черновика:", err);
        });
    },

    /**
     * (5.3) Загрузка черновика
     */
    loadDraft() {
        this.tg.CloudStorage.getItem('report_draft', (err, value) => {
            if (value) {
                try {
                    const data = JSON.parse(value);
                    this.fillForm(data);
                } catch(e) {
                    console.error("Ошибка парсинга черновика:", e);
                }
            } else {
                // (5.3) Ставим сегодняшнюю дату, если черновика нет
                document.getElementById('date').value = new Date().toISOString().split('T')[0];
            }
        });
    },
    
    /**
     * (5.3) (5.4) Заполнение формы данными
     */
    fillForm(data) {
        document.getElementById('date').value = data.date;
        document.getElementById('project').value = data.project;
        document.getElementById('vehicle').value = data.vehicle;
        document.getElementById('address').value = data.address;
        document.getElementById('shift_start').value = data.shift_start;
        document.getElementById('shift_end').value = data.shift_end;
        document.getElementById('trailer').value = data.trailer || '';
        document.getElementById('overrun').value = data.overrun || '';
        document.getElementById('comment').value = data.comment || '';
        
        // (5.3) Логика отображения полей прицепа
        const hasTrailer = !!data.trailer;
        document.getElementById('trailer-time-toggle').classList.toggle('hidden', !hasTrailer);
        this.toggleClearButton('trailer', data.trailer);
        
        // (5.3) Если время прицепа отличается от смены
        const trailerTimeDiffers = data.trailer_start && data.trailer_start !== data.shift_start;
        if (hasTrailer && trailerTimeDiffers) {
            this.toggleTrailerTime();
            document.getElementById('trailer_start').value = data.trailer_start;
            document.getElementById('trailer_end').value = data.trailer_end;
        } else {
            this.hideTrailerTime();
        }
        
        this.toggleClearButton('overrun', data.overrun);
        this.toggleClearButton('comment', data.comment);
    },

    /**
     * (5.3) Показ Предпросмотра
     */
    handlePreview() {
        const data = this.getFormData();
        const previewHtml = this.generatePreviewHtml(data);
        
        document.getElementById('preview-details').innerHTML = previewHtml;
        
        // (5.4) Логика для Редактирования
        if (this.state.currentReport) {
            document.getElementById('preview-title').textContent = 'Редактирование отчета';
            document.getElementById('modal-confirm-button-text').textContent = 'Отредактировать';
            document.getElementById('preview-reason-container').classList.remove('hidden');
            document.getElementById('edit_reason').value = '';
            
            // (5.4) Подсветка изменений
            const oldData = this.state.currentReport.payload;
            document.querySelectorAll('#preview-details > div').forEach(el => {
                const key = el.dataset.key;
                if (data[key] != oldData[key]) { // != т.к. null vs ""
                    el.classList.add('font-bold');
                    el.querySelector('span').innerHTML += ' (было: ' + (oldData[key] || 'пусто') + ')';
                }
            });

        } else {
        // (5.3) Логика для Нового отчета
            document.getElementById('preview-title').textContent = 'Предпросмотр отчета';
            document.getElementById('modal-confirm-button-text').textContent = 'Отправить';
            document.getElementById('preview-reason-container').classList.add('hidden');
        }
        
        document.getElementById('modal-confirm-button').onclick = () => this.submitReport();
        this.openModal('modal-preview');
    },
    
    /**
     * (5.3) (5.4) Генерация HTML для предпросмотра
     */
    generatePreviewHtml(data) {
        // (5.3) Расчет переработки
        const calcOvertime = (start, end) => {
            if (!start || !end) return 0;
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            
            let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // (5.3) Переход через полночь
            }
            const hours = diffMinutes / 60;
            
            if (hours > 12) {
                return hours - 12;
            }
            return 0;
        };

        const shiftOvertime = calcOvertime(data.shift_start, data.shift_end);
        
        // (5.3) Логика времени прицепа для расчета
        let trailerStart = data.trailer_start;
        let trailerEnd = data.trailer_end;
        if (data.trailer && !data.trailer_start) {
            trailerStart = data.shift_start;
            trailerEnd = data.shift_end;
        }
        const trailerOvertime = calcOvertime(trailerStart, trailerEnd);

        const formatHours = (h) => h > 0 ? `${h.toFixed(1)} ч.` : '0 ч.';

        let html = `
            <div data-key="date">Дата: <span>${data.date}</span></div>
            <div data-key="project">Проект: <span>${data.project}</span></div>
            <div data-key="vehicle">Техника: <span>${data.vehicle}</span></div>
            <div data-key="address">Адрес: <span>${data.address}</span></div>
            <hr>
            <div data-key="shift_start">Смена: <span>${data.shift_start} - ${data.shift_end}</span></div>
            <div data-key="shift_overtime">Переработка (Смена): <span>${formatHours(shiftOvertime)}</span></div>
        `;

        if (data.trailer) {
            html += `<hr>`;
            html += `<div data-key="trailer">Прицеп: <span>${data.trailer}</span></div>`;
            html += `<div data-key="trailer_start">Время прицепа: <span>${trailerStart} - ${trailerEnd}</span></div>`;
            html += `<div data-key="trailer_overtime">Переработка (Прицеп): <span>${formatHours(trailerOvertime)}</span></div>`;
        }
        
        html += `<hr>`;
        html += `<div data-key="overrun">Перепробег: <span>${data.overrun || 0} км</span></div>`;
        html += `<div data-key="comment">Комментарий: <span>${data.comment || 'Нет'}</span></div>`;
        
        return html;
    },
    
    /**
     * (5.3) (5.4) Отправка отчета (Новый / Редактирование)
     */
    async submitReport() {
        this.setLoading('modal-confirm-button', true);
        this.tg.HapticFeedback.impactOccurred('medium');

        const reportData = this.getFormData();
        
        try {
            let response;
            if (this.state.currentReport) {
                // (5.4) РЕДАКТИРОВАНИЕ
                const reason = document.getElementById('edit_reason').value;
                if (!reason) {
                    this.showToast('Укажите причину редактирования');
                    this.setLoading('modal-confirm-button', false);
                    return;
                }
                response = await this.api.put(`/report/${this.state.currentReport.report_id}`, {
                    tgId: this.state.user.tg_id,
                    reportData: reportData,
                    reason: reason
                });
            } else {
                // (5.3) НОВЫЙ ОТЧЕТ
                response = await this.api.post('/report', {
                    tgId: this.state.user.tg_id,
                    reportData: reportData
                });
            }

            if (response.error) {
                this.showToast(response.error);
            } else {
                // Успех
                this.tg.HapticFeedback.notificationOccurred('success');
                this.closeModal();
                
                if (this.state.currentReport) {
                    this.showToast('Отчет успешно отредактирован!');
                    this.showPage('form'); // Возвращаемся на главную
                } else {
                    this.showToast('Отчет успешно отправлен!');
                    // (5.3) Очистка формы и черновика
                    document.getElementById('page-form').reset();
                    this.tg.CloudStorage.removeItem('report_draft');
                    // (5.3) Ставим сегодняшнюю дату
                    document.getElementById('date').value = new Date().toISOString().split('T')[0];
                }
            }
        } catch (e) {
            this.showToast(`Ошибка сети: ${e.message}`);
            this.tg.HapticFeedback.notificationOccurred('error');
        } finally {
            this.setLoading('modal-confirm-button', false);
        }
    },
    
    /**
     * (5.4) Загрузка отчетов для редактирования
     */
    async loadReportsForEdit() {
        const container = document.getElementById('edit-list-container');
        const loader = document.getElementById('edit-list-loader');
        const empty = document.getElementById('edit-list-empty');
        
        loader.classList.remove('hidden');
        empty.classList.add('hidden');
        // Очистка старых
        container.querySelectorAll('.report-item').forEach(el => el.remove());
        
        try {
            const response = await this.api.get(`/reports/${this.state.user.tg_id}`);
            if (response.data && response.data.length > 0) {
                this.state.reports = response.data;
                
                const df = new Intl.DateTimeFormat('ru', { month: 'short', day: 'numeric' });
                
                response.data.forEach(report => {
                    const date = new Date(report.payload.date);
                    const title = `${df.format(date)} - ${report.payload.project}`;
                    
                    const el = document.createElement('button');
                    el.className = 'btn btn-secondary report-item';
                    el.innerHTML = `
                        <span>${title}</span>
                        ${report.status === 'edited' ? '<span class="text-xs ml-auto" style="color:var(--hint-color)">(ред.)</span>' : ''}
                    `;
                    el.onclick = () => this.openReportForEdit(report.report_id);
                    container.appendChild(el);
                });
            } else {
                empty.classList.remove('hidden');
            }
        } catch (e) {
            this.showToast('Ошибка загрузки отчетов');
        } finally {
            loader.classList.add('hidden');
        }
    },
    
    /**
     * (5.4) Открытие отчета на редактирование
     */
    openReportForEdit(reportId) {
        const report = this.state.reports.find(r => r.report_id === reportId);
        if (!report) return;
        
        this.state.currentReport = report;
        
        // (5.4) Заполняем форму
        this.fillForm(report.payload);
        document.getElementById('report_id').value = report.report_id;
        
        // (5.4) Обновляем хедер
        document.getElementById('header-title').textContent = 'Редактирование';
        
        // (5.4) Меняем кнопку
        document.getElementById('form-submit-button').textContent = 'Предпросмотр изменений';
        
        this.showPage('form');
    },
    
    
    /**
     * (2.0) Утилиты: Модальные окна
     */
    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },
    closeModal() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    },

    /**
     * (2.0) Утилиты: Тост-уведомление
     */
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        this.tg.HapticFeedback.notificationOccurred('error');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },
    
    /**
     * (2.0) Утилиты: Спиннер на кнопках
     */
    setLoading(buttonId, isLoading) {
        const btn = document.getElementById(buttonId);
        const text = document.getElementById(`${buttonId}-text`);
        const spinner = document.getElementById(`${buttonId}-spinner`);
        
        if (isLoading) {
            btn.disabled = true;
            text.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            btn.disabled = false;
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }
};

/**
 * (2.0) Класс для работы с API (Fetch)
 */
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, method = 'GET', data = null) {
        const url = this.baseUrl + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                // (2.0) Ошибки API (400, 500)
                return { error: result.error || `HTTP error ${response.status}` };
            }
            return result; // (2.0) Ожидаем { data: ... } или { error: ... }
            
        } catch (e) {
            // (2.0) Ошибки сети (CORS, DNS, Offline)
            console.error("API Request Error:", e);
            // TypeError: Failed to fetch
            return { error: "Ошибка сети: Не удалось связаться с сервером." };
        }
    }

    get(endpoint) {
        return this.request(endpoint, 'GET');
    }
    post(endpoint, data) {
        return this.request(endpoint, 'POST', data);
    }
    put(endpoint, data) {
        return this.request(endpoint, 'PUT', data);
    }
}

// (2.0) Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});


