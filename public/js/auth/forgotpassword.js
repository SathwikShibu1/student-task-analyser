const store = {

  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
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
    'forgot-form'
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

/* SUBMIT */

form.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    messageEl.className =
      'alert';



    submitBtn.disabled = true;

    submitBtn.textContent =
      'Sending...';

    const email =
      document
        .getElementById('email')
        .value
        .trim();

    try {

      const res =
        await fetch(
          '/api/auth/forgot-password',
          {
            method:'POST',

            headers:{
              'Content-Type':
                'application/json'
            },

            body:JSON.stringify({
              email
            })
          }
        );

      const data =
        await res.json();

if(!res.ok){

  showMessage(
    data.message || 'Failed',
    'error'
  );

  return;
}

localStorage.setItem(
  'resetEmail',
  email
);

showMessage(
  'OTP sent successfully',
  'success'
);

setTimeout(()=>{

  window.location.href =
    '/verify-reset-otp.html';

},800);

    } catch (err) {

      showMessage(
        'Network error. Server may be offline.',
        'error'
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Send Reset Link';
    }
  }
);