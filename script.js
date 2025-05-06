// Set default values for temperature and TDS on load
document.addEventListener('DOMContentLoaded', function() {
    // Set default values for temperature and TDS if empty
    const tempInput = document.getElementById('temperature');
    if (tempInput && (tempInput.value === "" || tempInput.value === undefined)) {
        tempInput.value = 86;
    }
    const tdsInput = document.getElementById('tds');
    if (tdsInput && (tdsInput.value === "" || tdsInput.value === undefined)) {
        tdsInput.value = 1600;
    }

    const form = document.getElementById('pool-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Gather all form data into an object
            const formData = {
                state: document.getElementById('state').value,
                capacity: document.getElementById('capacity').value,
                ph: document.getElementById('ph').value,
                alkalinity: document.getElementById('alkalinity').value,
                calcium: document.getElementById('calcium').value,
                temperature: document.getElementById('temperature').value,
                tds: document.getElementById('tds').value,
                cyanuric: document.getElementById('cyanuric').value,
                freechlorine: document.getElementById('freechlorine').value,
                'salt-current': document.getElementById('salt-current').value,
                'salt-desired': document.getElementById('salt-desired').value
            };

            const resultsElement = document.getElementById('results');
            resultsElement.innerHTML = 'Calculating...';

            try {
                const response = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (data.html) {
                    resultsElement.innerHTML = data.html;
                } else if (data.error) {
                    resultsElement.innerHTML = `<p class="error">${data.error}</p>`;
                }
            } catch (err) {
                resultsElement.innerHTML = '<p class="error">Server error. Please try again later.</p>';
            }
        });
    }
});