
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.querySelector('.transfer-form');
    const recipientInput = document.getElementById('recipient');
    const ibanInput = document.getElementById('iban');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const realtimeCheckbox = document.getElementById('realtime');
    const balanceDisplay = document.getElementById('balance-display');
    const availableBalanceDisplay = document.querySelector('.available-balance');
    const successOverlay = document.getElementById('success-overlay');

    // Initialize Variables
    // Random balance between 5000 and 100000
    let currentBalance = Math.floor(Math.random() * (100000 - 5000 + 1)) + 5000;

    // Available balance (Transaction limit) initialized to 5000
    let availableBalance = 5000.00;

    // Helper functions
    const formatCurrency = (amount) => {
        return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    };

    // Initialize UI
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

    // Date Logic
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today; // HTML5 constraint

    realtimeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            dateInput.disabled = true;
            dateInput.value = ''; // Optional: clear date or set to today
            setError('error-date', '');
        } else {
            dateInput.disabled = false;
        }
    });

    // Validation Functions
    const validateRecipient = () => {
        if (!recipientInput.value.trim()) {
            setError('error-recipient', 'Empfänger darf nicht leer sein.');
            return false;
        }
        setError('error-recipient', '');
        return true;
    };

    const validateIBAN = () => {
        // Simple regex structure Check (Not full checksum validation for this scope, but structure)
        const iban = ibanInput.value.replace(/\s/g, ''); // remove spaces
        const deIbanRegex = /^DE\d{20}$/;

        if (!deIbanRegex.test(iban)) {
            setError('error-iban', 'Bitte geben Sie eine gültige deutsche IBAN ein (z.B. DE12 3456...).');
            return false;
        }
        setError('error-iban', '');
        return true;
    };

    const validateAmount = () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount)) {
            setError('error-amount', 'Geben Sie einen Betrag ein.');
            return false;
        }
        if (amount <= 0) {
            setError('error-amount', 'Der Betrag muss positiv sein.');
            return false;
        }
        // Check against availableBalance (Limit) instead of hardcoded 1000
        if (amount > availableBalance) {
            setError('error-amount', `Der Betrag darf maximal ${formatCurrency(availableBalance)} betragen.`);
            return false;
        }
        // Check against total balance (Liquidity)
        if (amount > currentBalance) {
            setError('error-amount', 'Nicht genügend Guthaben auf dem Konto.');
            return false;
        }
        setError('error-amount', '');
        return true;
    };

    const validateDate = () => {
        if (realtimeCheckbox.checked) {
            setError('error-date', '');
            return true;
        }

        if (!dateInput.value) {
            setError('error-date', 'Bitte wählen Sie ein Ausführungsdatum.');
            return false;
        }

        const selectedDate = new Date(dateInput.value);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize today
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < now) {
            setError('error-date', 'Das Datum muss in der Zukunft oder heute liegen.');
            return false;
        }
        setError('error-date', '');
        return true;
    };

    // Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors();

        const isRecipientValid = validateRecipient();
        const isIbanValid = validateIBAN();
        const isAmountValid = validateAmount();
        const isDateValid = validateDate();

        if (isRecipientValid && isIbanValid && isAmountValid && isDateValid) {
            // Success
            const amount = parseFloat(amountInput.value);
            currentBalance -= amount;
            availableBalance -= amount;
            updateUI();

            // Show Overlay
            successOverlay.classList.remove('hidden');
            successOverlay.classList.add('active');

            // Optional: Hide overlay after a few seconds
            setTimeout(() => {
                successOverlay.classList.remove('active');
                successOverlay.classList.add('hidden');
                form.reset();
                updateUI();
            }, 3000);
        }
    });

    // Real-time validation
    const addValidationListeners = (element, validateFn) => {
        ['input', 'blur'].forEach(event => {
            element.addEventListener(event, () => {
                // If the field is empty on input, maybe don't show error immediately unless it was already touched?
                // But for "clearing" error, we need to run validation.
                // The validate functions we modified set the error message if invalid.
                // To avoid showing "Required" errors while the user is still typing the first character,
                // we could check if it's 'input' and value is empty.
                // However, the user request specifically asked for the error to go away when they enter something.
                // So running validation on input is correct for that.
                if (element.value || event === 'blur') validateFn();
            });
        });
    };

    addValidationListeners(recipientInput, validateRecipient);
    addValidationListeners(ibanInput, validateIBAN);
    addValidationListeners(amountInput, validateAmount);
    // Date input is a bit special, usually change event or input
    dateInput.addEventListener('change', validateDate);
    dateInput.addEventListener('input', validateDate);

    // Input Restrictions
    // IBAN: Only letters and numbers, auto uppercase
    ibanInput.addEventListener('input', (e) => {
        let value = e.target.value;
        // Remove strictly anything that is NOT a letter or number
        value = value.replace(/[^a-zA-Z0-9]/g, '');
        // Convert to uppercase
        e.target.value = value.toUpperCase();
    });

    // Amount: strict numbers only (block e, +, -) for type="number"
    amountInput.addEventListener('keydown', (e) => {
        // Block 'e', 'E', '+', '-' provided by browser for number inputs
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    });
});
