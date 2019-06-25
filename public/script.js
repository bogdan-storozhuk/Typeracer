window.onload = () => {

    const submitBtn = document.querySelector('#submit-btn');
    const textField = document.querySelector('#message-text');
    const messageListElem = document.querySelector('#message-list');

    const socket = io.connect('http://localhost:3000');

    submitBtn.addEventListener('click', ev => {
        socket.emit('submitMessage', { message: textField.value });
    });

    socket.on('newMessage', payload => {
        const newLi = document.createElement('li');
        newLi.innerHTML = payload.message;
        messageListElem.appendChild(newLi);
    });

}
