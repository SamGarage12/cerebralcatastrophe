// EmailJS configuration
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'YOUR_PUBLIC_KEY',  // Replace with your public key
    SERVICE_ID: 'YOUR_SERVICE_ID',  // Replace with your service ID
    TEMPLATE_ID: 'YOUR_TEMPLATE_ID' // Replace with your template ID
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

// Data structure for lists
let lists = JSON.parse(localStorage.getItem('lists')) || [];

// DOM Elements
const taskInput = document.getElementById('taskInput');
const startLocation = document.getElementById('startLocation');
const endLocation = document.getElementById('endLocation');
const collaboratorEmail = document.getElementById('collaboratorEmail');
const taskList = document.getElementById('taskList');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const prioritySelect = document.getElementById('prioritySelect');

// Current filter
let currentFilter = 'all';

// Sound Effects
const sounds = {
    newTask: document.getElementById('newTaskSound'),
    completeTask: document.getElementById('completeTaskSound'),
    deleteTask: document.getElementById('deleteTaskSound'),
    completeAll: document.getElementById('completeAllSound'),
    createList: document.getElementById('createListSound'),
    deleteList: document.getElementById('deleteListSound'),
    reminder: document.getElementById('reminderSound')
};

// Play sound with error handling
function playSound(soundId) {
    const sound = sounds[soundId];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => console.log('Error playing sound:', err));
    }
}

// Trigger confetti animation
function triggerConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Since particles fall down, start a bit higher than random
        confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}

// Check if all tasks in a list are completed
function checkAllTasksCompleted(listId) {
    const list = lists.find(l => l.id === listId);
    if (list && list.tasks.length > 0 && list.tasks.every(task => task.completed)) {
        playSound('completeAll');
        triggerConfetti();
    }
}

// Save lists to localStorage
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Estimate travel time
async function estimateTravelTime(start, end) {
    try {
        // Using OpenStreetMap Nominatim API for geocoding
        const startResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(start)}&format=json`
        );
        const endResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(end)}&format=json`
        );
        
        const startData = await startResponse.json();
        const endData = await endResponse.json();
        
        if (startData[0] && endData[0]) {
            // Calculate distance
            const distance = calculateDistance(
                startData[0].lat, startData[0].lon,
                endData[0].lat, endData[0].lon
            );
            
            // Estimate time using variable speeds based on distance
            let averageSpeed;
            if (distance <= 5) {
                // City traffic, short distance
                averageSpeed = 40; // km/h
            } else if (distance <= 20) {
                // Mixed urban/suburban
                averageSpeed = 50; // km/h
            } else if (distance <= 50) {
                // Suburban/highway mix
                averageSpeed = 80; // km/h
            } else {
                // Primarily highway
                averageSpeed = 100; // km/h
            }

            // Add 10% for traffic lights and intersections
            const baseTimeInHours = distance / averageSpeed;
            const timeWithTraffic = baseTimeInHours * 1.1;
            
            // Convert to minutes and round to nearest minute
            const timeInMinutes = Math.round(timeWithTraffic * 60);
            
            // Format the output nicely
            if (timeInMinutes < 60) {
                return `Estimated travel time: ${timeInMinutes} minutes`;
            } else {
                const hours = Math.floor(timeInMinutes / 60);
                const minutes = timeInMinutes % 60;
                return `Estimated travel time: ${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
            }
        }
        return 'Could not estimate travel time';
    } catch (error) {
        console.error('Error estimating travel time:', error);
        return 'Error estimating travel time';
    }
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// EmailJS configuration check
function checkEmailJSConfig() {
    const issues = [];
    
    if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
        issues.push('Public Key not configured');
    }
    if (EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID') {
        issues.push('Service ID not configured');
    }
    if (EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
        issues.push('Template ID not configured');
    }
    
    if (issues.length > 0) {
        console.error('EmailJS Configuration Issues:', issues);
        alert('EmailJS is not properly configured:\n\n' + issues.join('\n') + 
              '\n\nPlease update the EMAILJS_CONFIG object with your credentials.');
        return false;
    }
    return true;
}

// Create a new list
function createNewList() {
    const listInput = document.getElementById('listInput');
    const listName = listInput.value.trim();
    
    if (listName === '') {
        alert('Please enter a list name');
        return;
    }
    
    const newList = {
        id: Date.now(),
        name: listName,
        tasks: []
    };
    
    lists.push(newList);
    playSound('createList');
    saveLists();
    renderLists();
    listInput.value = '';
}

// Delete a list
function deleteList(listId) {
    if (confirm('Are you sure you want to delete this list and all its tasks?')) {
        lists = lists.filter(list => list.id !== listId);
        playSound('deleteList');
        saveLists();
        renderLists();
    }
}

// Add task to a specific list
function addTask(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const listElement = document.querySelector(`[data-list-id="${listId}"]`);
    const taskInput = listElement.querySelector('.task-input');
    const startLocation = listElement.querySelector('.start-location');
    const endLocation = listElement.querySelector('.end-location');
    const collaborator = listElement.querySelector('.collaborator-email');
    const priority = listElement.querySelector('.priority-select');
    
    const taskText = taskInput.value.trim();
    if (taskText === '') return;
    
    if (collaborator.value && !isValidEmail(collaborator.value)) {
        alert('Please enter a valid email address for the collaborator');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        priority: priority.value,
        startLocation: startLocation.value.trim(),
        endLocation: endLocation.value.trim(),
        collaborator: collaborator.value.trim(),
        createdAt: new Date().toISOString()
    };

    // Play new task sound
    playSound('newTask');

    // If locations are provided, estimate travel time
    if (task.startLocation && task.endLocation) {
        estimateTravelTime(task.startLocation, task.endLocation)
            .then(time => {
                task.travelTime = time;
                list.tasks.push(task);
                saveLists();
                renderTasks(listId);
            });
    } else {
        list.tasks.push(task);
        saveLists();
        renderTasks(listId);
    }
    
    // Clear inputs
    taskInput.value = '';
    startLocation.value = '';
    endLocation.value = '';
    collaborator.value = '';
}

// Delete task from a specific list
function deleteTask(listId, taskId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    list.tasks = list.tasks.filter(task => task.id !== taskId);
    playSound('deleteTask');
    saveLists();
    renderTasks(listId);
}

// Toggle task completion in a specific list
function toggleTask(listId, taskId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const task = list.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            playSound('completeTask');
        }
        saveLists();
        renderTasks(listId);
        checkAllTasksCompleted(listId);
    }
}

// Clear all tasks in a specific list
function clearAllTasks(listId) {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    if (confirm('Are you sure you want to clear all tasks in this list?')) {
        list.tasks = [];
        playSound('deleteTask');
        saveLists();
        renderTasks(listId);
    }
}

// Filter tasks in a specific list
function filterTasks(listId, filter) {
    const listElement = document.querySelector(`[data-list-id="${listId}"]`);
    const filterButtons = listElement.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    
    renderTasks(listId, filter);
}

// Send notification for a task in a specific list
async function sendNotification(listId, taskId) {
    if (!checkEmailJSConfig()) return;
    
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const task = list.tasks.find(t => t.id === taskId);
    if (!task || !task.collaborator) {
        alert('No collaborator found for this task');
        return;
    }

    const remindBtn = document.querySelector(`button[onclick="sendNotification(${listId}, ${taskId})"]`);
    const originalText = remindBtn.innerHTML;
    remindBtn.innerHTML = '📧 Sending...';
    remindBtn.disabled = true;

    try {
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            {
                to_email: task.collaborator,
                task_name: task.text,
                task_priority: task.priority,
                task_status: task.completed ? 'completed' : 'pending',
                from_name: 'Task Manager',
                list_name: list.name,
                task_details: task.startLocation ? 
                    `Location: From ${task.startLocation} to ${task.endLocation}\n${task.travelTime}` : 
                    'No location details'
            }
        );

        if (response.status === 200) {
            playSound('reminder');
            alert('Notification sent successfully!');
        } else {
            throw new Error('Failed to send notification');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        alert(`Failed to send notification: ${error.message || 'Unknown error'}\n\nPlease check your EmailJS configuration.`);
    } finally {
        remindBtn.innerHTML = originalText;
        remindBtn.disabled = false;
    }
}

// Render all lists
function renderLists() {
    const listsContainer = document.getElementById('listsContainer');
    listsContainer.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = 'list-card';
        listElement.setAttribute('data-list-id', list.id);
        
        listElement.innerHTML = `
            <div class="list-header">
                <h2 class="list-title">${list.name}</h2>
                <div class="list-actions">
                    <button class="delete-list-btn" onclick="deleteList(${list.id})">Delete List</button>
                </div>
            </div>
        `;
        
        // Clone and append task form template
        const template = document.getElementById('taskFormTemplate');
        const taskForm = template.content.cloneNode(true);
        
        // Add event listeners
        const addTaskBtn = taskForm.querySelector('.add-task-btn');
        addTaskBtn.onclick = () => addTask(list.id);
        
        const filterBtns = taskForm.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => filterTasks(list.id, btn.getAttribute('data-filter'));
        });
        
        const clearBtn = taskForm.querySelector('.clear-btn');
        clearBtn.onclick = () => clearAllTasks(list.id);
        
        listElement.appendChild(taskForm);
        listsContainer.appendChild(listElement);
        
        // Render tasks for this list
        renderTasks(list.id);
    });
}

// Render tasks for a specific list
function renderTasks(listId, filter = 'all') {
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const listElement = document.querySelector(`[data-list-id="${listId}"]`);
    const taskList = listElement.querySelector('.task-list');
    const totalTasksSpan = listElement.querySelector('.total-tasks');
    const completedTasksSpan = listElement.querySelector('.completed-tasks');
    
    let filteredTasks = list.tasks;
    if (filter === 'active') {
        filteredTasks = list.tasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = list.tasks.filter(task => task.completed);
    }

    taskList.innerHTML = '';
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `priority-${task.priority}`;
        if (task.completed) li.classList.add('completed');

        let taskDetails = '';
        if (task.startLocation && task.endLocation) {
            taskDetails += `
                <div class="task-details">
                    📍 From: ${task.startLocation} To: ${task.endLocation}
                    ${task.travelTime ? `<br>🚗 ${task.travelTime}` : ''}
                </div>`;
        }
        if (task.collaborator) {
            taskDetails += `<div class="task-details">👥 Collaborator: ${task.collaborator}</div>`;
        }

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onclick="toggleTask(${listId}, ${task.id})">
                <span class="task-text">${task.text}</span>
                ${taskDetails}
            </div>
            <div class="task-actions">
                ${task.collaborator ? 
                    `<button class="remind-btn" onclick="sendNotification(${listId}, ${task.id})">
                        📧 Remind
                    </button>` : ''
                }
                <button class="delete-btn" onclick="deleteTask(${listId}, ${task.id})">Delete</button>
            </div>
        `;

        taskList.appendChild(li);
    });
    
    // Update stats
    totalTasksSpan.textContent = list.tasks.length;
    completedTasksSpan.textContent = list.tasks.filter(task => task.completed).length;
}

// Event listener for Enter key in list input
document.getElementById('listInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        createNewList();
    }
});

// Initial render
renderLists(); 