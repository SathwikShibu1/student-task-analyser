const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
};

/* THEME */

if (store.get('theme') === 'dark') {
  document.documentElement.setAttribute(
    'data-theme',
    'dark'
  );
}

/* AUTO LOGIN */

fetch('/api/user/profile', {
  credentials: 'include'
})
.then((res) => {

  if (res.ok) {
    window.location.href =
      '/dashboard.html';
  }
});

/* ELEMENTS */

const form =
  document.getElementById(
    'login-form'
  );

const messageEl =
  document.getElementById(
    'message'
  );

const submitBtn =
  document.getElementById(
    'submit-btn'
  );

/* HELPERS */

function showMessage(msg, type) {

  messageEl.textContent = msg;

  messageEl.className =
    `alert alert-${type} show`;
}

/* LOGIN */

form.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    messageEl.className =
      'alert';

    submitBtn.disabled = true;

    submitBtn.textContent =
      'Signing in...';

    const email =
      document
        .getElementById('email')
        .value
        .trim();

    const password =
      document
        .getElementById('password')
        .value;

    const remember =
      document
        .getElementById('remember')
        .checked;

    try {

      const res =
        await fetch(
          '/api/auth/login',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            credentials:
              'include',

            body: JSON.stringify({
              email,
              password,
              remember
            })
          }
        );

      const data =
        await res.json();

      if (!res.ok) {

        if (res.status === 403) {

          showMessage(
            'Please verify your email first.',
            'error'
          );

        } else {

          showMessage(
            data.message
            || 'Login failed',
            'error'
          );
        }

        return;
      }

      store.set(
        'user',
        JSON.stringify(data.user)
      );

      showMessage(
        'Login successful!',
        'success'
      );

      setTimeout(() => {

        window.location.href =
          '/dashboard.html';

      }, 800);

    } catch (err) {

      showMessage(
        'Network error. Server may be offline.',
        'error'
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Sign In';
    }
  }
);