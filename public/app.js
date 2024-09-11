let hotels = [];
let currentHotelId = null;

async function fetchHotels() {
    try {
        const response = await fetch('/api/hotels');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        hotels = await response.json();
        displayHotels();
    } catch (error) {
        console.error('Error fetching hotels:', error);
        alert('Failed to fetch hotels. Please try again later.');
    }
}

function displayHotels() {
    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = '';
    hotels.forEach(hotel => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${hotel.name} - ${hotel.website}
            <button class="editBtn" data-id="${hotel._id}">Edit</button>
            <button class="deleteBtn" data-id="${hotel._id}">Delete</button>
            <button class="chatBtn" onclick="showChatbot('${hotel._id}')">Chat</button>
            <button class="addSourceBtn" onclick="showAddDataSource('${hotel._id}')">Add Data Source</button>
        `;
        hotelList.appendChild(li);
    });
}

async function addHotel(event) {
    event.preventDefault();
    const name = document.getElementById('hotelName').value;
    const website = document.getElementById('hotelWebsite').value;
    const description = document.getElementById('hotelDescription').value;

    try {
        const response = await fetch('/api/hotels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, website, description })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newHotel = await response.json();
        hotels.push(newHotel);
        displayHotels();
        event.target.reset();
    } catch (error) {
        console.error('Error adding hotel:', error);
        alert('Failed to add hotel. Please try again.');
    }
}

async function deleteHotel(id) {
    try {
        const response = await fetch(`/api/hotels/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        hotels = hotels.filter(hotel => hotel._id !== id);
        displayHotels();
    } catch (error) {
        console.error('Error deleting hotel:', error);
        alert('Failed to delete hotel. Please try again.');
    }
}

function editHotel(id) {
    const hotel = hotels.find(h => h._id === id);
    if (hotel) {
        document.getElementById('hotelName').value = hotel.name;
        document.getElementById('hotelWebsite').value = hotel.website;
        document.getElementById('hotelDescription').value = hotel.description || '';

        const form = document.getElementById('hotelForm');
        form.onsubmit = async (event) => {
            event.preventDefault();
            const updatedHotel = {
                name: document.getElementById('hotelName').value,
                website: document.getElementById('hotelWebsite').value,
                description: document.getElementById('hotelDescription').value
            };
            try {
                const response = await fetch(`/api/hotels/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedHotel)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const index = hotels.findIndex(h => h._id === id);
                hotels[index] = { ...hotels[index], ...updatedHotel };
                displayHotels();
                form.reset();
                form.onsubmit = addHotel;
            } catch (error) {
                console.error('Error updating hotel:', error);
                alert('Failed to update hotel. Please try again.');
            }
        };
    }
}

function showChatbot(hotelId) {
    currentHotelId = hotelId;
    document.getElementById('chatbot').style.display = 'block';
    document.getElementById('chatMessages').innerHTML = ''; // Clear previous messages
}

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (message && currentHotelId) {
        addMessageToChat('You: ' + message);
        userInput.value = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, hotelId: currentHotelId })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received chat response:', data);
            if (data.reply) {
                addMessageToChat('Chatbot: ' + data.reply);
            } else {
                throw new Error('No reply in response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToChat('Chatbot: Sorry, I encountered an error. Please try again later.');
        }
    }
}

function addMessageToChat(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showAddDataSource(hotelId) {
    currentHotelId = hotelId;
    document.getElementById('dataSourceForm').style.display = 'block';
}

async function addDataSource() {
    const type = document.getElementById('sourceType').value;
    const content = document.getElementById('sourceContent').value;

    try {
        const response = await fetch(`/api/hotels/${currentHotelId}/datasources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, content })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('Data source added successfully');
        document.getElementById('dataSourceForm').style.display = 'none';
        document.getElementById('sourceContent').value = '';
    } catch (error) {
        console.error('Error adding data source:', error);
        alert('Failed to add data source. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchHotels();
    document.getElementById('hotelForm').addEventListener('submit', addHotel);
    document.getElementById('hotelList').addEventListener('click', (e) => {
        if (e.target.classList.contains('deleteBtn')) {
            deleteHotel(e.target.dataset.id);
        } else if (e.target.classList.contains('editBtn')) {
            editHotel(e.target.dataset.id);
        }
    });
});