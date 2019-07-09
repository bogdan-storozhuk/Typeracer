
      let array = [];


      socket.on('timer', ({
        countdown
    }) => {
        if (!raceFinished) {
            const timer = document.getElementById('time');
            timer.textContent = `The next race starts in: ${countdown}`;
        }
    });
    

       