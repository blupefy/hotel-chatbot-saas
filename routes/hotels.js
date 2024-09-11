const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = (db) => {
  // Create a new hotel profile
  router.post('/', async (req, res) => {
    try {
      const { name, website, description } = req.body;
      const newHotel = {
        name,
        website,
        description,
        createdAt: new Date(),
        dataSources: []
      };
      const result = await db.collection('hotels').insertOne(newHotel);
      res.status(201).json({ ...newHotel, _id: result.insertedId });
    } catch (error) {
      res.status(500).json({ error: 'Error creating hotel profile' });
    }
  });

  // Get all hotel profiles
  router.get('/', async (req, res) => {
    try {
      const hotels = await db.collection('hotels').find().toArray();
      res.json(hotels);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching hotel profiles' });
    }
  });

  // Get a specific hotel profile
  router.get('/:id', async (req, res) => {
    try {
      const hotel = await db.collection('hotels').findOne({ _id: new ObjectId(req.params.id) });
      if (hotel) {
        res.json(hotel);
      } else {
        res.status(404).json({ error: 'Hotel not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error fetching hotel profile' });
    }
  });

  // Update a hotel profile
  router.put('/:id', async (req, res) => {
    try {
      const { name, website, description } = req.body;
      const result = await db.collection('hotels').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, website, description, updatedAt: new Date() } }
      );
      if (result.matchedCount > 0) {
        res.json({ message: 'Hotel updated successfully' });
      } else {
        res.status(404).json({ error: 'Hotel not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error updating hotel profile' });
    }
  });

  // Delete a hotel profile
  router.delete('/:id', async (req, res) => {
    try {
      const result = await db.collection('hotels').deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount > 0) {
        res.json({ message: 'Hotel deleted successfully' });
      } else {
        res.status(404).json({ error: 'Hotel not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error deleting hotel profile' });
    }
  });

  // Add a new data source to a hotel
  router.post('/:id/datasources', async (req, res) => {
    try {
      const { id } = req.params;
      const { type, content } = req.body;

      let processedContent = '';

      if (type === 'url') {
        // Fetch and process URL content
        const response = await axios.get(content);
        const $ = cheerio.load(response.data);
        processedContent = $('body').text(); // Simple text extraction, can be improved
      } else if (type === 'text') {
        processedContent = content;
      } else {
        return res.status(400).json({ error: 'Invalid data source type' });
      }

      // Update hotel document with new data source
      const result = await db.collection('hotels').updateOne(
        { _id: new ObjectId(id) },
        { $push: { dataSources: { type, content: processedContent } } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      res.json({ message: 'Data source added successfully' });
    } catch (error) {
      console.error('Error adding data source:', error);
      res.status(500).json({ error: 'An error occurred while adding the data source' });
    }
  });

  return router;
};