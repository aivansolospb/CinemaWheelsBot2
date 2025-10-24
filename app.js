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
            initData: '', // Добавим для обратной совместимости
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
                impactOccurred: (style) => { console.log("Mock Haptic:", style); },
                notificationOccurred: (type) => { console.log("Mock Haptic Notify:", type); } // Добавлен мок
            },
            // [ИЗМЕНЕНО] Оставляем showErrorPopup для простых ошибок
            showPopup: (params, callback) => {
                alert(`${params.title}\n\n${params.message}`);
                if (callback) callback('ok');
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
        adminIndicator: null, // [НОВОЕ]
        // (5.3) Поля
        dateInput: null,
        projectInput: null,
        projectDatalist: null,
        vehicleSelect: null,
        addressInput: null,
        shiftStartInput: null,
        shiftEndInput: null,
        trailerSelect: null,
        trailerTimeToggleLabel: null,
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
        editListCloseButton: null,
        // Модальное окно предпросмотра
        modalOverlay: null,
        modal: null,
        modalTitle: null,
        modalBody: null,
        modalCancelButton: null,
        modalConfirmButton: null,
        toast: null,
        // Модальное окно смены имени
        changeNameModalOverlay: null,
        changeNameModal: null,
        changeNameInput: null,
        changeNameError: null,
        changeNameCancelButton: null,
        changeNameConfirmButton: null,
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
        console.log('[LOG] App.init() started.'); // [ЛОГ] Начало инициализации
        try {
            console.log('[LOG] Binding DOM elements...'); // [ЛОГ] Привязка элементов
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
            this.elements.adminIndicator = document.getElementById('admin-indicator'); // [НОВОЕ]

            // (5.3) Поля
            this.elements.dateInput = document.getElementById('date');
            this.elements.projectInput = document.getElementById('project');
            this.elements.projectDatalist = document.getElementById('recent-projects');
            this.elements.vehicleSelect = document.getElementById('vehicle');
            this.elements.addressInput = document.getElementById('address');
            this.elements.shiftStartInput = document.getElementById('shift_start');
            this.elements.shiftEndInput = document.getElementById('shift_end');
            this.elements.trailerSelect = document.getElementById('trailer');
            this.elements.trailerTimeToggleLabel = document.getElementById('trailer-time-toggle-label');
            this.elements.trailerTimeToggle = document.getElementById('trailer_diff_time');
            this.elements.trailerTimeFields = document.getElementById('trailer-time-fields');
            this.elements.trailerStartInput = document.getElementById('trailer_start');
            this.elements.trailerEndInput = document.getElementById('trailer_end');
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

            // Модальное окно предпросмотра
            this.elements.modalOverlay = document.getElementById('modal-overlay');
            this.elements.modal = document.getElementById('modal');
            this.elements.modalTitle = document.getElementById('modal-title');
            this.elements.modalBody = document.getElementById('modal-body');
            this.elements.modalCancelButton = document.getElementById('modal-cancel-btn');
            this.elements.modalConfirmButton = document.getElementById('modal-confirm-btn');
            this.elements.toast = document.getElementById('toast');

            // Модальное окно смены имени
            this.elements.changeNameModalOverlay = document.getElementById('change-name-modal-overlay');
            this.elements.changeNameModal = document.getElementById('change-name-modal');
            this.elements.changeNameInput = document.getElementById('change-name-input');
            this.elements.changeNameError = document.getElementById('change-name-error');
            this.elements.changeNameCancelButton = document.getElementById('change-name-cancel-btn');
            this.elements.changeNameConfirmButton = document.getElementById('change-name-confirm-btn');

            console.log('[LOG] DOM elements bound successfully.'); // [ЛОГ] Элементы привязаны

            // (2.0) Инициализация API
            console.log('[LOG] Initializing API client...'); // [ЛОГ] Инициализация API
            // @ts-ignore
            this.api = new ApiClient(API_BASE_URL);
            console.log('[LOG] API client initialized.'); // [ЛОГ] API инициализирован

            // (2.0) TWA Ready
            console.log('[LOG] Calling Telegram.WebApp.ready()...'); // [ЛОГ] TWA ready
            this.tg.ready();
            console.log('[LOG] Calling Telegram.WebApp.expand()...'); // [ЛОГ] TWA expand
            this.tg.expand();

            // (5.0) Обработчики событий
            console.log('[LOG] Binding event listeners...'); // [ЛОГ] Привязка событий
            this.bindEvents();
            console.log('[LOG] Event listeners bound.'); // [ЛОГ] События привязаны

            // (5.1) Запуск аутентификации
            console.log('[LOG] Getting Telegram user data...'); // [ЛОГ] Получение данных TG
            const tgUser = this.tg.initDataUnsafe.user;
            if (!tgUser) {
                console.error("[ERROR] Telegram user data not found.");
                this.showAuthError("Не удалось получить данные Telegram. Попробуйте перезапустить приложение.");
                return;
            }
            console.log('[LOG] Telegram user data found:', tgUser); // [ЛОГ] Данные TG получены

            console.log('[LOG] Starting authentication...'); // [ЛОГ] Начало аутентификации
            this.authenticate(tgUser.id.toString(), tgUser.username || '');

        } catch (error) {
             console.error("[CRITICAL ERROR] Initialization failed:", error); // [ЛОГ] КРИТИЧЕСКАЯ ОШИБКА
             // Показываем сообщение об ошибке пользователю
             if(this.elements.loader) this.elements.loader.classList.add('hidden'); // Пытаемся скрыть лоадер
             document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--error-color);">Критическая ошибка при запуске приложения: ${error.message}. Обратитесь к администратору.</div>`;
        }
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

        // (5.2) Смена имени - Открывает модалку
        this.elements.profileEditNameButton.addEventListener('click', () => this.showChangeNameModal());

        // (5.3) Черновик
        this.elements.reportForm.addEventListener('input', (e) => this.handleFormInput(e));

        // Ограничение ввода для Перепробега
        this.elements.overrunInput.addEventListener('input', (e) => this.handleOverrunInput(e));

        // (5.3) Логика "Время прицепа"
        this.elements.trailerSelect.addEventListener('change', () => this.updateTrailerTimeVisibility());
        this.elements.trailerTimeToggle.addEventListener('change', () => this.toggleTrailerTime());

        // (5.4) Редактирование отчетов
        this.elements.profileEditReportsButton.addEventListener('click', () => this.showEditList());
        this.elements.editListCloseButton.addEventListener('click', () => this.showScreen('profile'));

        // Обработчики модального окна предпросмотра
        this.elements.modalCancelButton.addEventListener('click', () => this.hidePreviewModal());
        this.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.hidePreviewModal();
            }
        });

        // Обработчики модального окна смены имени
        this.elements.changeNameCancelButton.addEventListener('click', () => this.hideChangeNameModal());
        this.elements.changeNameConfirmButton.addEventListener('click', () => this.handleChangeName()); // Теперь кнопка вызывает handleChangeName
        this.elements.changeNameModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.changeNameModalOverlay) {
                this.hideChangeNameModal();
            }
        });
    },

    // =============================================
    // (5.0) УПРАВЛЕНИЕ UI
    // =============================================

    /**
     * (5.0) Показать экран
     * @param {'loader' | 'main' | 'profile' | 'editList' | 'auth'} screenName
     */
    showScreen(screenName) {
        console.log(`[LOG] showScreen called with: ${screenName}`); // [ЛОГ] Смена экрана
        if (!this.elements.loader) { // Доп. проверка, если элементы еще не привязаны
            console.error("[ERROR] Trying to show screen before elements are bound.");
            return;
        }
        this.elements.loader.classList.add('hidden');
        this.elements.mainScreen.classList.add('hidden');
        this.elements.profileScreen.classList.add('hidden');
        this.elements.editListScreen.classList.add('hidden');
        this.elements.authScreen.classList.add('hidden');
        this.elements.modalOverlay.classList.add('hidden');
        this.elements.changeNameModalOverlay.classList.add('hidden');

        this.tg.BackButton.hide();
        this.tg.MainButton.hide();

        switch (screenName) {
            case 'loader':
                this.elements.loader.classList.remove('hidden');
                break;
            case 'auth':
                this.elements.authScreen.classList.remove('hidden');
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
        console.log(`[LOG] Screen ${screenName} shown.`); // [ЛОГ] Экран показан
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
     * Оставляем tg.showPopup для *критических* ошибок (сеть, сервер)
     */
    showErrorPopup(message, title = "Ошибка") {
        console.warn(`[POPUP ERROR] ${title}: ${message}`); // [ЛОГ] Показ ошибки
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
        console.error(`[AUTH ERROR] ${message}`); // [ЛОГ] Ошибка аутентификации
        this.showScreen('auth');
        // @ts-ignore
        this.elements.authError.innerText = message;
        this.elements.authError.classList.remove('hidden');
    },

    // Показ тост-уведомления
    showToast(message, type = 'success') {
        console.log(`[TOAST] ${type}: ${message}`);
        this.elements.toast.innerText = message;
        this.elements.toast.className = ''; // Очищаем старые классы
        this.elements.toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
        this.elements.toast.classList.add('show');

        // Скрываем через 3 секунды
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3000);
    },

    // Снятие выделения ошибок валидации
    clearValidationErrors() {
        const fields = [
            this.elements.dateInput,
            this.elements.projectInput,
            this.elements.vehicleSelect,
            this.elements.addressInput,
            this.elements.shiftStartInput,
            this.elements.shiftEndInput,
            this.elements.trailerStartInput,
            this.elements.trailerEndInput,
            this.elements.overrunInput,
            this.elements.changeNameInput
        ];
        fields.forEach(el => {
            if (el) {
                el.classList.remove('input-error');
                el.classList.remove('shake-animation');
            }
        });
        if(this.elements.changeNameError) { // Добавлена проверка
             this.elements.changeNameError.classList.add('hidden');
        }
    },

    // Показ модального окна предпросмотра
    showPreviewModal(title, message, confirmText, onConfirm) {
        console.log('[LOG] showPreviewModal called.');
        this.elements.modalTitle.innerText = title;
        this.elements.modalBody.innerText = message;

        const newConfirmBtn = this.elements.modalConfirmButton.cloneNode(true);
        // @ts-ignore
        newConfirmBtn.innerText = confirmText;

        newConfirmBtn.addEventListener('click', () => {
            console.log('[LOG] Modal confirm clicked.');
            this.tg.HapticFeedback.impactOccurred('medium');
            onConfirm();
            this.hidePreviewModal();
        });

        this.elements.modalConfirmButton.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirmButton);
        this.elements.modalConfirmButton = newConfirmBtn;

        this.elements.modalOverlay.classList.remove('hidden');
        this.tg.MainButton.hide();
    },

    // Скрытие модального окна предпросмотра
    hidePreviewModal() {
        console.log('[LOG] hidePreviewModal called.');
        this.elements.modalOverlay.classList.add('hidden');
        if (!this.elements.mainScreen.classList.contains('hidden')) {
             this.tg.MainButton.show();
        }
    },

    // Показ модального окна смены имени
    showChangeNameModal() {
        console.log('[LOG] showChangeNameModal called.');
        this.tg.HapticFeedback.impactOccurred('light');
        // @ts-ignore
        this.elements.changeNameInput.value = this.state.user.driver_name;
        this.clearValidationErrors();
        this.elements.changeNameModalOverlay.classList.remove('hidden');
        this.tg.BackButton.hide();
    },

    // Скрытие модального окна смены имени
    hideChangeNameModal() {
        console.log('[LOG] hideChangeNameModal called.');
        this.elements.changeNameModalOverlay.classList.add('hidden');
        if (!this.elements.profileScreen.classList.contains('hidden')) {
             this.tg.BackButton.show();
        }
    },

    // =============================================
    // (5.1) АУТЕНТИФИКАЦИЯ
    // =============================================

    /**
     * (5.1) Проверка пользователя на бэкенде
     */
    async authenticate(tgId, username) {
        console.log(`[LOG] authenticate(${tgId}, ${username}) called.`); // [ЛОГ] Вызов authenticate
        try {
            this.showScreen('loader');
            console.log(`[LOG] Sending GET /user/${tgId} request...`); // [ЛОГ] Отправка запроса
            const response = await this.api.get(`/user/${tgId}`);
            console.log('[LOG] API response received:', response); // [ЛОГ] Ответ получен

            if (response.error) {
                if (response.error === 'not_found') {
                    console.log('[LOG] User not found by API, showing registration screen.'); // [ЛОГ] Пользователь не найден
                    this.showScreen('auth');
                } else {
                    console.error('[ERROR] API returned error during authentication:', response.error); // [ЛОГ] Ошибка API
                    this.showAuthError(`Ошибка сервера: ${response.error}`);
                }
            } else {
                console.log('[LOG] Authentication successful, user data:', response.data); // [ЛОГ] Успешная аутентификация
                // Используем onLoginSuccess с передачей данных
                this.onLoginSuccess(response.data);
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during authentication:', e); // [ЛОГ] Ошибка сети
            this.showAuthError(`Ошибка сети: Не удалось связаться с сервером.`);
        }
    },

    /**
     * [ИЗМЕНЕНО] (5.1) POST /api/register - Регистрация
     */
    async handleRegistration(e) {
        e.preventDefault();
        this.tg.HapticFeedback.impactOccurred('light');
        console.log('[LOG] handleRegistration() called.'); // [ЛОГ] Начало регистрации

        // @ts-ignore
        const driverName = this.elements.authNameInput.value.trim();
        const tgUser = this.tg.initDataUnsafe.user;

        console.log('[LOG] Validating driver name:', driverName); // [ЛОГ] Валидация имени
        // ... (валидация имени осталась без изменений) ...
        if (driverName.length < 5) { this.showAuthError("ФИО должно быть длиннее 5 символов."); return; }
        if (['=', '+', '-', '@'].includes(driverName[0])) { this.showAuthError("ФИО не должно начинаться с =, +, - или @."); return; }
        if (['техника', 'пользователи', 'admin'].includes(driverName.toLowerCase())) { this.showAuthError("Это имя зарезервировано."); return; }
        console.log('[LOG] Driver name validation passed.');

        // @ts-ignore
        this.elements.authSubmitButton.disabled = true;
        this.elements.authError.classList.add('hidden');

        try {
            console.log('[LOG] Sending POST /register request...'); // [ЛОГ] Отправка запроса регистрации
            const response = await this.api.post('/register', {
                tgId: tgUser.id.toString(),
                driverName: driverName,
                username: tgUser.username || ''
            });
            console.log('[LOG] Registration API response:', response); // [ЛОГ] Ответ на регистрацию

            if (response.error) {
                // Если ошибка - НЕ UNIQUE constraint (например, "имя занято")
                if (!response.details || !response.details.cause || !response.details.cause.includes('UNIQUE constraint failed')) {
                     this.showAuthError(response.error);
                } else {
                     // Если это ошибка UNIQUE constraint (пользователь уже есть),
                     // просто перезагружаем, чтобы залогиниться.
                     console.warn('[LOG] User already exists (UNIQUE constraint failed). Reloading to login...');
                     location.reload();
                }
            } else {
                console.log('[LOG] Registration successful. Reloading page...'); // [ЛОГ] Успешная регистрация, перезагрузка
                // [ИЗМЕНЕНО] Вместо onLoginSuccess, перезагружаем страницу
                location.reload();
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during registration:', e); // [ЛОГ] Ошибка регистрации
            this.showAuthError("Ошибка сети. Попробуйте еще раз.");
        } finally {
            // @ts-ignore
            // [ИЗМЕНЕНО] Кнопка разблокируется только если не было перезагрузки
            if (!location.reload) {
                this.elements.authSubmitButton.disabled = false;
            }
            console.log('[LOG] Registration process finished.'); // [ЛОГ] Конец регистрации
        }
    },

    /**
     * [ИЗМЕНЕНО] (5.1) Успешный вход (или регистрация)
     * @param {object} userData - Данные пользователя, полученные от API
     */
    onLoginSuccess(userData) {
        console.log('[LOG] onLoginSuccess() called with user data:', userData); // [ЛОГ] Успешный вход с данными
        if (!userData || !userData.driver_name) {
             console.error('[CRITICAL ERROR] onLoginSuccess received invalid user data:', userData);
             this.showAuthError('Ошибка: получены некорректные данные пользователя.');
             return;
        }

        // Устанавливаем состояние И используем переданные данные для UI
        this.state.user = userData;
        this.elements.profileName.innerText = userData.driver_name;
        this.elements.profileId.innerText = `Ваш ID: ${userData.tg_id}`;

        console.log('[LOG] State updated, user name set in profile:', this.state.user.driver_name); // [ЛОГ] Имя в профиле обновлено

        // [НОВОЕ] Показываем индикатор админа, если роль = admin
        if (userData.role === 'admin') {
            console.log('[LOG] User is admin. Showing admin indicator.');
            this.elements.adminIndicator.classList.remove('hidden');
        } else {
            this.elements.adminIndicator.classList.add('hidden');
        }

        console.log('[LOG] Loading form data...'); // [ЛОГ] Загрузка данных формы
        this.loadFormData();
        console.log('[LOG] Loading draft...'); // [ЛОГ] Загрузка черновика
        this.loadDraft();
        console.log('[LOG] Showing main screen.'); // [ЛОГ] Показ главного экрана
        this.showScreen('main');
    },

    // =============================================
    // (5.2) ПРОФИЛЬ (Смена имени)
    // =============================================

    /**
     * (5.2) POST /api/changeName - Смена ФИО (вызывается из модалки)
     */
    async handleChangeName() {
        this.tg.HapticFeedback.impactOccurred('light');
        console.log('[LOG] handleChangeName() called from modal.');

        // @ts-ignore
        const newName = this.elements.changeNameInput.value.trim();
        console.log('[LOG] New name entered:', newName);

        this.clearValidationErrors();

        if (!newName || newName === this.state.user.driver_name) {
            console.log('[LOG] Name change cancelled or name not changed.');
            this.hideChangeNameModal();
            return;
        }

        const sanitizedName = newName;
        console.log('[LOG] Validating new name:', sanitizedName);

        let validationError = null;
        if (sanitizedName.length < 5) {
             validationError = "Некорректное ФИО. (Мин. 5 симв.).";
        } else if (['=', '+', '-', '@'].includes(sanitizedName[0])) {
             validationError = "Некорректное ФИО. (Не начинается с =,+, -,@).";
        }

        if (validationError) {
             console.warn('[VALIDATION] Name change failed:', validationError);
             this.tg.HapticFeedback.notificationOccurred('error');
             // @ts-ignore
             this.elements.changeNameError.innerText = validationError;
             this.elements.changeNameError.classList.remove('hidden');
             this.elements.changeNameInput.classList.add('input-error');
             return;
        }

        console.log('[LOG] New name validation passed.');

        this.hideChangeNameModal();
        this.showScreen('loader');

        try {
            console.log('[LOG] Sending POST /changeName request...');
            const response = await this.api.post('/changeName', {
                tgId: this.state.user.tg_id,
                newName: sanitizedName
            });
             console.log('[LOG] Change name API response:', response);

            if (response.error) {
                if (response.error === 'Это ФИО уже занято') {
                    this.showToast(response.error, 'error');
                } else {
                    this.showErrorPopup(response.error);
                }
            } else {
                console.log('[LOG] Name change successful.');
                this.state.user.driver_name = sanitizedName;
                this.elements.profileName.innerText = sanitizedName;
                this.showToast('ФИО изменено.');
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during name change:', e);
            this.showErrorPopup("Ошибка сети при смене имени.");
        } finally {
            console.log('[LOG] Returning to profile screen after name change attempt.');
            // Убедимся, что возвращаемся именно в профиль
            this.showScreen('profile');
        }
    },


    // =============================================
    // (5.3) ФОРМА (Загрузка, Черновик, Отправка)
    // =============================================

    /**
     * (5.3) GET /api/formData - Загрузка техники, прицепов, проектов
     */
    async loadFormData() {
        console.log('[LOG] loadFormData() called.'); // [ЛОГ] Начало загрузки данных формы
        try {
            const response = await this.api.get('/formData');
            console.log('[LOG] Form data API response:', response); // [ЛОГ] Ответ данных формы

            if (response.data) {
                this.state.formData = response.data;

                console.log('[LOG] Populating vehicle select...'); // [ЛОГ] Заполнение техники
                this.elements.vehicleSelect.innerHTML = '<option value="">— выберите технику —</option>' +
                    response.data.vehicles.map(v => `<option value="${v.vehicle_name}">${v.vehicle_name}</option>`).join('');

                console.log('[LOG] Populating trailer select...'); // [ЛОГ] Заполнение прицепов
                this.elements.trailerSelect.innerHTML = '<option value="">— выберите прицеп —</option>' +
                    response.data.trailers.map(t => `<option value="${t.vehicle_name}">${t.vehicle_name}</option>`).join('');

                console.log('[LOG] Populating project datalist...'); // [ЛОГ] Заполнение проектов
                this.elements.projectDatalist.innerHTML =
                    response.data.recentProjects.map(p => `<option value="${p.project}"></option>`).join('');
                console.log('[LOG] Form data loaded and populated.'); // [ЛОГ] Данные формы загружены
            } else if (response.error) {
                throw new Error(response.error);
            }
        } catch (e) {
            console.error('[ERROR] Failed to load form data:', e); // [ЛОГ] Ошибка загрузки данных формы
            this.showErrorPopup("Не удалось загрузить списки техники. Попробуйте перезапустить.");
        }
    },

    /**
     * (5.3) Сохранение черновика в localStorage (кроме overrun, он обрабатывается отдельно)
     */
    handleFormInput(e) {
        // @ts-ignore
        const { id, value, type, checked } = e.target;

        if (id === 'overrun') return;

        if (id in this.state.currentReport) {
            // @ts-ignore
            this.state.currentReport[id] = type === 'checkbox' ? checked : value;
        } else {
            // console.warn(`Element with ID "${id}" not found in state.currentReport`);
        }
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
    },

    /**
     * Обработчик ввода для поля "Перепробег"
     */
    handleOverrunInput(e) {
        // @ts-ignore
        let value = e.target.value;

        if (value !== '') {
            value = value.replace(/[^0-9]/g, '');
        }

        const numValue = parseInt(value, 10);

        if (!isNaN(numValue) && numValue > 9999) {
            value = '9999';
        } else if (isNaN(numValue) && value !== '') {
             value = '';
        } else if (value.length > 4) {
            value = value.slice(0, 4);
        }

        // @ts-ignore
        e.target.value = value;

        this.state.currentReport.overrun = value;
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
    },

    /**
     * (5.3) Загрузка черновика
     */
    loadDraft() {
        console.log('[LOG] loadDraft() called.'); // [ЛОГ] Начало загрузки черновика
        const draft = localStorage.getItem('driver_report_draft');
        if (draft) {
             console.log('[LOG] Draft found in localStorage.'); // [ЛОГ] Черновик найден
             try {
                 const parsedDraft = JSON.parse(draft);
                 if (parsedDraft && typeof parsedDraft === 'object') {
                     console.log('[LOG] Parsing draft successful:', parsedDraft); // [ЛОГ] Парсинг успешен
                     for (const key in this.state.currentReport) {
                        // @ts-ignore
                         if (parsedDraft.hasOwnProperty(key)) {
                            // @ts-ignore
                             this.state.currentReport[key] = parsedDraft[key];
                         }
                     }
                 } else {
                      console.warn("[WARN] Invalid draft found in localStorage:", parsedDraft); // [ЛОГ] Невалидный черновик
                      localStorage.removeItem('driver_report_draft');
                 }
            } catch (error) {
                 console.error("[ERROR] Failed to parse draft from localStorage:", error); // [ЛОГ] Ошибка парсинга
                 localStorage.removeItem('driver_report_draft');
            }
        } else {
            console.log('[LOG] No draft found in localStorage.'); // [ЛОГ] Черновик не найден
        }

        if (!this.state.currentReport.date) {
            console.log('[LOG] Setting default date.'); // [ЛОГ] Установка даты по умолчанию
            this.state.currentReport.date = new Date().toISOString().split('T')[0];
        }

        console.log('[LOG] Filling form with current report state:', this.state.currentReport); // [ЛОГ] Заполнение формы
        this.fillForm(this.state.currentReport);
    },

    /**
     * (5.3) (5.4) Заполнение формы данными
     */
    fillForm(data) {
        console.log('[LOG] fillForm() called with data:', data); // [ЛОГ] Начало fillForm
        try {
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
            // @ts-ignore
            this.elements.trailerTimeToggle.checked = data.trailer_diff_time || false;
            this.updateTrailerTimeVisibility(); // Важно вызвать после установки checkbox
            // @ts-ignore
            this.elements.trailerStartInput.value = data.trailer_start || '';
            // @ts-ignore
            this.elements.trailerEndInput.value = data.trailer_end || '';
            console.log('[LOG] Form filled successfully.'); // [ЛОГ] Форма заполнена
        } catch (error) {
            console.error('[ERROR] Error during fillForm:', error); // [ЛОГ] Ошибка fillForm
        }
    },

    /**
     * (5.3) Очистка формы (после отправки)
     */
    resetForm() {
        console.log('[LOG] resetForm() called.'); // [ЛОГ] Сброс формы
        this.state.currentReport = {
            date: new Date().toISOString().split('T')[0],
            project: '', vehicle: '', address: '', shift_start: '', shift_end: '',
            trailer: '', trailer_diff_time: false, trailer_start: '', trailer_end: '',
            overrun: '', comment: ''
        };
        this.state.editingReportId = null;
        this.fillForm(this.state.currentReport);
        localStorage.removeItem('driver_report_draft');
        this.showScreen('main');
    },

    /**
     * (5.3) Логика отображения времени прицепа
     */
    updateTrailerTimeVisibility() {
        // @ts-ignore
        const trailerSelected = this.elements.trailerSelect.value;
        if (trailerSelected) {
            this.elements.trailerTimeToggleLabel.classList.remove('hidden');
            // @ts-ignore
            if (this.elements.trailerTimeToggle.checked) {
                this.elements.trailerTimeFields.classList.remove('hidden');
            } else {
                this.elements.trailerTimeFields.classList.add('hidden');
            }
        } else {
            this.elements.trailerTimeToggleLabel.classList.add('hidden');
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
        console.log('[LOG] toggleTrailerTime() called.'); // [ЛОГ] Переключение времени прицепа
        this.tg.HapticFeedback.impactOccurred('light');
        // @ts-ignore
        this.state.currentReport.trailer_diff_time = this.elements.trailerTimeToggle.checked;
        this.updateTrailerTimeVisibility();
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
    },

    /**
     * (5.3) Валидация формы (возвращает массив элементов)
     */
    validateForm() {
        console.log('[LOG] validateForm() called.'); // [ЛОГ] Валидация формы
        const data = this.state.currentReport;
        const errors = []; // Массив элементов с ошибками

        if (!data.date) { console.warn('[VALIDATION] Date missing.'); errors.push(this.elements.dateInput); }
        if (!data.project) { console.warn('[VALIDATION] Project missing.'); errors.push(this.elements.projectInput); }
        if (!data.vehicle) { console.warn('[VALIDATION] Vehicle missing.'); errors.push(this.elements.vehicleSelect); }
        if (!data.address) { console.warn('[VALIDATION] Address missing.'); errors.push(this.elements.addressInput); }

        if (!data.shift_start) { console.warn('[VALIDATION] Shift start missing.'); errors.push(this.elements.shiftStartInput); }
        if (!data.shift_end) { console.warn('[VALIDATION] Shift end missing.'); errors.push(this.elements.shiftEndInput); }

        if (data.trailer_diff_time && !data.trailer_start) { console.warn('[VALIDATION] Trailer start missing.'); errors.push(this.elements.trailerStartInput); }
        if (data.trailer_diff_time && !data.trailer_end) { console.warn('[VALIDATION] Trailer end missing.'); errors.push(this.elements.trailerEndInput); }

        if (data.overrun) {
            const overrunValue = parseInt(data.overrun, 10);
            if (isNaN(overrunValue) || overrunValue < 0) {
                 console.warn('[VALIDATION] Overrun invalid.');
                 errors.push(this.elements.overrunInput);
            }
        }

        if (errors.length > 0) {
            return errors;
        }

        console.log('[LOG] Form validation passed.');
        return null; // Успех
    },

    /**
     * (5.3) Расчет переработки (с округлением до 15 мин)
     * Возвращает переработку в ЧАСАХ (десятичное число)
     */
    calculateOvertime(start, end) {
        if (!start || !end) return 0;
        try {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
                 console.warn("[WARN] Invalid time format for overtime calculation:", start, end);
                 return 0;
            }
            let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
            if (totalMinutes < 0) totalMinutes += 24 * 60; // Добавляем день при переходе через полночь

            const overtimeMinutes = totalMinutes - (12 * 60); // Вычисляем минуты СВЕРХ 12 часов
            if (overtimeMinutes <= 0) return 0; // Нет переработки

            // --- Новая логика округления ---
            const remainder = overtimeMinutes % 15;
            const baseIntervals = Math.floor(overtimeMinutes / 15);
            let roundedMinutes;
            if (remainder <= 7) {
                // Округляем вниз до ближайшего :00, :15, :30, :45
                roundedMinutes = baseIntervals * 15;
            } else {
                // Округляем вверх до ближайшего :15, :30, :45, :00 (след. часа)
                roundedMinutes = (baseIntervals + 1) * 15;
            }
            // --- Конец новой логики ---

            const roundedHours = roundedMinutes / 60; // Конвертируем округленные минуты обратно в часы
            return roundedHours;

        } catch (error) {
             console.error("[ERROR] Error calculating overtime:", error, "Start:", start, "End:", end);
             return 0;
        }
    },

    /**
     * (5.0) Главная кнопка (Предпросмотр / Редактировать)
     */
    handleMainButtonClick() {
        console.log('[LOG] handleMainButtonClick() called.'); // [ЛОГ] Нажатие главной кнопки
        this.tg.HapticFeedback.impactOccurred('medium');

        this.clearValidationErrors();

        const validationErrors = this.validateForm();

        if (validationErrors) {
            console.warn('[VALIDATION] Failed:', validationErrors);
            this.tg.HapticFeedback.notificationOccurred('error');

            validationErrors.forEach((el, index) => {
                if (el) {
                    el.classList.add('input-error');
                    el.classList.add('shake-animation');
                    // Удаляем класс анимации, чтобы она могла сработать снова
                    setTimeout(() => {
                        el.classList.remove('shake-animation');
                    }, 500); // Длительность анимации
                }
                // Фокусируемся на первом поле с ошибкой
                if (index === 0 && typeof el.focus === 'function') {
                    el.focus();
                }
            });

            return; // Прерываем выполнение
        }

        console.log('[LOG] Form validated, calculating preview data...');

        const data = this.state.currentReport;

        // Используем обновленную calculateOvertime
        const shiftOvertime = this.calculateOvertime(data.shift_start, data.shift_end);

        let trailerStart = data.trailer_start;
        let trailerEnd = data.trailer_end;
        let trailerOvertime = 0;

        if (data.trailer && !data.trailer_diff_time) {
            trailerStart = data.shift_start;
            trailerEnd = data.shift_end;
            trailerOvertime = this.calculateOvertime(trailerStart, trailerEnd); // Считаем по времени смены
        } else if (data.trailer && data.trailer_diff_time) {
             trailerOvertime = this.calculateOvertime(trailerStart, trailerEnd); // Считаем по времени прицепа
        }

        // Новая функция форматирования часов и минут
        const fHours = (h) => {
            if (h <= 0) return "0 ч.";
            const totalMinutes = Math.round(h * 60);
            const hoursPart = Math.floor(totalMinutes / 60);
            const minutesPart = totalMinutes % 60;
            let result = "";
            if (hoursPart > 0) {
                result += `${hoursPart} ч.`;
            }
            if (minutesPart > 0) {
                if (result.length > 0) result += " ";
                result += `${minutesPart} мин.`;
            }
            return result;
        };

        const user = this.state.user;
        // Добавляем проверку на случай, если user еще не загружен
        if (!user) {
             console.error('[CRITICAL ERROR] User state is null in handleMainButtonClick!');
             this.showErrorPopup('Ошибка: данные пользователя не загружены. Перезапустите приложение.');
             return;
        }

        const tgUser = this.tg.initDataUnsafe.user;
        const tgUserLink = tgUser.username ? `@${tgUser.username}` : `(ID: ${user.tg_id})`;
        const driverString = `${user.driver_name} ${tgUserLink}`;

        let previewMessage = [];

        if (data.date) previewMessage.push(`🗓 ${data.date}`);
        if (driverString) previewMessage.push(`👤 Водитель: ${driverString}`);
        if (data.project) previewMessage.push(`🎬 Проект: ${data.project}`);
        if (data.vehicle) previewMessage.push(`🚚 Техника: ${data.vehicle}`);
        if (data.trailer) previewMessage.push(`➕ Прицеп: ${data.trailer}`);
        if (data.address) previewMessage.push(`📍 Адрес: ${data.address}`);

        if (data.shift_start && data.shift_end) {
            // Используем новую fHours
            previewMessage.push(`🕔 Смена: ${data.shift_start} — ${data.shift_end} (Переработка: ${fHours(shiftOvertime)})`);
        }

        if (data.trailer) {
            // Используем новую fHours
            previewMessage.push(`🕔 Смена прицепа: ${trailerStart || ''} — ${trailerEnd || ''} (Переработка: ${fHours(trailerOvertime)})`);
        }

        if (data.overrun) {
            previewMessage.push(`🛣 Перепробег: ${data.overrun} км`);
        }

        if (data.comment) {
            previewMessage.push(`💬 Комментарий: ${data.comment}`);
        }

        const finalMessage = previewMessage.join('\n');
        console.log('[LOG] Preview message generated.');

        if (this.state.editingReportId) {
            this.showPreviewModal(
                'Подтвердить изменения?',
                finalMessage,
                'Отредактировать',
                () => this.promptForEditReason() // Передаем колбэк
            );
        } else {
            this.showPreviewModal(
                'Отправить отчет?',
                finalMessage,
                'Отправить',
                () => this.submitReport() // Передаем колбэк
            );
        }
    },

    /**
     * (5.3) POST /api/report - Отправка нового отчета
     */
    async submitReport() {
        console.log('[LOG] submitReport() called.'); // [ЛОГ] Начало отправки
        this.showScreen('loader');
        const sanitizedData = { ...this.state.currentReport };
        for (const key of ['project', 'address', 'comment']) {
            // @ts-ignore
            if (sanitizedData[key] && ['=', '+', '-', '@'].includes(sanitizedData[key][0])) {
                // @ts-ignore
                sanitizedData[key] = "'" + sanitizedData[key];
            }
        }
        console.log('[LOG] Data sanitized:', sanitizedData); // [ЛОГ] Санитизация данных

        try {
            console.log('[LOG] Sending POST /report request...'); // [ЛОГ] Отправка запроса
            const response = await this.api.post('/report', {
                tgId: this.state.user.tg_id,
                reportData: sanitizedData
            });
             console.log('[LOG] Submit report API response:', response); // [ЛОГ] Ответ на отправку

            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                console.log('[LOG] Report submitted successfully.'); // [ЛОГ] Отчет отправлен
                this.showToast('Отчет успешно отправлен!');
                this.resetForm();
                setTimeout(() => {
                    this.tg.close();
                }, 1500);
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during report submission:', e); // [ЛОГ] Ошибка отправки
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
        console.log('[LOG] showEditList() called.'); // [ЛОГ] Показ списка ред.
        this.showScreen('loader');
        try {
            console.log(`[LOG] Sending GET /reports/${this.state.user.tg_id} request...`); // [ЛОГ] Запрос списка
            const response = await this.api.get(`/reports/${this.state.user.tg_id}`);
            console.log('[LOG] Get reports API response:', response); // [ЛОГ] Ответ списка

            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('profile');
            } else {
                console.log('[LOG] Rendering edit list...'); // [ЛОГ] Рендеринг списка
                this.renderEditList(response.data);
                this.showScreen('editList');
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during showEditList:', e); // [ЛОГ] Ошибка списка
            this.showErrorPopup("Ошибка сети при загрузке отчетов.");
            this.showScreen('profile');
        }
    },

    /**
     * (5.4) Рендеринг списка отчетов
     */
    renderEditList(reports) {
        console.log('[LOG] renderEditList() called with reports:', reports); // [ЛОГ] Начало рендеринга
        if (!reports || reports.length === 0) {
            this.elements.editListContainer.innerHTML = '<p class="text-center text-gray-400">Нет отчетов для редактирования.</p>';
            console.log('[LOG] No reports to render.'); // [ЛОГ] Нет отчетов
            return;
        }
        this.elements.editListContainer.innerHTML = reports.map(report => {
            if (!report.payload || typeof report.payload !== 'object') {
                 console.warn("[WARN] Invalid report payload found during rendering:", report); // [ЛОГ] Невалидный payload
                 return `<div class="report-item error">Ошибка данных отчета (ID: ${report.report_id})</div>`;
            }
            const data = report.payload;
            const dateStr = data.date ? new Date(data.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '??:???';
            return `
                <div class="report-item" data-report-id="${report.report_id}">
                    <div class="report-item-info">
                        <span class="report-item-date">${dateStr}</span>
                        <span class="report-item-project">${data.project || 'Без проекта'}</span>
                        <span class="report-item-vehicle">${data.vehicle || 'Без техники'}</span>
                    </div>
                    <button class="report-item-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                </div>`;
        }).join('');
        console.log('[LOG] Edit list rendered.'); // [ЛОГ] Список отрендерен

        console.log('[LOG] Adding event listeners to edit buttons...'); // [ЛОГ] Добавление слушателей
        this.elements.editListContainer.querySelectorAll('.report-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // @ts-ignore
                const reportId = e.currentTarget.closest('.report-item').dataset.reportId;
                console.log(`[LOG] Edit button clicked for report ID: ${reportId}`); // [ЛОГ] Клик по кнопке ред.
                const reportData = reports.find(r => r.report_id == reportId);
                if (reportData && reportData.payload) {
                     this.loadReportForEditing(reportData);
                } else {
                     console.error("[ERROR] Could not load report for editing, data missing:", reportId); // [ЛОГ] Ошибка загрузки для ред.
                     this.showErrorPopup("Не удалось загрузить данные этого отчета.");
                }
            });
        });
    },

    /**
     * (5.4) Загрузка отчета в форму
     */
    loadReportForEditing(report) {
        console.log('[LOG] loadReportForEditing() called for report:', report); // [ЛОГ] Загрузка для ред.
        this.tg.HapticFeedback.impactOccurred('light');
        this.state.editingReportId = report.report_id;
        this.state.currentReport = { ...report.payload };
        localStorage.setItem('driver_report_draft', JSON.stringify(this.state.currentReport));
        this.fillForm(this.state.currentReport);
        this.showScreen('main');
    },

    /**
     * (5.4) Запрос причины редактирования
     */
    promptForEditReason() {
        console.log('[LOG] promptForEditReason() called.'); // [ЛОГ] Запрос причины
        const reason = prompt('Укажите причину редактирования (обязательно):');
        console.log('[LOG] Reason entered:', reason); // [ЛОГ] Причина введена
        if (reason && reason.trim().length > 3) {
            this.submitEditReport(reason.trim());
        } else if (reason !== null) {
            console.warn('[WARN] Edit reason is too short or empty.'); // [ЛОГ] Причина короткая
            this.showToast("Причина обязательна (мин. 4 символа).", 'error');
        } else {
             console.log('[LOG] Edit reason prompt cancelled.'); // [ЛОГ] Отмена ввода причины
        }
    },

    /**
     * (5.4) PUT /api/report/:reportId - Отправка изменений
     */
    async submitEditReport(reason) {
        console.log(`[LOG] submitEditReport() called for report ID: ${this.state.editingReportId} with reason: ${reason}`); // [ЛОГ] Отправка изменений
        this.showScreen('loader');
        const sanitizedData = { ...this.state.currentReport };
        for (const key of ['project', 'address', 'comment']) {
            // @ts-ignore
            if (sanitizedData[key] && ['=', '+', '-', '@'].includes(sanitizedData[key][0])) {
                // @ts-ignore
                sanitizedData[key] = "'" + sanitizedData[key];
            }
        }
         console.log('[LOG] Edit data sanitized:', sanitizedData); // [ЛОГ] Санитизация изменений

        try {
            console.log(`[LOG] Sending PUT /report/${this.state.editingReportId} request...`); // [ЛОГ] Отправка PUT запроса
            const response = await this.api.put(`/report/${this.state.editingReportId}`, {
                tgId: this.state.user.tg_id,
                reportData: sanitizedData,
                reason: reason
            });
            console.log('[LOG] Edit report API response:', response); // [ЛОГ] Ответ на PUT запрос

            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                 console.log('[LOG] Report edited successfully.'); // [ЛОГ] Отчет изменен успешно
                this.showToast('Отчет успешно отредактирован!');
                this.resetForm();
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during report edit submission:', e); // [ЛОГ] Ошибка отправки изменений
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
    }

    async request(endpoint, options = {}) {
        console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`); // [ЛОГ] Начало API запроса
        // @ts-ignore
        if (App && App.elements && App.elements.loader) App.elements.loader.classList.remove('hidden');

        const headers = { 'Content-Type': 'application/json' };
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
            console.log(`[API Response] ${response.status} ${response.statusText} for ${endpoint}`); // [ЛОГ] Ответ API

            if (!response.ok) {
                let errorPayload = { message: `HTTP error ${response.status}` };
                try {
                    const errData = await response.json();
                    console.warn(`[API Error Body] ${response.status}:`, errData); // [ЛОГ] Тело ошибки API (JSON)
                    errorPayload = { message: errData.error || `HTTP error ${response.status}`, details: errData };
                } catch (e) {
                     try {
                          const textError = await response.text();
                          console.warn(`[API Error Body] ${response.status} (non-JSON):`, textError); // [ЛОГ] Тело ошибки API (текст)
                          errorPayload = { message: `HTTP error ${response.status}: ${textError.substring(0, 100)}` };
                     } catch (textE) { console.error('[API Error] Failed to read error body:', textE); } // [ЛОГ] Не удалось прочитать тело ошибки
                }
                // Возвращаем details для D1_ERROR
                return { error: errorPayload.message, details: errorPayload.details };
            }

            if (response.status === 204) {
                 console.log(`[API Response] 204 No Content for ${endpoint}`); // [ЛОГ] 204
                 return { data: null };
            }

            const responseClone = response.clone();
             try {
                 const jsonData = await response.json();
                 console.log(`[API Response Body] JSON for ${endpoint}:`, jsonData); // [ЛОГ] Тело ответа JSON
                 return jsonData;
             } catch (jsonError) {
                  console.error(`[API Error] Failed to parse JSON response for ${endpoint}:`, jsonError); // [ЛОГ] Ошибка парсинга JSON
                  try {
                       const textData = await responseClone.text();
                       console.warn(`[API Response Body] Non-JSON text for ${endpoint}:`, textData.substring(0, 200)); // [ЛОГ] Тело ответа (текст)
                       return { error: `Invalid JSON response: ${textData.substring(0,100)}`};
                  } catch (textError) {
                       console.error(`[API Error] Failed to read response body as text for ${endpoint}:`, textError); // [ЛОГ] Ошибка чтения текста
                       return { error: 'Failed to read response body'};
                  }
             }

        } catch (e) {
            console.error('[API Request] Network Error:', e.message); // [ЛОГ] Ошибка сети fetch
            return { error: 'Failed to fetch' };
        } finally {
            // @ts-ignore
             if (App && App.elements && App.elements.loader) App.elements.loader.classList.add('hidden');
             console.log(`[API Request] Finished ${options.method || 'GET'} ${endpoint}`); // [ЛОГ] Конец API запроса
        }
    }

    async get(endpoint) {
        const result = await this.request(endpoint, { method: 'GET' });
        if (result.error === 'Failed to fetch') throw new Error('Failed to fetch');
        return result;
    }

    async post(endpoint, body) {
         const result = await this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
        if (result.error === 'Failed to fetch') throw new Error('Failed to fetch');
        return result;
    }

    async put(endpoint, body) {
         const result = await this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
         if (result.error === 'Failed to fetch') throw new Error('Failed to fetch');
        return result;
    }
}

// (2.0) Старт приложения
document.addEventListener('DOMContentLoaded', () => {
     console.log('[LOG] DOMContentLoaded event fired.'); // [ЛОГ] DOM загружен
     try {
         App.init();
     } catch (error) {
          console.error("[CRITICAL ERROR] Error during App.init execution:", error); // [ЛОГ] КРИТИЧЕСКАЯ ОШИБКА при выполнении init
          document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error-color);">Критическая ошибка при запуске приложения. Свяжитесь с администратором.</div>';
     }
});
