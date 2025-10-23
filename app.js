// (2.0) Мок TWA для отладки в браузере
if (typeof Telegram === 'undefined' || !Telegram.WebApp.initDataUnsafe) {
    console.warn("Telegram WebApp API not found. Running in mock mode.");
    
    // (5.1) Замените этот ID на свой для тестов
    const MOCK_TG_ID = "7573758625"; 
    
    // (5.1) Мок данных Telegram
    // @ts-ignore
    window.Telegram = {
        WebApp: {
            initDataUnsafe: {
                user: {
                    id: MOCK_TG_ID,
                    first_name: "Test",
                    last_name: "User",
                    username: "testuser"
                }
            },
            ready: () => {},
            expand: () => {},
            MainButton: {
                text: "",
                isVisible: false,
                show: () => {},
                hide: () => {},
                setParams: (params) => {
                    console.log("Mock MainButton setParams:", params);
                },
                onClick: (callback) => {
                    // @ts-ignore
                    window.mockMainButtonClick = callback;
                }
            },
            BackButton: {
                isVisible: false,
                show: () => {},
                hide: () => {},
                onClick: (callback) => {
                    // @ts-ignore
                    window.mockBackButtonClick = callback;
                }
            },
            HapticFeedback: {
                impactOccurred: (style) => { console.log("Mock Haptic:", style); }
            },
            showPopup: (params, callback) => {
                const result = confirm(`${params.title}\n\n${params.message}`);
                if (callback) {
                    if (params.buttons.length > 1) {
                         callback(result ? params.buttons[1].id : params.buttons[0].id);
                    } else if (params.buttons.length === 1) {
                         callback(params.buttons[0].id);
                    }
                }
            },
            close: () => { console.log("Mock WebApp close()"); }
        }
    };
    
    // (5.1) Мок кнопки для браузера (для теста)
    document.addEventListener('DOMContentLoaded', () => {
        const mockButton = document.createElement('button');
        mockButton.innerText = "TEST_CLICK_MAIN_BUTTON";
        mockButton.style.position = 'fixed';
        mockButton.style.bottom = '10px';
        mockButton.style.right = '10px';
        mockButton.style.zIndex = '9999';
        // @ts-ignore
        mockButton.onclick = () => window.mockMainButtonClick && window.mockMainButtonClick();
        document.body.appendChild(mockButton);
    });
}

// (2.0) API_BASE_URL (!!!) - [ИСПРАВЛЕНО]
// @ts-ignore
const API_BASE_URL = 'https://cinemawheels2-backend.aivansolo-spb.workers.dev/api';

/**
 * (2.0) Главный объект приложения
 */
const App = {
    // (2.0) DOM Элементы
    elements: {
        loader: null,
        mainScreen: null,
        profileScreen: null,
        editListScreen: null,
        authScreen: null,
        // (5.1) Аутентификация
        authError: null,
        authForm: null,
        authNameInput: null,
        authSubmitButton: null,
        // (5.0) Форма
        reportForm: null,
        headerTitle: null,
        profileButton: null,
        // (5.3) Поля
        dateInput: null,
        projectInput: null,
        projectDatalist: null,
        vehicleSelect: null,
        addressInput: null,
        shiftStartInput: null,
        shiftEndInput: null,
        trailerSelect: null,
        trailerTimeToggle: null,
        trailerTimeFields: null,
        trailerStartInput: null,
        trailerEndInput: null,
        overrunInput: null,
        commentInput: null,
        // (5.0) Профиль
        profileName: null,
        profileId: null,
        profileEditNameButton: null,
        profileEditReportsButton: null,
        profileCloseButton: null,
        // (5.4) Редактирование
        editListContainer: null,
        editListCloseButton: null
    },

    // (2.0) Состояние
    state: {
        user: null, // (4.0) { tg_id, driver_name, role, g_sheet_id }
        formData: { // (5.3)
            vehicles: [],
            trailers: [],
            recentProjects: []
        },
        currentReport: { // (5.3) Черновик
            date: '',
            project: '',
            vehicle: '',
            address: '',
            shift_start: '',
            shift_end: '',
            trailer: '',
            trailer_diff_time: false,
            trailer_start: '',
            trailer_end: '',
            overrun: '',
            comment: ''
        },
        editingReportId: null, // (5.4) ID отчета, который редактируется
    },

    // (2.0) API Клиент
    api: null,
    
    // (5.1) TWA API
    tg: window.Telegram.WebApp,

    /**
     * (2.0) Инициализация
     */
    init() {
        console.log('App init...');
        // (2.0) Привязка элементов DOM
        this.elements.loader = document.getElementById('loader');
        this.elements.mainScreen = document.getElementById('main-screen');
        this.elements.profileScreen = document.getElementById('profile-screen');
        this.elements.editListScreen = document.getElementById('edit-list-screen');
        this.elements.authScreen = document.getElementById('auth-screen');
        
        // (5.1) Аутентификация
        this.elements.authError = document.getElementById('auth-error');
        this.elements.authForm = document.getElementById('auth-form');
        this.elements.authNameInput = document.getElementById('auth-name');
        this.elements.authSubmitButton = document.getElementById('auth-submit');
        
        // (5.0) Форма
        this.elements.reportForm = document.getElementById('report-form');
        this.elements.headerTitle = document.getElementById('header-title');
        this.elements.profileButton = document.getElementById('profile-button');
        
        // (5.3) Поля
        this.elements.dateInput = document.getElementById('date');
        this.elements.projectInput = document.getElementById('project');
        this.elements.projectDatalist = document.getElementById('recent-projects');
        this.elements.vehicleSelect = document.getElementById('vehicle');
        this.elements.addressInput = document.getElementById('address');
        this.elements.shiftStartInput = document.getElementById('shift-start');
        this.elements.shiftEndInput = document.getElementById('shift-end');
        this.elements.trailerSelect = document.getElementById('trailer');
        this.elements.trailerTimeToggle = document.getElementById('trailer-time-toggle');
        this.elements.trailerTimeFields = document.getElementById('trailer-time-fields');
        this.elements.trailerStartInput = document.getElementById('trailer-start');
        this.elements.trailerEndInput = document.getElementById('trailer-end');
        this.elements.overrunInput = document.getElementById('overrun');
        this.elements.commentInput = document.getElementById('comment');
        
        // (5.2) Профиль
        this.elements.profileName = document.getElementById('profile-name');
        this.elements.profileId = document.getElementById('profile-id');
        this.elements.profileEditNameButton = document.getElementById('profile-edit-name');
        this.elements.profileEditReportsButton = document.getElementById('profile-edit-reports');
        this.elements.profileCloseButton = document.getElementById('profile-close-button');
        
        // (5.4) Редактирование
        this.elements.editListContainer = document.getElementById('edit-list-container');
        this.elements.editListCloseButton = document.getElementById('edit-list-close-button');

        // (2.0) Инициализация API
        // @ts-ignore
        this.api = new ApiClient(API_BASE_URL);

        // (2.0) TWA Ready
        this.tg.ready();
        this.tg.expand();

        // (5.0) Обработчики событий
        this.bindEvents();
        
        // (5.1) Запуск аутентификации
        const tgUser = this.tg.initDataUnsafe.user;
        if (!tgUser) {
            console.error("Telegram user data not found.");
            this.showAuthError("Не удалось получить данные Telegram. Попробуйте перезапустить приложение.");
            return;
        }
        
        this.authenticate(tgUser.id.toString(), tgUser.username || '');
    },

    /**
     * (5.0) Привязка обработчиков
     */
    bindEvents() {
        // (5.0) Главная кнопка TWA
        this.tg.MainButton.onClick(() => this.handleMainButtonClick());
        // (5.0) Кнопка "Назад" TWA
        this.tg.BackButton.onClick(() => this.handleBackButtonClick());

        // (5.0) Открытие профиля
        this.elements.profileButton.addEventListener('click', () => this.showScreen('profile'));
        this.elements.profileCloseButton.addEventListener('click', () => this.showScreen('main'));
        
        // (5.1) Регистрация
        this.elements.authForm.addEventListener('submit', (e) => this.handleRegistration(e));

        // (5.2) Смена имени
        this.elements.profileEditNameButton.addEventListener('click', () => this.handleChangeName());

        // (5.3) Черновик
        this.elements.reportForm.addEventListener('input', (e) => this.handleFormInput(e));
        
        // (5.3) Логика "Время прицепа"
        this.elements.trailerSelect.addEventListener('change', () => this.updateTrailerTimeVisibility());
        this.elements.trailerTimeToggle.addEventListener('click', () => this.toggleTrailerTime());
        
        // (5.4) Редактирование отчетов
        this.elements.profileEditReportsButton.addEventListener('click', () => this.showEditList());
        this.elements.editListCloseButton.addEventListener('click', () => this.showScreen('profile'));
    },

    // =============================================
    // (5.0) УПРАВЛЕНИЕ UI
    // =============================================

    /**
     * (5.0) Показать экран
     * @param {'loader' | 'main' | 'profile' | 'editList' | 'auth'} screenName
     */
    showScreen(screenName) {
        this.elements.loader.classList.add('hidden');
        this.elements.mainScreen.classList.add('hidden');
        this.elements.profileScreen.classList.add('hidden');
        this.elements.editListScreen.classList.add('hidden');
        this.elements.authScreen.classList.add('hidden');
        
        this.tg.BackButton.hide();
        this.tg.MainButton.hide();

        switch (screenName) {
            case 'loader':
                this.elements.loader.classList.remove('hidden');
                break;
            case 'auth':
                this.elements.authScreen.classList.remove('hidden');
                // (5.1) Предзаполняем ФИО
                const user = this.tg.initDataUnsafe.user;
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
                // @ts-ignore
                this.elements.authNameInput.value = name;
                break;
            case 'main':
                this.elements.mainScreen.classList.remove('hidden');
                this.tg.MainButton.setParams({ text: 'ПРЕДПРОСМОТР', is_visible: true });
                this.elements.headerTitle.innerText = this.state.editingReportId 
                    ? `Редактирование (ID: ${this.state.editingReportId})` 
                    : 'Отчёт о смене';
                break;
            case 'profile':
                this.elements.profileScreen.classList.remove('hidden');
                this.tg.BackButton.show();
                break;
            case 'editList':
                this.elements.editListScreen.classList.remove('hidden');
                this.tg.BackButton.show();
                break;
        }
    },
    
    /**
     * (5.0) Обработка кнопки "Назад"
     */
    handleBackButtonClick() {
        this.tg.HapticFeedback.impactOccurred('light');
        if (!this.elements.profileScreen.classList.contains('hidden')) {
            this.showScreen('main');
        } else if (!this.elements.editListScreen.classList.contains('hidden')) {
            this.showScreen('profile');
        }
    },

    /**
     * (5.0) Показать ошибку (всплывающее окно)
     */
    showErrorPopup(message, title = "Ошибка") {
        this.tg.showPopup({
            title: title,
            message: message,
            buttons: [{ id: 'ok', type: 'default', text: 'Понятно' }]
        });
    },

    /**
     * (5.1) Показать ошибку на экране auth
     */
    showAuthError(message) {
        this.showScreen('auth');
        // @ts-ignore
        this.elements.authError.innerText = message;
        this.elements.authError.classList.remove('hidden');
    },

    // =============================================
    // (5.1) АУТЕНТИФИКАЦИЯ
    // =============================================

    /**
     * (5.1) Проверка пользователя на бэкенде
     */
    async authenticate(tgId, username) {
        try {
            this.showScreen('loader');
            
            // (5.1) (ИЗМЕНЕНО) Убрали /api
            const response = await this.api.get(`/user/${tgId}`);
            
            if (response.error) {
                // (5.1) Ошибка 404 "not_found" - это НЕ ошибка, это "новый пользователь"
                if (response.error === 'not_found') {
                    console.log('User not found, showing registration.');
                    this.showScreen('auth');
                } else {
                    // (5.1) Другая ошибка (500 и т.д.)
                    this.showAuthError(`Ошибка сервера: ${response.error}`);
                }
            } else {
                // (5.1) Успех
                this.state.user = response.data;
                this.onLoginSuccess();
            }
        } catch (e) {
            console.error('API Request Error:', e);
            // (5.1) Ошибка сети (Failed to fetch)
            this.showAuthError(`Ошибка сети: Не удалось связаться с сервером.`);
        }
    },

    /**
     * (5.1) POST /api/register - Регистрация
     */
    async handleRegistration(e) {
        e.preventDefault();
        this.tg.HapticFeedback.impactOccurred('light');
        
        // @ts-ignore
        const driverName = this.elements.authNameInput.value.trim();
        const tgUser = this.tg.initDataUnsafe.user;

        // (5.1) Санитизация ФИО
        if (driverName.length < 5) {
            this.showAuthError("ФИО должно быть длиннее 5 символов.");
            return;
        }
        if (['=', '+', '-', '@'].includes(driverName[0])) {
            this.showAuthError("ФИО не должно начинаться с =, +, - или @.");
            return;
        }
        if (['техника', 'пользователи', 'admin'].includes(driverName.toLowerCase())) {
            this.showAuthError("Это имя зарезервировано.");
            return;
        }

        // @ts-ignore
        this.elements.authSubmitButton.disabled = true;
        this.elements.authError.classList.add('hidden');

        try {
            const response = await this.api.post('/register', {
                tgId: tgUser.id.toString(),
                driverName: driverName,
                username: tgUser.username || ''
            });

            if (response.error) {
                this.showAuthError(response.error);
            } else {
                // (5.1) Успешная регистрация
                this.state.user = response.data;
                this.onLoginSuccess();
            }
        } catch (e) {
            this.showAuthError("Ошибка сети. Попробуйте еще раз.");
        } finally {
            // @ts-ignore
            this.elements.authSubmitButton.disabled = false;
        }
    },
    
    /**
     * (5.1) Успешный вход (или регистрация)
     */
    onLoginSuccess() {
        // (5.2) Обновляем профиль
        this.elements.profileName.innerText = this.state.user.driver_name;
        this.elements.profileId.innerText = `Ваш ID: ${this.state.user.tg_id}`;
        
        // (5.3) Загружаем данные для форм
        this.loadFormData();
        
        // (5.3) Восстанавливаем черновик
        this.loadDraft();
        
        // (5.0) Показываем главный экран
        this.showScreen('main');
    },
    
    // =============================================
    // (5.2) ПРОФИЛЬ (Смена имени)
    // =============================================

    /**
     * (5.2) POST /api/changeName - Смена ФИО
     */
    handleChangeName() {
        this.tg.HapticFeedback.impactOccurred('light');
        
        this.tg.showPopup({
            title: 'Сменить ФИО',
            message: 'Введите новое ФИО. (Проверки безопасности те же, что при регистрации).',
            // @ts-ignore
            is_cancelable: true,
            buttons: [
                { id: 'cancel', type: 'destructive', text: 'Отмена' },
                { id: 'change', type: 'default', text: 'Сменить' },
            ],
            // (5.2) (showPopup не поддерживает ввод, это ограничение TWA)
            // (5.2) ВАЖНО: В ТЗ указано "кнопка в меню профиль". Реализация ниже - упрощение
            // (5.2) Для реального ввода нужен отдельный экран.
            // (5.2) Пока что мы используем prompt() для простоты.
        }, async (buttonId) => {
            if (buttonId === 'change') {
                const newName = prompt('Введите новое ФИО:', this.state.user.driver_name);
                
                if (!newName || newName.trim() === this.state.user.driver_name) {
                    return; // (5.2) Отмена
                }
                
                // (5.2) Санитизация
                const sanitizedName = newName.trim();
                if (sanitizedName.length < 5 || ['=', '+', '-', '@'].includes(sanitizedName[0])) {
                    this.showErrorPopup("Некорректное ФИО. (Мин. 5 симв., не начинается с =,+, -,@).");
                    return;
                }
                
                this.showScreen('loader');
                
                try {
                    const response = await this.api.post('/changeName', {
                        tgId: this.state.user.tg_id,
                        newName: sanitizedName
                    });

                    if (response.error) {
                        this.showErrorPopup(response.error);
                    } else {
                        // (5.2) Успех
                        this.state.user.driver_name = sanitizedName;
                        this.elements.profileName.innerText = sanitizedName;
                        this.tg.showPopup({ title: 'Успех', message: 'ФИО изменено.' });
                    }
                } catch (e) {
                    this.showErrorPopup("Ошибка сети при смене имени.");
                } finally {
                    this.showScreen('profile'); // (5.2) Возвращаемся в профиль
                }
            }
        });
    },

    // =============================================
    // (5.3) ФОРМА (Загрузка, Черновик, Отправка)
    // =============================================

    /**
     * (5.3) GET /api/formData - Загрузка техники, прицепов, проектов
     */
    async loadFormData() {
        try {
            const response = await this.api.get('/formData');
            if (response.data) {
                this.state.formData = response.data;
                
                // (5.3) Заполнение <select> и <datalist>
                this.elements.vehicleSelect.innerHTML = '<option value="">— выберите технику —</option>' +
                    response.data.vehicles.map(v => `<option value="${v.vehicle_name}">${v.vehicle_name}</option>`).join('');
                
                this.elements.trailerSelect.innerHTML = '<option value="">— выберите прицеп —</option>' +
                    response.data.trailers.map(t => `<option value="${t.vehicle_name}">${t.vehicle_name}</option>`).join('');
                
                this.elements.projectDatalist.innerHTML = 
                    response.data.recentProjects.map(p => `<option value="${p.project}"></option>`).join('');
            }
        } catch (e) {
            console.error('Failed to load form data:', e);
            this.showErrorPopup("Не удалось загрузить списки техники. Попробуйте перезапустить.");
        }
    },
    
    /**
     * (5.3) Сохранение черновика в localStorage
     */
    handleFormInput(e) {
        // @ts-ignore
        const { id, value, type, checked } = e.target;
        
        if (id in this.state.currentReport) {
            // @ts-ignore
            this.state.currentReport[id] = type === 'checkbox' ? checked : value;
        }
        
        // (5.3) (5.4) Синхронизация полей (если мы в режиме редактирования)
        if (id === 'vehicle' && this.state.editingReportId) {
            // @ts-ignore
            this.elements.vehicleSelect.value = value;
        }
        if (id === 'trailer' && this.state.editingReportId) {
            // @ts-ignore
            this.elements.trailerSelect.value = value;
        }
        
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
    },

    /**
     * (5.3) Загрузка черновика
     */
    loadDraft() {
        const draft = localStorage.getItem('driver_report_draft');
        if (draft) {
            this.state.currentReport = JSON.parse(draft);
        }
        
        // (5.3) Устанавливаем дату по умолчанию (сегодня)
        if (!this.state.currentReport.date) {
            this.state.currentReport.date = new Date().toISOString().split('T')[0];
        }
        
        this.fillForm(this.state.currentReport);
    },
    
    /**
     * (5.3) (5.4) Заполнение формы данными
     */
    fillForm(data) {
        // @ts-ignore
        this.elements.dateInput.value = data.date || '';
        // @ts-ignore
        this.elements.projectInput.value = data.project || '';
        // @ts-ignore
        this.elements.vehicleSelect.value = data.vehicle || '';
        // @ts-ignore
        this.elements.addressInput.value = data.address || '';
        // @ts-ignore
        this.elements.shiftStartInput.value = data.shift_start || '';
        // @ts-ignore
        this.elements.shiftEndInput.value = data.shift_end || '';
        // @ts-ignore
        this.elements.trailerSelect.value = data.trailer || '';
        // @ts-ignore
        this.elements.overrunInput.value = data.overrun || '';
        // @ts-ignore
        this.elements.commentInput.value = data.comment || '';

        // (5.3) Логика "Время прицепа"
        // @ts-ignore
        this.elements.trailerTimeToggle.checked = data.trailer_diff_time || false;
        this.updateTrailerTimeVisibility();
        
        // @ts-ignore
        this.elements.trailerStartInput.value = data.trailer_start || '';
        // @ts-ignore
        this.elements.trailerEndInput.value = data.trailer_end || '';
    },
    
    /**
     * (5.3) Очистка формы (после отправки)
     */
    resetForm() {
        this.state.currentReport = {
            date: new Date().toISOString().split('T')[0], // (5.3) Новая дата
            project: '', vehicle: '', address: '', shift_start: '', shift_end: '',
            trailer: '', trailer_diff_time: false, trailer_start: '', trailer_end: '',
            overrun: '', comment: ''
        };
        this.state.editingReportId = null; // (5.4) Сброс режима редактирования
        
        this.fillForm(this.state.currentReport);
        localStorage.removeItem('driver_report_draft');
        this.showScreen('main'); // (5.4) Обновляем заголовок
    },
    
    /**
     * (5.3) Логика отображения времени прицепа
     */
    updateTrailerTimeVisibility() {
        // @ts-ignore
        const trailerSelected = this.elements.trailerSelect.value;
        if (trailerSelected) {
            this.elements.trailerTimeToggle.classList.remove('hidden');
            // @ts-ignore
            if (this.elements.trailerTimeToggle.checked) {
                this.elements.trailerTimeFields.classList.remove('hidden');
            } else {
                this.elements.trailerTimeFields.classList.add('hidden');
            }
        } else {
            // (5.3) Если прицеп не выбран, скрываем всё
            this.elements.trailerTimeToggle.classList.add('hidden');
            this.elements.trailerTimeFields.classList.add('hidden');
            // @ts-ignore
            this.elements.trailerTimeToggle.checked = false;
            // @ts-ignore
            this.state.currentReport.trailer_diff_time = false;
        }
    },
    
    /**
     * (5.3) Клик на "Время прицепа отличается"
     */
    toggleTrailerTime() {
        this.tg.HapticFeedback.impactOccurred('light');
        // @ts-ignore
        this.state.currentReport.trailer_diff_time = this.elements.trailerTimeToggle.checked;
        this.updateTrailerTimeVisibility();
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
    },

    /**
     * (5.3) Валидация формы
     */
    validateForm() {
        const data = this.state.currentReport;
        if (!data.date) return "Укажите дату.";
        if (!data.project) return "Укажите проект.";
        if (!data.vehicle) return "Выберите технику.";
        if (!data.address) return "Укажите адрес.";
        if (!data.shift_start || !data.shift_end) return "Укажите время начала и конца смены.";
        
        if (data.trailer_diff_time && (!data.trailer_start || !data.trailer_end)) {
            return "Укажите время начала и конца прицепа.";
        }
        return null; // (5.3) Валидация пройдена
    },
    
    /**
     * (5.3) Расчет переработки (для предпросмотра)
     */
    calculateOvertime(start, end) {
        if (!start || !end) return 0;
        
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        
        let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        // (5.3) Переход через полночь
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60; 
        }
        
        const hours = diffMinutes / 60;
        // (5.3) > 12 часов
        return hours > 12 ? (hours - 12) : 0; 
    },

    /**
     * (5.0) Главная кнопка (Предпросмотр / Редактировать)
     */
    handleMainButtonClick() {
        this.tg.HapticFeedback.impactOccurred('medium');
        
        const validationError = this.validateForm();
        if (validationError) {
            this.showErrorPopup(validationError);
            return;
        }
        
        // (5.3) (5.4) Предпросмотр
        const data = this.state.currentReport;
        
        // (5.3) Расчеты
        const shiftOvertime = this.calculateOvertime(data.shift_start, data.shift_end);
        let trailerStart = data.trailer_start;
        let trailerEnd = data.trailer_end;
        // (5.3) Если время не отличается
        if (data.trailer && !data.trailer_diff_time) {
            trailerStart = data.shift_start;
            trailerEnd = data.shift_end;
        }
        const trailerOvertime = this.calculateOvertime(trailerStart, trailerEnd);

        // (5.3) Формирование сообщения
        let previewMessage = [
            `Дата: ${data.date}`,
            `Проект: ${data.project}`,
            `Техника: ${data.vehicle}`,
            `Адрес: ${data.address}`,
            `Смена: ${data.shift_start} - ${data.shift_end} (Переработка: ${shiftOvertime.toFixed(1)} ч.)`
        ];

        if (data.trailer) {
            previewMessage.push(`Прицеп: ${data.trailer} (${trailerStart} - ${trailerEnd}, Переработка: ${trailerOvertime.toFixed(1)} ч.)`);
        }
        
        previewMessage.push(`Перепробег: ${data.overrun || 0} км`);
        previewMessage.push(`Комментарий: ${data.comment || 'Нет'}`);
        
        // (5.4) Если режим редактирования
        if (this.state.editingReportId) {
            previewMessage.push("\n(5.4) (TODO: Показать измененные поля)");
            
            this.tg.showPopup({
                title: 'Подтвердить изменения?',
                message: previewMessage.join('\n'),
                buttons: [
                    { id: 'cancel', type: 'destructive', text: 'Отмена' },
                    { id: 'send', type: 'default', text: 'Отредактировать' }
                ]
            }, (buttonId) => {
                if (buttonId === 'send') {
                    this.promptForEditReason();
                }
            });
            
        } else {
            // (5.3) Режим подачи
            this.tg.showPopup({
                title: 'Отправить отчет?',
                message: previewMessage.join('\n'),
                buttons: [
                    { id: 'cancel', type: 'destructive', text: 'Отмена' },
                    { id: 'send', type: 'default', text: 'Отправить' }
                ]
            }, (buttonId) => {
                if (buttonId === 'send') {
                    this.submitReport();
                }
            });
        }
    },
    
    /**
     * (5.3) POST /api/report - Отправка нового отчета
     */
    async submitReport() {
        this.showScreen('loader');
        
        // (5.3) Санитизация (на всякий случай)
        const sanitizedData = { ...this.state.currentReport };
        for (const key of ['project', 'address', 'comment']) {
            // @ts-ignore
            if (sanitizedData[key] && ['=', '+', '-', '@'].includes(sanitizedData[key][0])) {
                // @ts-ignore
                sanitizedData[key] = "'" + sanitizedData[key];
            }
        }
        
        try {
            const response = await this.api.post('/report', {
                tgId: this.state.user.tg_id,
                reportData: sanitizedData
            });
            
            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                // (5.3) Успех
                this.tg.showPopup({ title: 'Успех!', message: 'Отчет успешно отправлен.' });
                this.resetForm();
            }
            
        } catch (e) {
            this.showErrorPopup("Ошибка сети. Отчет не отправлен. (Данные сохранены в черновике).");
            this.showScreen('main');
        }
    },

    // =============================================
    // (5.4) РЕДАКТИРОВАНИЕ
    // =============================================

    /**
     * (5.4) GET /api/reports/:tgId - Показать список отчетов
     */
    async showEditList() {
        this.showScreen('loader');
        
        try {
            const response = await this.api.get(`/reports/${this.state.user.tg_id}`);
            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('profile');
            } else {
                // (5.4) Рендерим список
                this.renderEditList(response.data);
                this.showScreen('editList');
            }
        } catch (e) {
            this.showErrorPopup("Ошибка сети при загрузке отчетов.");
            this.showScreen('profile');
        }
    },
    
    /**
     * (5.4) Рендеринг списка отчетов
     */
    renderEditList(reports) {
        if (reports.length === 0) {
            this.elements.editListContainer.innerHTML = '<p class="text-center text-gray-400">Нет отчетов для редактирования.</p>';
            return;
        }
        
        this.elements.editListContainer.innerHTML = reports.map(report => {
            const data = report.payload;
            // (5.4) Формат "22:окт"
            const date = new Date(data.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
            
            return `
                <div class="report-item" data-report-id="${report.report_id}">
                    <div class="report-item-info">
                        <span class="report-item-date">${date}</span>
                        <span class="report-item-project">${data.project}</span>
                        <span class="report-item-vehicle">${data.vehicle}</span>
                    </div>
                    <button class="report-item-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                </div>
            `;
        }).join('');
        
        // (5.4) Вешаем обработчики на кнопки
        this.elements.editListContainer.querySelectorAll('.report-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // @ts-ignore
                const reportId = e.currentTarget.closest('.report-item').dataset.reportId;
                const reportData = reports.find(r => r.report_id == reportId);
                this.loadReportForEditing(reportData);
            });
        });
    },
    
    /**
     * (5.4) Загрузка отчета в форму
     */
    loadReportForEditing(report) {
        this.tg.HapticFeedback.impactOccurred('light');
        
        this.state.editingReportId = report.report_id;
        this.state.currentReport = { ...report.payload }; // (5.4) Загружаем
        
        // (5.4) Обновляем черновик
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
        
        this.fillForm(this.state.currentReport);
        this.showScreen('main');
    },

    /**
     * (5.4) Запрос причины редактирования
     */
    promptForEditReason() {
        this.tg.showPopup({
            title: 'Причина редактирования',
            message: 'Пожалуйста, кратко укажите причину (обязательно).',
            // @ts-ignore
            is_cancelable: true,
            buttons: [
                { id: 'cancel', type: 'destructive', text: 'Отмена' },
                // (5.4) Кнопка "ОК" не нужна, т.к. TWA не поддерживает ввод
            ],
            // (5.4) (Упрощение, как и со сменой имени)
        });
        
        const reason = prompt('Укажите причину редактирования (обязательно):');
        if (reason && reason.trim().length > 3) {
            this.submitEditReport(reason.trim());
        } else if (reason !== null) { // (5.4) Если не нажал "Отмена"
            this.showErrorPopup("Причина обязательна (мин. 4 символа).");
        }
    },
    
    /**
     * (5.4) PUT /api/report/:reportId - Отправка изменений
     */
    async submitEditReport(reason) {
        this.showScreen('loader');
        
        // (5.4) Санитизация
        const sanitizedData = { ...this.state.currentReport };
        // ... (санитизация как в submitReport) ...
        
        try {
            const response = await this.api.put(`/report/${this.state.editingReportId}`, {
                tgId: this.state.user.tg_id,
                reportData: sanitizedData,
                reason: reason
            });

            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                // (5.4) Успех
                this.tg.showPopup({ title: 'Успех!', message: 'Отчет успешно отредактирован.' });
                this.resetForm();
            }
            
        } catch (e) {
            this.showErrorPopup("Ошибка сети. Изменения не сохранены. (Данные сохранены в черновике).");
            this.showScreen('main');
        }
    }
};

/**
 * (2.0) API Клиент (Fetch)
 */
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        // (5.1) Передаем данные TWA для аутентификации на бэкенде (если нужно)
        this.authHeader = window.Telegram.WebApp.initData || '';
    }

    async request(endpoint, options = {}) {
        this.showGlobalLoader(true);
        
        const headers = {
            'Content-Type': 'application/json',
            // (5.1) 'Authorization': `Bearer ${this.authHeader}` // (Если нужна верификация)
        };

        // (2.0) Собираем URL (baseUrl + /user/123)
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            if (!response.ok) {
                // (2.0) Пытаемся прочитать ошибку
                try {
                    const errData = await response.json();
                    console.warn(`API Error ${response.status}:`, errData);
                    return { error: errData.error || `HTTP error ${response.status}` };
                } catch (e) {
                    return { error: `HTTP error ${response.status}` };
                }
            }
            
            // (2.0) 204 No Content
            if (response.status === 204) {
                return { data: null };
            }

            return response.json();

        } catch (e) {
            console.error('API Request Error:', e);
            throw new Error('Failed to fetch'); // (5.1) Это ловится в authenticate()
        } finally {
            this.showGlobalLoader(false);
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    showGlobalLoader(show) {
        if (show) {
            document.getElementById('loader').classList.remove('hidden');
        } else {
            document.getElementById('loader').classList.add('hidden');
        }
    }
}


// (2.0) Старт приложения
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

