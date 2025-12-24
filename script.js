
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
        return true;
    };

    const validateDate = () => {
        if (realtimeCheckbox.checked) return true; // Date ignored if realtime

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

    // Optional: Real-time validation on blur
    recipientInput.addEventListener('blur', () => { if (recipientInput.value) validateRecipient(); });
    ibanInput.addEventListener('blur', () => { if (ibanInput.value) validateIBAN(); });
    amountInput.addEventListener('blur', () => { if (amountInput.value) validateAmount(); });

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
