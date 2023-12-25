const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const apiKey = process.env.API_KEY;
const mongoURI = process.env.MONGO_URI;
const moment = require('moment');


app.use(express.json());
app.use(cors());

let db;
let currentCollection;

// Connect to MongoDB and create a new collection for this session
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((client) => {
        console.log('Connected to MongoDB');
        db = client.db();
        currentCollection = `session_${moment().format('YYYYMMDD_HHmmssSSS')}`;
        db.createCollection(currentCollection);
        console.log(`Using collection: ${currentCollection}`);
    })
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Middleware to update in-memory conversation history for each request
app.use((req, res, next) => {
    req.currentCollection = currentCollection;
    next();
});


app.post('/completions', async (req, res) => {
    try {
        const userPrompt = req.body.message;
        const timestamp = new Date().toISOString();

        // Update in-memory conversation history
        await db.collection(req.currentCollection).insertOne({ role: 'user', content: userPrompt, timestamp });

        // Format the conversation history and the new user request
        const messageData = await db.collection(req.currentCollection).find({}).toArray();
        const systemMessage = "Conversation history:\n" + messageData.map(m => `${m.role} [${m.timestamp}]: ${m.content}`).join("\n");
        const userMessage = "New request: " + userPrompt;

        // Make a POST request to OpenAI's chat API
        const response = await axios({
            method: 'post',
            url: 'https://api.openai.com/v1/chat/completions',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            data: { 'model': 'gpt-3.5-turbo', 'messages': [{ "role": "system", "content": systemMessage }, { "role": "user", "content": userMessage }] }
        });

        // Log the AI's response
        console.log(response.data['choices'][0]['message']['content']);

        // Add the new user request and the AI's response to the message history in MongoDB
        await db.collection(req.currentCollection).insertMany([
            { "role": "user", "content": userPrompt, "timestamp": timestamp },
            { "role": "assistant", "content": response.data['choices'][0]['message']['content'], "timestamp": timestamp }
        ]);

        // Send the AI's response to the client
        res.json({ response: response.data['choices'][0]['message']['content'] });
    } catch (e) {
        // If an error occurred, log it to the console and send an error response to the client
        console.error('An error occurred:', e);
        res.status(500).json({ error: 'An error occurred while interacting with the OpenAI API. Please check the console for more details.' });
    }
});

app.post('/shutdown', async (req, res) => {
    try {
        // Send a response to the client
        res.json({ message: 'Conversation history saved to MongoDB' });

        // Terminate the server
        process.exit();
    } catch (e) {
        // Log any errors that occur
        console.error('Error saving conversation history:', e);
        res.status(500).json({ error: 'An error occurred while saving conversation history.' });
    }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');

    // Save conversation history to the current collection
    console.log(`Saving conversation history to collection: ${currentCollection}`);
    await db.collection(currentCollection).insertMany(conversationHistory);

    // Close the MongoDB connection
    await db.client.close();

    console.log('Server shut down.');
    process.exit();
});

// Start the server
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));