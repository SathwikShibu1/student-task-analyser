const store = {

  get(key) {
    try {
      return JSON.parse(
        localStorage.getItem(key)
      );
    } catch {
      return null;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

/* THEME */

if (
  localStorage.getItem('theme')
  === 'dark'
) {
  document.documentElement.setAttribute(
    'data-theme',
    'dark'
  );
}

/* SIGNUP DATA */

const pendingSignup =
  store.get('pendingSignup');

if (!pendingSignup?.email) {

  window.location.href =
    '/signup.html';
}

/* ELEMENTS */

const form =
  document.getElementById(
    'otp-form'
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

/* VERIFY OTP */

form.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    errorMsg.className =
      'alert';

    submitBtn.disabled = true;

    submitBtn.textContent =
      'Verifying...';

    const otp =
      document
        .getElementById('otp')
        .value
        .trim();

    try {

      const res =
        await fetch(
          '/api/auth/verify-otp',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            credentials:
              'include',

            body: JSON.stringify({
              email:
                pendingSignup.email,

              otp,

              remember:
                pendingSignup.remember
            })
          }
        );

      const data =
        await res.json();

      if (!res.ok) {

        showError(
          data.message
          || 'OTP verification failed'
        );

        return;
      }

      store.remove(
        'pendingSignup'
      );

      document.querySelector(
        '.auth-card'
      ).innerHTML = `

        <div class="success-screen">

          <div class="success-icon">
            ✅
          </div>

          <h1>
            Account Created!
          </h1>

          <p>
            Your account has been verified successfully.
          </p>

          <span>
            Redirecting to login...
          </span>

        </div>
      `;

      setTimeout(() => {

        window.location.href =
          '/login.html';

      }, 2200);

    } catch (err) {

      showError(
        'Network error. Please try again.'
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Verify OTP';
    }
  }
);