const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n0rh1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // food apis
        const foodCollections = client.db('foodShare').collection('foods')
        const requestedCollection = client.db('foodShare').collection('requested')

        app.get('/foods', async (req, res) => {
            const filter = { status: "available" };


            const { search } = req.query

            // Include filter if there is any search parameter
            if (search) {
                filter.name = { $regex: search, $options: 'i' }
            }

            // filter = { name: { $regex: search, $options: 'i' } }

            const cursor = foodCollections.find(filter);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/foods', async (req, res) => {
            const newFood = req.body;
            const result = await foodCollections.insertOne(newFood)
            res.send(result)
        })

        app.put('/foods/:id', async (req, res) => {
            const { id } = req.params;
            const filter = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    status: 'requested'
                }
            }
            const result = await foodCollections.updateOne(filter, update, { upsert: true })
            const requestedFood = { food: new ObjectId(id), ...req.body }
            const result2 = await requestedCollection.insertOne(requestedFood)
            if (result.modifiedCount > 0 && result2.insertedId) {
                return res.send(result2)
            }
            res.send({
                success: false,
                message: "something went wrong"
            })
        })

        app.get('/requested/:email', async (req, res) => {
            const { email } = req.params;
            const requestedFoods = await requestedCollection.find({ userEmail: email }).toArray();
            const foodIds = requestedFoods.map(requested => requested.food);
            const foods = await foodCollections.find({
                _id: { $in: foodIds }
            }).toArray();
            const mergedData = requestedFoods.map(requested => {
                const foodDetail = foods.find(food => food._id.equals(requested.food)) || null;
                return {
                    ...foodDetail,
                    ...requested
                };
            });

            res.send(mergedData);

        })

        app.get('/featured', async (req, res) => {
            const cursor = foodCollections.find().sort({ quantity: -1 }).limit(6);
            const result = await cursor.toArray()
            res.send(result)
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send('foods are sharing')
})

app.listen(port, () => {
    console.log(`Food is waiting at: ${port}`);

})