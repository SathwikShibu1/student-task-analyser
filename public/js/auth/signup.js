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

/* ELEMENTS */

const form =
  document.getElementById(
    'signup-form'
  );

const errorMsg =
  document.getElementById(
    'error-msg'
  );

const submitBtn =
  document.getElementById(
    'submit-btn'
  );

/* HELPERS */

function showError(msg) {

  errorMsg.textContent = msg;

  errorMsg.className =
    'alert alert-error show';
}

/* SIGNUP */

form.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    errorMsg.className =
      'alert';

    submitBtn.disabled = true;

    submitBtn.textContent =
      'Sending OTP...';

    const name =
      document
        .getElementById('name')
        .value
        .trim();

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

    if (password.length < 6) {

      showError(
        'Password must be at least 6 characters.'
      );

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Send OTP';

      return;
    }

    try {

      const res =
        await fetch(
          '/api/auth/signup',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            credentials:
              'include',

            body: JSON.stringify({
              name,
              email,
              password
            })
          }
        );

      const data =
        await res.json();

      console.log(
        'SIGNUP RESPONSE:',
        data
      );

      if (!res.ok) {

        showError(
          data.message
          || 'Signup failed'
        );

        return;
      }

      /* SAVE EMAIL */

      store.set(
        'pendingSignup',
        JSON.stringify({
          email,
          remember
        })
      );
window.location.href =
  '/verify-otp.html';
      /* SHOW DEV OTP */



      /* FORCE REDIRECT */

      setTimeout(() => {

        window.location.replace(
          '/verify-otp.html'
        );

      }, 300);

    } catch (err) {

      console.error(err);

      showError(
        'Network error. Please try again.'
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Send OTP';
    }
  }
);