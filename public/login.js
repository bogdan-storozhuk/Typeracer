window.onload = () => {

    const loginBtn = document.querySelector('#submit-btn');
    const emailField = document.querySelector('#email-field');
    const pwField = document.querySelector('#pw-field');

    loginBtn.addEventListener('click', ev => {
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login: emailField.value,
                password: pwField.value
            })
        }).then(res => {
            res.json().then(body => {
                if (body.auth) {
                    localStorage.setItem('jwt', body.token);
                    location.replace('/typerace');
                } else {
                    console.log('auth failed');
                }
            })
        }).catch(err => {
            console.log('request went wrong');
        })
    });

}