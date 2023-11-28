const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
var jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET)
// middleware 
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tjhl6td.mongodb.net/?retryWrites=true&w=majority`;

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
        client.connect();


        const usersCollection = client.db("FMMatrimony").collection("users");
        const favCollection = client.db("FMMatrimony").collection("fav");
        const paymentCollection = client.db("FMMatrimony").collection("payment");



        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: 60 * 60 * 60 })
            res.send({ token })
        })

        app.post('/favorite', async (req, res) => {
            const favData = req.body;


            const query = { favId: favData.favId }
            console.log(query);
            const existingFav = await favCollection.findOne(query);
            if (existingFav) {
                return res.send({ message: 'fav already exist', insertedId: null })
            }

            console.log(favData);
            const result = await favCollection.insertOne(favData);
            res.send(result);
        })



        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/allusers', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });


        app.put('/users/:id', async (req, res) => {
            const user = req.body;
            const id = req.params.id;
            console.log(id);
            const query = {
                _id: new ObjectId(id)
            }

            const currentDate = new Date().toLocaleString(); // Local current date and time
            console.log(currentDate);
            const existingUser = await usersCollection.findOne(query);
            // console.log(existingUser);

            const options = { upsert: true }
            const users = {
                $set: {

                    date: existingUser && existingUser.date ? existingUser.date : currentDate,
                    biodataType: user.biodataType,
                    name: user.name,
                    photo: user.photo,
                    dateOfBirth: user.dateOfBirth,
                    height: user.height,
                    weight: user.weight,
                    age: user.age,
                    occupation: user.occupation,
                    race: user.race,
                    fathersName: user.fathersName,
                    mothersName: user.mothersName,
                    permanentDivisionName: user.permanentDivisionName,
                    presentDivisionName: user.presentDivisionName,
                    expectedPartnerAge: user.expectedPartnerAge,
                    expectedPartnerHeight: user.expectedPartnerHeight,
                    expectedPartnerWeight: user.expectedPartnerWeight,
                    email: user.contactEmail,
                    mobileNumber: user.mobileNumber,
                }
            }
            console.log('::', users);
            const result = await usersCollection.updateOne(query, users, options);
            res.send(result);
        })


        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "bdt",
                payment_method_types: [
                    "card"
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const query = { email: payment.email }
            const existingUser = await paymentCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'payment already exist', insertedId: null })
            }

            const paymentResult = await paymentCollection.insertOne(payment);
            res.send({paymentResult})      
            
          })

        // app.post('/bioData', async (req, res) => {
        //     const bioData = req.body;
        //     const result = await bioDataCollection.insertOne(bioData);
        //     res.send(result);
        // })








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('server is running')
})
app.listen(port, () => {
    console.log(`running on port ${port}`);
    console.log(`waiting for ping...`);
})