const form =
  document.getElementById(
    'reset-otp-form'
  );

const messageEl =
  document.getElementById(
    'message'
  );

const submitBtn =
  document.getElementById(
    'submit-btn'
  );

function showMessage(msg, type){

  messageEl.textContent = msg;

  messageEl.className =
    `alert alert-${type} show`;
}

form.addEventListener(
  'submit',
  async(e)=>{

    e.preventDefault();

    const otp =
      document.getElementById(
        'otp'
      ).value.trim();

    const password =
      document.getElementById(
        'password'
      ).value;

    const confirm =
      document.getElementById(
        'confirm'
      ).value;

    if(password !== confirm){

      showMessage(
        'Passwords do not match',
        'error'
      );

      return;
    }

    submitBtn.disabled = true;

    submitBtn.textContent =
      'Resetting...';

    try{

      const email =
        localStorage.getItem(
          'resetEmail'
        );

      const res =
        await fetch(
          '/api/auth/verify-reset-otp',
          {
            method:'POST',

            headers:{
              'Content-Type':
              'application/json'
            },

            body:JSON.stringify({
              email,
              otp,
              password
            })
          }
        );

      const data =
        await res.json();

      if(!res.ok){

        showMessage(
          data.message,
          'error'
        );

        return;
      }

      localStorage.removeItem(
        'resetEmail'
      );

      showMessage(
        'Password reset successful',
        'success'
      );

      setTimeout(()=>{

        window.location.href =
          '/login.html';

      },1500);

    }catch(err){

      showMessage(
        'Network error',
        'error'
      );

    }finally{

      submitBtn.disabled = false;

      submitBtn.textContent =
        'Reset Password';
    }
  }
);