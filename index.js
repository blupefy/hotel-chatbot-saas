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
        res.status(500).json({ 
          error: 'An error occurred while processing your request',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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