const express = require('express');
const { connectToDatabase } = require('./config/database');
const hotelRoutes = require('./routes/hotels');
const { ObjectId } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

async function startServer() {
  try {
    // Connect to the database
    const db = await connectToDatabase();
    console.log('Successfully connected to MongoDB!');

    // Set up routes
    app.use('/api/hotels', hotelRoutes(db));

    // Root route
    app.get('/', (req, res) => {
      res.send('Welcome to Hotel Chatbot SaaS');
    });

    // Chatbot route
    app.post('/api/chat', async (req, res) => {
      try {
        const { message, hotelId } = req.body;
        console.log('Received chat request:', { message, hotelId });

        if (!hotelId) {
          return res.status(400).json({ error: 'Hotel ID is required' });
        }

        const hotel = await db.collection('hotels').findOne({ _id: new ObjectId(hotelId) });
        console.log('Retrieved hotel data:', hotel);

        if (!hotel) {
          console.log('Hotel not found');
          return res.status(404).json({ error: 'Hotel not found' });
        }

        let context = `You are an AI assistant for ${hotel.name}. 
                       Website: ${hotel.website}
                       Description: ${hotel.description}
                       Please answer questions about this hotel based on the following information:`;

        if (hotel.dataSources && hotel.dataSources.length > 0) {
          hotel.dataSources.forEach((source, index) => {
            context += `\n\nSource ${index + 1}:\n${source.content}`;
          });
        }
        context += "\n\nPlease use the above information to answer the user's question accurately.";

        console.log('Context being sent to Stack AI:', context);

        const stackAiResponse = await axios.post(
          'https://api.stack-ai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo-16k', // or another model of your choice
            messages: [
              { role: 'system', content: context },
              { role: 'user', content: message }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.STACK_AI_API_KEY}`
            }
          }
        );

        console.log('Raw Stack AI API response:', stackAiResponse.data);

        const aiReply = stackAiResponse.data.choices[0].message.content;
        console.log('Processed Stack AI API response:', aiReply);

        res.json({ reply: aiReply });
      } catch (error) {
        console.error('Detailed chat error:', error);
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Stack AI API error response:', error.response.data);
          console.error('Stack AI API error status:', error.response.status);
          res.status(error.response.status).json({ 
            error: 'Error from Stack AI API',
            details: error.response.data
          });
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from Stack AI API');
          res.status(500).json({ 
            error: 'No response from Stack AI API',
            details: 'The request was made but no response was received'
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error setting up request to Stack AI API:', error.message);
          res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
          });
        }
      }
    });

    // Start the server
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
}

startServer();