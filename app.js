// app.js - исправленная версия для TWA приложения

const API_BASE_URL = 'https://cinemawheels2-backend.aivansolo-spb.workers.dev/api';

const App = {
  state: {
    user: null,
    reports: [],
    currentReport: null,
  },

  init() {
    this.cacheElements();
    this.bindEvents();
    this.showGlobalLoader(true);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.state.user = JSON.parse(storedUser);
      this.showScreen('main-screen');
    } else {
      this.showScreen('auth-screen');
    }

    this.showGlobalLoader(false);
  },

  cacheElements() {
    this.loader = document.getElementById('loader');
    this.authScreen = document.getElementById('auth-screen');
    this.authForm = document.getElementById('auth-form');
    this.authName = document.getElementById('auth-name');
    this.authSubmit = document.getElementById('auth-submit');
    this.mainScreen = document.getElementById('main-screen');
    this.reportForm = document.getElementById('report-form');
    this.recentProjects = document.getElementById('recent-projects');
    this.shiftStart = document.getElementById('shift-start');
    this.shiftEnd = document.getElementById('shift-end');
    this.trailerStart = document.getElementById('trailer-start');
    this.trailerEnd = document.getElementById('trailer-end');
    this.profileScreen = document.getElementById('profile-screen');
    this.profileButton = document.getElementById('profile-button');
    this.profileId = document.getElementById('profile-id');
    this.profileEditName = document.getElementById('profile-edit-name');
    this.profileEditReports = document.getElementById('profile-edit-reports');
    this.profileClose = document.getElementById('profile-close');
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
      this.profileButton.addEventListener('click', () => this.showScreen('profile-screen'));
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

  async registerUser(name) {
    this.showGlobalLoader(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      this.state.user = data;
      localStorage.setItem('user', JSON.stringify(data));
      this.showScreen('main-screen');
    } catch (e) {
      alert('Ошибка регистрации');
      console.error(e);
    } finally {
      this.showGlobalLoader(false);
    }
  },

  async submitReport() {
    const report = {
      project: document.getElementById('project').value.trim(),
      shift_start: this.shiftStart.value,
      shift_end: this.shiftEnd.value,
      trailer_start: this.trailerStart.value,
      trailer_end: this.trailerEnd.value,
      user_id: this.state.user?.id,
    };

    if (!report.project) return alert('Укажите проект');

    this.showGlobalLoader(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      const data = await response.json();
      if (data?.success) alert('Отчёт сохранён');
    } catch (e) {
      alert('Ошибка отправки отчёта');
      console.error(e);
    } finally {
      this.showGlobalLoader(false);
    }
  },

  async loadReports() {
    this.showGlobalLoader(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports?user_id=${this.state.user?.id}`);
      const data = await res.json();
      this.reportList.innerHTML = '';
      data.forEach((r) => {
        const li = document.createElement('li');
        li.textContent = `${r.project} (${r.shift_start} - ${r.shift_end})`;
        this.reportList.appendChild(li);
      });
      this.showScreen('edit-list-screen');
    } catch (e) {
      alert('Ошибка загрузки отчётов');
    } finally {
      this.showGlobalLoader(false);
    }
  },
};

// Совместимость с HTML inline вызовами
window.app = App;
App.showPage = App.showScreen;

document.addEventListener('DOMContentLoaded', () => App.init());
