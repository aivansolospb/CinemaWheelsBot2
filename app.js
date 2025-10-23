// app.js - исправленная версия для TWA

// (ИСПРАВЛЕНО) URL бэкенда (убран /api, т.к. он добавляется в каждом запросе)
const API_BASE_URL = 'https' + '://cinemawheels2-backend.aivansolo-spb.workers.dev';

const App = {
  state: {
    user: null, // { tg_id, driver_name, ... }
    reports: [],
    currentReport: null,
  },

  // (ИСПРАВЛЕНО) Логика инициализации полностью переписана для TWA
  async init() {
    this.cacheElements();
    this.bindEvents();
    
    // 1. Проверяем, что мы внутри Telegram
    if (!window.Telegram || !window.Telegram.WebApp) {
      this.showError('Ошибка: Приложение должно быть запущено внутри Telegram.');
      this.showGlobalLoader(false);
      return;
    }

    try {
      const tg = window.Telegram.WebApp;
      tg.ready(); // Сообщаем Telegram, что TWA готово

      const initData = tg.initDataUnsafe;
      if (!initData.user) {
        this.showError('Ошибка: Не удалось получить данные пользователя Telegram.');
        this.showGlobalLoader(false);
        return;
      }
      
      const tgUser = initData.user;
      const tgId = tgUser.id.toString();
      const username = tgUser.username;

      // 2. (ИСПРАВЛЕНО) Вызываем эндпоинт бэкенда GET /api/user/:tgId
      await this.fetchUser(tgId, username);

    } catch (e) {
      console.error(e);
      this.showError(`Критическая ошибка: ${e.message}`);
      this.showGlobalLoader(false);
    }
  },

  // (ИСПРАВЛЕНО) Добавлены ID для всех новых полей
  cacheElements() {
    this.loader = document.getElementById('loader');
    this.authScreen = document.getElementById('auth-screen');
    this.authForm = document.getElementById('auth-form');
    this.authName = document.getElementById('auth-name');
    this.authSubmit = document.getElementById('auth-submit');
    this.mainScreen = document.getElementById('main-screen');
    this.reportForm = document.getElementById('report-form');
    
    // Поля формы
    this.dateInput = document.getElementById('date');
    this.projectInput = document.getElementById('project');
    this.recentProjects = document.getElementById('recent-projects');
    this.vehicleSelect = document.getElementById('vehicle');
    this.addressInput = document.getElementById('address');
    this.shiftStart = document.getElementById('shift-start');
    this.shiftEnd = document.getElementById('shift-end');
    this.trailerSelect = document.getElementById('trailer');
    this.trailerStart = document.getElementById('trailer-start');
    this.trailerEnd = document.getElementById('trailer-end');
    this.overrunInput = document.getElementById('overrun');
    this.commentInput = document.getElementById('comment');

    // Профиль
    this.profileScreen = document.getElementById('profile-screen');
    this.profileButton = document.getElementById('profile-button');
    this.profileId = document.getElementById('profile-id');
    this.profileName = document.getElementById('profile-name');
    this.profileEditName = document.getElementById('profile-edit-name');
    this.profileEditReports = document.getElementById('profile-edit-reports');
    this.profileClose = document.getElementById('profile-close');
    
    // Редактирование
    this.editListScreen = document.getElementById('edit-list-screen');
    this.reportList = document.getElementById('report-list');
    this.editListCloseButton = document.getElementById('edit-list-close-button');
  },

  bindEvents() {
    if (this.authForm) {
      this.authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.authName.value.trim();
        if (name) this.registerUser(name);
      });
    }

    if (this.reportForm) {
      this.reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitReport();
      });
    }

    if (this.profileButton) {
      this.profileButton.addEventListener('click', () => this.showProfile());
    }

    if (this.profileClose) {
      this.profileClose.addEventListener('click', () => this.showScreen('main-screen'));
    }

    if (this.profileEditReports) {
      this.profileEditReports.addEventListener('click', () => this.loadReports());
    }

    if (this.editListCloseButton) {
      this.editListCloseButton.addEventListener('click', () => this.showScreen('profile-screen'));
    }
  },

  // (НОВАЯ ФУНКЦИЯ) Запрашивает пользователя с бэкенда
  async fetchUser(tgId, username) {
    try {
      // (ИСПРАВЛЕНО) Эндпоинт соответствует worker.js (GET /api/user/:tgId)
      const response = await fetch(`${API_BASE_URL}/api/user/${tgId}`);
      
      if (response.status === 200) {
        // Пользователь найден
        const res = await response.json();
        // (ИСПРАВЛЕНО) Бэкенд возвращает { data: user }
        this.state.user = res.data; 
        this.showScreen('main-screen');
        await this.loadFormData(); // Загружаем данные для форм
      } else if (response.status === 404) {
        // Пользователь не найден, показываем регистрацию
        // (ИСПРАВЛЕНО) Сохраняем ID и username для отправки при регистрации
        this.state.user = { tg_id: tgId, username: username, isGuest: true };
        this.showScreen('auth-screen');
      } else {
        // Другая ошибка
        const res = await response.json();
        throw new Error(res.error || `Ошибка ${response.status}`);
      }
    } catch (e) {
      this.showError(`Ошибка загрузки профиля: ${e.message}`);
    } finally {
      this.showGlobalLoader(false);
    }
  },

  // (ИСПРАВЛЕНО) Отправляет корректные данные на /api/register
  async registerUser(name) {
    this.showGlobalLoader(true);
    try {
      const { tg_id, username } = this.state.user;
      
      // (ИСПРАВЛЕНО) Тело запроса соответствует worker.js (handleRegister)
      const body = {
        tgId: tg_id,
        driverName: name,
        username: username
      };

      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();

      if (response.status !== 200) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      // (ИСПРАВЛЕНО) Бэкенд возвращает { data: user }
      this.state.user = data.data;
      this.showScreen('main-screen');
      await this.loadFormData();

    } catch (e) {
      this.showError(`Ошибка регистрации: ${e.message}`);
    } finally {
      this.showGlobalLoader(false);
    }
  },

  // (НОВАЯ ФУНКЦИЯ) Загружает данные для форм
  async loadFormData() {
    try {
      // (ИСПРАВЛЕНО) Эндпоинт соответствует worker.js (handleGetFormData)
      const res = await fetch(`${API_BASE_URL}/api/formData`);
      const resData = await res.json();
      const data = resData.data;

      // Заполняем проекты
      this.recentProjects.innerHTML = '';
      data.recentProjects.forEach(p => {
        if (p.project) {
          const option = document.createElement('option');
          option.value = p.project;
          this.recentProjects.appendChild(option);
        }
      });
      
      // Заполняем технику
      this.vehicleSelect.innerHTML = '<option value="">- Выберите технику -</option>';
      data.vehicles.forEach(v => {
        const option = document.createElement('option');
        option.value = v.vehicle_name;
        option.textContent = v.vehicle_name;
        this.vehicleSelect.appendChild(option);
      });
      
      // Заполняем прицепы
      this.trailerSelect.innerHTML = '<option value="">- Нет прицепа -</option>';
      data.trailers.forEach(v => {
        const option = document.createElement('option');
        option.value = v.vehicle_name;
        option.textContent = v.vehicle_name;
        this.trailerSelect.appendChild(option);
      });

    } catch (e) {
      this.showError(`Ошибка загрузки данных формы: ${e.message}`);
    }
  },

  // (ИСПРАВЛЕНО) Собирает все данные и отправляет на /api/report
  async submitReport() {
    // (ИСПРАВЛЕНО) Собираем все данные из формы
    const reportData = {
      date: this.dateInput.value,
      project: this.projectInput.value.trim(),
      vehicle: this.vehicleSelect.value,
      address: this.addressInput.value.trim(),
      shift_start: this.shiftStart.value,
      shift_end: this.shiftEnd.value,
      trailer: this.trailerSelect.value,
      trailer_start: this.trailerStart.value,
      trailer_end: this.trailerEnd.value,
      overrun: this.overrunInput.value,
      comment: this.commentInput.value.trim(),
    };

    // Валидация
    if (!reportData.date || !reportData.project || !reportData.vehicle || !reportData.address || !reportData.shift_start || !reportData.shift_end) {
      return this.showError('Заполните все обязательные поля (Дата, Проект, Техника, Адрес, Смена).');
    }

    this.showGlobalLoader(true);
    try {
      // (ИСПРАВЛЕНО) Тело запроса соответствует worker.js (handleSubmitReport)
      const body = {
        tgId: this.state.user.tg_id,
        reportData: reportData
      };
      
      // (ИСПРАВЛЕНО) Эндпоинт соответствует worker.js (POST /api/report)
      const response = await fetch(`${API_BASE_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      alert('Отчёт успешно отправлен!'); // Используем alert, как в оригинале
      this.reportForm.reset(); // Сбрасываем форму
      this.dateInput.value = new Date().toISOString().split('T')[0]; // Устанавливаем сегодняшнюю дату

    } catch (e) {
      this.showError(`Ошибка отправки отчёта: ${e.message}`);
    } finally {
      this.showGlobalLoader(false);
    }
  },

  // (ИСПРАВЛЕНО) Загружает отчеты с /api/reports/:tgId
  async loadReports() {
    this.showGlobalLoader(true);
    try {
      const tgId = this.state.user.tg_id;
      // (ИСПРАВЛЕНО) Эндпоинт соответствует worker.js (handleGetReports)
      const res = await fetch(`${API_BASE_URL}/api/reports/${tgId}`);
      const resData = await res.json();

      if (res.status !== 200) {
        throw new Error(resData.error || 'Ошибка загрузки');
      }
      
      const reports = resData.data;
      this.reportList.innerHTML = '';

      if (reports.length === 0) {
         this.reportList.innerHTML = '<li>Нет активных отчётов для редактирования.</li>';
      }

      reports.forEach((r) => {
        const li = document.createElement('li');
        // (ИСПРАВЛЕНО) Данные отчета теперь в r.payload
        const p = r.payload;
        li.textContent = `${p.date} - ${p.project} (${p.shift_start} - ${p.shift_end})`;
        // TODO: Добавить обработчик клика для редактирования
        // li.addEventListener('click', () => this.editReport(r.report_id));
        this.reportList.appendChild(li);
      });
      this.showScreen('edit-list-screen');

    } catch (e) {
      this.showError(`Ошибка загрузки отчётов: ${e.message}`);
    } finally {
      this.showGlobalLoader(false);
    }
  },
  
  // (НОВАЯ ФУНКЦИЯ) Показывает профиль
  showProfile() {
    if (!this.state.user || this.state.user.isGuest) {
      this.showScreen('auth-screen');
      return;
    }
    this.profileId.textContent = this.state.user.tg_id;
    this.profileName.textContent = this.state.user.driver_name;
    this.showScreen('profile-screen');
  },

  // --- Утилиты ---

  showGlobalLoader(show) {
    if (this.loader) {
      this.loader.style.display = show ? 'flex' : 'none';
    }
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
  },
  
  // (ИСПРАВЛЕНО) Заменил alert() на кастомную функцию
  showError(message) {
    // В TWA alert() может быть заблокирован. 
    // Временная замена, в идеале нужен кастомный modal.
    console.error(message);
    alert(message); 
  }
};

// (ИСПРАВЛЕНО) Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => App.init());
