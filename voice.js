voice.js
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.attendance-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            const currentAttendance = this.dataset.attendance;
            const newAttendance = currentAttendance === 'present' ? 'absent' : 'present';
            
            fetch(/attendance/${id}, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ attendance: newAttendance })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.textContent = newAttendance;
                    this.dataset.attendance = newAttendance;
                }
            });
        });
    });
});