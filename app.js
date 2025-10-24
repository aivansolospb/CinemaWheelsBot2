// (2.0) Мок TWA для отладки в браузере
if (typeof Telegram === 'undefined' || !Telegram.WebApp.initDataUnsafe) {
// ... existing code ... -->
            close: () => { console.log("Mock WebApp close()"); }
        }
    };

// ... existing code ... -->
    // @ts-ignore
    window.Telegram = {
        WebApp: {
// ... existing code ... -->
            },
            // [ИЗМЕНЕНО] Оставляем showErrorPopup для простых ошибок
            showPopup: (params, callback) => {
                alert(`${params.title}\n\n${params.message}`);
// ... existing code ... -->
        }
    };

    // (5.1) Мок кнопки для браузера (для теста)
// ... existing code ... -->
        mockButton.onclick = () => window.mockMainButtonClick && window.mockMainButtonClick();
        document.body.appendChild(mockButton);
    });
}
// ... existing code ... -->
const API_BASE_URL = 'https://cinemawheels2-backend.aivansolo-spb.workers.dev/api';

/**
 * (2.0) Главный объект приложения
 */
const App = {
// ... existing code ... -->
        modalBody: null,
        modalCancelButton: null,
        modalConfirmButton: null,
        toast: null, // [НОВОЕ]
    },

    // (2.0) Состояние
// ... existing code ... -->
    /**
     * (2.0) Инициализация
     */
    init() {
// ... existing code ... -->
            this.elements.modalBody = document.getElementById('modal-body');
            this.elements.modalCancelButton = document.getElementById('modal-cancel-btn');
            this.elements.modalConfirmButton = document.getElementById('modal-confirm-btn');
            this.elements.toast = document.getElementById('toast'); // [НОВОЕ]
            
            console.log('[LOG] DOM elements bound successfully.'); // [ЛОГ] Элементы привязаны

// ... existing code ... -->
    handleBackButtonClick() {
        this.tg.HapticFeedback.impactOccurred('light');
        if (!this.elements.profileScreen.classList.contains('hidden')) {
// ... existing code ... -->
            this.showScreen('profile');
        }
    },

    /**
     * (5.0) Показать ошибку (всплывающее окно)
     * [ИЗМЕНЕНО] Оставляем tg.showPopup для *критических* ошибок (сеть, сервер)
     */
    showErrorPopup(message, title = "Ошибка") {
        console.warn(`[POPUP ERROR] ${title}: ${message}`); // [ЛОГ] Показ ошибки
// ... existing code ... -->
        });
    },

    /**
// ... existing code ... -->
        this.elements.authError.innerText = message;
        this.elements.authError.classList.remove('hidden');
    },

    // [НОВОЕ] Показ тост-уведомления
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

    // [НОВОЕ] Снятие выделения ошибок валидации
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
            this.elements.overrunInput // Добавлено поле перепробега
        ];
        fields.forEach(el => {
            if (el) { // Проверка, что элемент существует
                el.classList.remove('input-error');
                el.classList.remove('shake-animation');
            }
        });
    },

    // [НОВОЕ] Показ модального окна
    showPreviewModal(title, message, confirmText, onConfirm) {
// ... existing code ... -->
    onLoginSuccess() {
        console.log('[LOG] onLoginSuccess() called.'); // [ЛОГ] Успешный вход
        this.elements.profileName.innerText = this.state.user.driver_name;
// ... existing code ... -->
    /**
     * (5.2) POST /api/changeName - Смена ФИО
     */
    handleChangeName() {
// ... existing code ... -->
            // @ts-ignore
            is_cancelable: true,
            buttons: [
// ... existing code ... -->
                const sanitizedName = newName.trim();
                console.log('[LOG] Validating new name:', sanitizedName); // [ЛОГ] Валидация нового имени
                if (sanitizedName.length < 5 || ['=', '+', '-', '@'].includes(sanitizedName[0])) {
                    // [ИЗМЕНЕНО] Используем тост вместо алерта
                    this.showToast("Некорректное ФИО. (Мин. 5 симв., не начинается с =,+, -,@).", 'error');
                    return;
                }
// ... existing code ... -->

                    if (response.error) {
                        this.showErrorPopup(response.error);
                    } else {
                        console.log('[LOG] Name change successful.'); // [ЛОГ] Имя сменено успешно
                        this.state.user.driver_name = sanitizedName;
                        this.elements.profileName.innerText = sanitizedName;
                        // [ИЗМЕНЕНО] Используем тост вместо алерта
                        this.showToast('ФИО изменено.');
                    }
                } catch (e) {
                    console.error('[ERROR] Network or API client error during name change:', e); // [ЛОГ] Ошибка смены имени
// ... existing code ... -->
    /**
     * (5.3) [ИЗМЕНЕНО] Валидация формы (возвращает массив элементов)
     */
    validateForm() {
        console.log('[LOG] validateForm() called.'); // [ЛОГ] Валидация формы
        const data = this.state.currentReport;
        const errors = []; // Массив элементов с ошибками

        if (!data.date) { console.warn('[VALIDATION] Date missing.'); errors.push(this.elements.dateInput); }
        if (!data.project) { console.warn('[VALIDATION] Project missing.'); errors.push(this.elements.projectInput); }
        if (!data.vehicle) { console.warn('[VALIDATION] Vehicle missing.'); errors.push(this.elements.vehicleSelect); }
        if (!data.address) { console.warn('[VALIDATION] Address missing.'); errors.push(this.elements.addressInput); }
        
        // [ИЗМЕНЕНО] Проверяем оба поля времени
        if (!data.shift_start) { console.warn('[VALIDATION] Shift start missing.'); errors.push(this.elements.shiftStartInput); }
        if (!data.shift_end) { console.warn('[VALIDATION] Shift end missing.'); errors.push(this.elements.shiftEndInput); }
        
        if (data.trailer_diff_time && !data.trailer_start) { console.warn('[VALIDATION] Trailer start missing.'); errors.push(this.elements.trailerStartInput); }
        if (data.trailer_diff_time && !data.trailer_end) { console.warn('[VALIDATION] Trailer end missing.'); errors.push(this.elements.trailerEndInput); }
        
        if (data.overrun) {
            const overrunValue = parseInt(data.overrun, 10);
            if (isNaN(overrunValue) || overrunValue < 0) { 
                 console.warn('[VALIDATION] Overrun invalid.'); 
                 errors.push(this.elements.overrunInput); // Добавляем в ошибки, если введено некорректное (непустое) значение
            }
        }

        if (errors.length > 0) {
            return errors; // Возвращаем массив элементов
        }

        console.log('[LOG] Form validation passed.');
        return null; // Успех
    },

    /**
// ... existing code ... -->
     * (5.0) [ИЗМЕНЕНО] Главная кнопка (Предпросмотр / Редактировать)
     */
    handleMainButtonClick() {
        console.log('[LOG] handleMainButtonClick() called.'); // [ЛОГ] Нажатие главной кнопки
        this.tg.HapticFeedback.impactOccurred('medium');
        
        this.clearValidationErrors(); // [НОВОЕ] Очищаем старые ошибки
        
        const validationErrors = this.validateForm();
        
        if (validationErrors) {
            console.warn('[VALIDATION] Failed:', validationErrors);
            this.tg.HapticFeedback.notificationOccurred('error'); // Вибрация
            
            // [НОВОЕ] Применяем стили ошибок
            validationErrors.forEach((el, index) => {
                if (el) {
                    el.classList.add('input-error');
                    el.classList.add('shake-animation');
                    // Снимаем класс анимации, чтобы она могла повториться
                    setTimeout(() => {
                        el.classList.remove('shake-animation');
                    }, 500); // Длительность анимации + запас
                }
                
                // Фокус на первом ошибочном поле
                if (index === 0 && typeof el.focus === 'function') {
                    el.focus();
                }
            });
            
            return; // Прерываем выполнение
        }

        console.log('[LOG] Form validated, calculating preview data...'); // [ЛОГ] Расчет предпросмотра
        
// ... existing code ... -->
     * (5.3) POST /api/report - Отправка нового отчета
     */
    async submitReport() {
// ... existing code ... -->
            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                console.log('[LOG] Report submitted successfully.'); // [ЛОГ] Отчет отправлен
                // [ИЗМЕНЕНО] Показываем тост и закрываем приложение
                this.showToast('Отчет успешно отправлен!');
                this.resetForm();
                setTimeout(() => {
                    this.tg.close();
                }, 1500); // Даем время тосту показаться
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during report submission:', e); // [ЛОГ] Ошибка отправки
// ... existing code ... -->
     * (5.4) Запрос причины редактирования
     */
    promptForEditReason() {
// ... existing code ... -->
        if (reason && reason.trim().length > 3) {
            this.submitEditReport(reason.trim());
        } else if (reason !== null) {
            console.warn('[WARN] Edit reason is too short or empty.'); // [ЛОГ] Причина короткая
            // [ИЗМЕНЕНО] Используем тост
            this.showToast("Причина обязательна (мин. 4 символа).", 'error');
        } else {
             console.log('[LOG] Edit reason prompt cancelled.'); // [ЛОГ] Отмена ввода причины
// ... existing code ... -->
     * (5.4) PUT /api/report/:reportId - Отправка изменений
     */
    async submitEditReport(reason) {
// ... existing code ... -->
            if (response.error) {
                this.showErrorPopup(response.error);
                this.showScreen('main');
            } else {
                 console.log('[LOG] Report edited successfully.'); // [ЛОГ] Отчет изменен успешно
                 // [ИЗМЕНЕНО] Используем тост
                this.showToast('Отчет успешно отредактирован!');
                this.resetForm();
            }
        } catch (e) {
            console.error('[ERROR] Network or API client error during report edit submission:', e); // [ЛОГ] Ошибка отправки изменений
// ... existing code ... -->
