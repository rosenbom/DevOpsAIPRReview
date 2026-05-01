(function () {
  var apiInput = document.getElementById('apiBaseUrl');
  var checkButton = document.getElementById('checkHealth');
  var status = document.getElementById('status');

  function setStatus(message) {
    status.textContent = message;
  }

  async function checkHealth() {
    var baseUrl = (apiInput.value || '').trim().replace(/\/$/, '');

    if (!baseUrl) {
      setStatus('Enter the backend API base URL first.');
      return;
    }

    setStatus('Checking ' + baseUrl + '/health ...');

    try {
      var response = await fetch(baseUrl + '/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      var text = await response.text();
      setStatus('HTTP ' + response.status + '\n' + text);
    }
    catch (error) {
      setStatus('Health check failed.\n' + (error && error.message ? error.message : String(error)));
    }
  }

  checkButton.addEventListener('click', function () {
    checkHealth();
  });
})();
