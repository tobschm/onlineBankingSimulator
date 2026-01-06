
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Load Config
    window.transferConfig = null;
    fetch('config.json')
        .then(response => response.json())
        .then(data => {
            window.transferConfig = data;
            console.log('Config loaded:', data);
        })
        .catch(error => console.warn('Could not load config.json:', error));

    // Initial active form elements (default to transfer)
    let currentFormId = 'form-transfer';

    // Helper to get current form elements
    const getFormElements = (formId) => {
        const prefix = formId === 'form-standing-order' ? 'so-' : '';
        return {
            form: document.getElementById(formId),
            recipientInput: document.getElementById(`${prefix}recipient`),
            ibanInput: document.getElementById(`${prefix}iban`),
            amountInput: document.getElementById(`${prefix}amount`),
            dateInput: document.getElementById(`${prefix}date`),
            // Optional specific fields
            turnusInput: document.getElementById(`${prefix}turnus`),
            endDateInput: document.getElementById(`${prefix}end-date`),
            realtimeCheckbox: formId === 'form-transfer' ? document.getElementById('realtime') : null // Only on transfer
        };
    };

    // Tab Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show content
            const targetId = tab.dataset.tab;
            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');

            // Update current form ID references
            currentFormId = targetId === 'standing-order' ? 'form-standing-order' : 'form-transfer';

            // Clear errors when switching (optional but good UX)
            clearErrors();
        });
    });

    const successOverlay = document.getElementById('success-overlay');
    const balanceDisplay = document.getElementById('balance-display');
    const availableBalanceDisplay = document.querySelector('.available-balance');


    // Initialize Variables
    let currentBalance = Math.floor(Math.random() * (100000 - 5000 + 1)) + 5000;
    let availableBalance = 5000.00;

    // Helper functions
    const formatCurrency = (amount) => {
        return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    };

    const updateUI = () => {
        balanceDisplay.textContent = formatCurrency(currentBalance);
        if (availableBalanceDisplay) {
            availableBalanceDisplay.textContent = `Verfügbar: ${formatCurrency(availableBalance)}`;
        }
    };
    updateUI();

    const setError = (elementId, message) => {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    };

    const clearErrors = () => {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.textContent = '');
    };

    // Validation Logic Generators
    const createValidators = (elements) => {
        const { recipientInput, ibanInput, amountInput, dateInput, realtimeCheckbox, endDateInput, unlimitedCheckbox } = elements;
        const prefix = elements.form.id === 'form-standing-order' ? 'error-so-' : 'error-';
        const isStandingOrder = elements.form.id === 'form-standing-order';

        return {
            validateRecipient: () => {
                if (!recipientInput.value.trim()) {
                    setError(`${prefix}recipient`, 'Empfänger darf nicht leer sein.');
                    return false;
                }
                setError(`${prefix}recipient`, '');
                return true;
            },
            validateIBAN: () => {
                const iban = ibanInput.value.replace(/\s/g, '');
                const deIbanRegex = /^DE\d{20}$/;
                if (!deIbanRegex.test(iban)) {
                    setError(`${prefix}iban`, 'Bitte geben Sie eine gültige IBAN ein (z.B. DE00 1111 2222 3333 4444 55).');
                    return false;
                }
                setError(`${prefix}iban`, '');
                return true;
            },
            validateAmount: () => {
                const amount = parseFloat(amountInput.value);
                if (isNaN(amount)) {
                    setError(`${prefix}amount`, 'Geben Sie einen Betrag ein.');
                    return false;
                }
                if (amount <= 0) {
                    setError(`${prefix}amount`, 'Der Betrag muss positiv sein.');
                    return false;
                }

                // Standing Order Logic: NO balance/limit check per request.
                if (isStandingOrder) {
                    setError(`${prefix}amount`, '');
                    return true;
                }

                // Standard Transfer Logic: Check limits
                if (amount > availableBalance) {
                    setError(`${prefix}amount`, `Der Betrag darf maximal ${formatCurrency(availableBalance)} betragen.`);
                    return false;
                }

                if (amount > currentBalance) {
                    setError(`${prefix}amount`, 'Nicht genügend Guthaben auf dem Konto.');
                    return false;
                }
                setError(`${prefix}amount`, '');
                return true;
            },
            validateDate: () => {
                // If realtime checkbox exists and is checked, date is optional/ignored
                if (realtimeCheckbox && realtimeCheckbox.checked) {
                    setError(`${prefix}date`, '');
                    return true;
                }

                if (!dateInput.value) {
                    setError(`${prefix}date`, 'Bitte wählen Sie ein Ausführungsdatum.');
                    return false;
                }

                const selectedDate = new Date(dateInput.value);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);

                if (selectedDate < now) {
                    setError(`${prefix}date`, 'Das Datum muss in der Zukunft oder heute liegen.');
                    return false;
                }
                setError(`${prefix}date`, '');
                return true;
            },
            validateEndDate: () => {
                // Only for Standing Order
                if (!endDateInput) return true; // Not applicable

                // If "Unbefristet" is checked, validation is always true (input should be disabled anyway)
                if (unlimitedCheckbox && unlimitedCheckbox.checked) {
                    setError(`${prefix}end-date`, '');
                    return true;
                }

                if (!endDateInput.value) {
                    // If not unlimited, and empty, we assume valid (optional end date logic) 
                    // or valid because user said checkbox makes it unlimited.
                    setError(`${prefix}end-date`, '');
                    return true;
                }

                const startDate = new Date(dateInput.value);
                const endDate = new Date(endDateInput.value);

                // reset times
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (endDate <= startDate) {
                    setError(`${prefix}end-date`, 'Das Enddatum muss nach dem Ausführungsdatum liegen.');
                    return false;
                }
                setError(`${prefix}end-date`, '');
                return true;
            }
        };
    };

    // Setup Form Listeners
    const setupForm = (formId) => {
        const elements = getFormElements(formId);
        if (!elements.form) return;

        // Add specific element for standing order
        elements.unlimitedCheckbox = document.getElementById('so-unlimited');

        const validators = createValidators(elements);

        // Date Constraints
        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.min = today;
        if (elements.endDateInput) elements.endDateInput.min = today;

        // Realtime Checkbox Logic (Transfer only)
        if (elements.realtimeCheckbox) {
            elements.realtimeCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    elements.dateInput.disabled = true;
                    elements.dateInput.value = '';
                    setError('error-date', '');
                } else {
                    elements.dateInput.disabled = false;
                }
            });
        }

        // Unlimited Checkbox Logic (Standing Order only)
        if (elements.unlimitedCheckbox && elements.endDateInput) {
            elements.unlimitedCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    elements.endDateInput.disabled = true;
                    elements.endDateInput.value = ''; // Clear value
                    // Clear any errors
                    setError('error-so-end-date', '');
                    elements.endDateInput.classList.add('disabled-input'); // Optional styling hook
                } else {
                    elements.endDateInput.disabled = false;
                    elements.endDateInput.classList.remove('disabled-input');
                    // Re-validate immediately to show error if dates are invalid
                    validators.validateEndDate();
                }
            });
        }

        // Validation Listeners
        const addListener = (el, fn) => {
            if (!el) return;
            ['input', 'blur'].forEach(ev => {
                el.addEventListener(ev, () => {
                    if (el.value || ev === 'blur') fn();
                });
            });
        };

        addListener(elements.recipientInput, validators.validateRecipient);
        addListener(elements.ibanInput, validators.validateIBAN);
        addListener(elements.amountInput, validators.validateAmount);

        if (elements.dateInput) {
            elements.dateInput.addEventListener('change', validators.validateDate);
            elements.dateInput.addEventListener('input', validators.validateDate);
            // Re-validate end date if start date changes
            if (elements.endDateInput) {
                elements.dateInput.addEventListener('change', validators.validateEndDate);
            }
        }

        if (elements.endDateInput) {
            // Validate end date on change
            elements.endDateInput.addEventListener('change', validators.validateEndDate);
            elements.endDateInput.addEventListener('input', validators.validateEndDate);
        }

        // Input Formatting (IBAN, Amount)
        if (elements.ibanInput) {
            elements.ibanInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                if (e.target.value !== formattedValue) {
                    e.target.value = formattedValue;
                }
            });
        }

        if (elements.amountInput) {
            elements.amountInput.addEventListener('keydown', (e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        // Submission
        elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            clearErrors();

            const isRecipientValid = validators.validateRecipient();
            const isIbanValid = validators.validateIBAN();
            const isAmountValid = validators.validateAmount();
            const isDateValid = validators.validateDate();
            // End Date is only relevant if not unlimited (handled inside validator)
            const isEndDateValid = validators.validateEndDate();

            if (isRecipientValid && isIbanValid && isAmountValid && isDateValid && isEndDateValid) {
                // Success action
                const amount = parseFloat(elements.amountInput.value);

                // Config Validation Logic (Transfer Only)
                if (formId === 'form-transfer' && window.transferConfig) {
                    const inputName = elements.recipientInput.value.trim();
                    const inputIban = elements.ibanInput.value.replace(/\s/g, '');
                    const inputAmount = amount;

                    // Check if either Name or IBAN exists in config
                    const configEntry = window.transferConfig.find(entry =>
                        entry.name === inputName || entry.IBAN.replace(/\s/g, '') === inputIban
                    );

                    if (configEntry) {
                        // If found, ALL metrics must match
                        const configIban = configEntry.IBAN.replace(/\s/g, '');
                        // Parse config amount (handle string check and comma replacement if needed, though JSON has "1200" or "599,99")
                        let configAmountStr = String(configEntry.amount).replace(',', '.');
                        let configAmount = parseFloat(configAmountStr);

                        const isNameMatch = configEntry.name === inputName;
                        const isIbanMatch = configIban === inputIban;
                        // Floating point comparison with small epsilon or direct if user input is precise
                        const isAmountMatch = Math.abs(configAmount - inputAmount) < 0.01;

                        if (!isNameMatch || !isIbanMatch || !isAmountMatch) {
                            // Show Error in Overlay
                            const checkmark = document.getElementById('success-checkmark');
                            const errorMessage = document.getElementById('overlay-error-message');

                            checkmark.classList.add('hidden');
                            errorMessage.classList.remove('hidden');

                            successOverlay.classList.remove('hidden');
                            successOverlay.classList.add('active');

                            setTimeout(() => {
                                successOverlay.classList.remove('active');
                                successOverlay.classList.add('hidden');
                                // Reset overlay state after hiding
                                setTimeout(() => {
                                    checkmark.classList.remove('hidden');
                                    errorMessage.classList.add('hidden');
                                }, 300);
                            }, 3000);
                            return; // Stop execution
                        }
                    }
                }

                // Normal Success Flow (or Validated Config Flow)
                // Deduct only for normal transfer
                if (formId === 'form-transfer') {
                    currentBalance -= amount;
                    availableBalance -= amount;
                    updateUI();
                } else {
                    // Standing order: Do not affect balance (Per user request)
                }

                // Show Success Overlay
                const checkmark = document.getElementById('success-checkmark');
                const errorMessage = document.getElementById('overlay-error-message');
                checkmark.classList.remove('hidden');
                errorMessage.classList.add('hidden');

                successOverlay.classList.remove('hidden');
                successOverlay.classList.add('active');

                setTimeout(() => {
                    successOverlay.classList.remove('active');
                    successOverlay.classList.add('hidden');
                    elements.form.reset();

                    // Fix Reset State: Re-enable fields that might have been disabled by checkboxes
                    if (elements.dateInput) elements.dateInput.disabled = false;
                    if (elements.endDateInput) {
                        elements.endDateInput.disabled = false;
                        elements.endDateInput.classList.remove('disabled-input');
                    }

                    if (formId === 'form-transfer') updateUI();
                }, 3000);
            }
        });
    };

    // Setup both forms
    setupForm('form-transfer');
    setupForm('form-standing-order');
});
