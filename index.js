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
        const premiumReqCollection = client.db("FMMatrimony").collection("premiumReq");
        const successStoriesCollection = client.db("FMMatrimony").collection("successStories");



        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: 60 * 60 * 60 })
            res.send({ token })
        })

        const verifyToken = (req, res, next) => {

            console.log('inside verify token: ', req.headers.authorization);

            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            const token = req.headers.authorization.split(' ')[1];

            jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            next();
        }



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

        app.get('/favorite', async (req, res) => {
            const result = await favCollection.find().toArray();
            // console.log(result);
            res.send(result);
        });

        app.delete('/favorite/:id', verifyToken, async (req, res) => {

            const itemId = req.params.id;
            const userEmail = req.query.email;
            const query = {
                favId: itemId,
                myEmail: userEmail
            }
            const result = await favCollection.deleteOne(query);
            res.send(result);
        });

        app.post('/successStories', async (req, res) => {
            const success = req.body;
            console.log(success);
            const Result = await successStoriesCollection.insertOne(success);
            res.send(Result)

        })
        app.get('/successStories', async (req, res) => {
            const Result = await successStoriesCollection.find().toArray();
            res.send(Result)

        })

        app.delete('/successStories/:id', verifyToken, verifyAdmin, async (req, res) => {
            
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const Result = await successStoriesCollection.deleteOne(query);
            res.send(Result)

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

        // update userss 

        app.put('/users/:id', verifyToken, async (req, res) => {
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

        app.patch('/userToAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);

        })
        app.patch('/userToPremium/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    userType: 'premium'
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc);
            res.send(result);

        })

        //////////////////////////////////////////////////////////////////////////////////////////

        app.post('/userToPremium', async (req, res) => {
            const premium = req.body;

            const existingUser = await premiumReqCollection.findOne({ email: premium.email });
            if (existingUser) {
                return res.send({ message: 'user already requested once', insertedId: null })
            }
            console.log('premium req:', premium);
            const result = await premiumReqCollection.insertOne(premium);
            res.send(result)

        })

        app.get('/premiumReqCollection', async (req, res) => {
            const result = await premiumReqCollection.find().toArray();
            res.send(result);
        });
        app.patch('/premiumReqCollection/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const updatedDoc = {
                $set: {
                    userType: 'premium'
                }
            }
            console.log('196 query', query);
            const result1 = await premiumReqCollection.updateOne(query, updatedDoc);
            const result2 = await usersCollection.updateOne(query, updatedDoc);
            res.send({ result1, result2 });

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

        // payment and request start

        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const paymentResult = await paymentCollection.insertOne(payment);
            res.send({ paymentResult })

        })

        // get payments users or requested user contact 
        app.get('/requestedUsers', verifyToken, async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        });

        app.delete('/requestedUsers/:itemId', verifyToken, async (req, res) => {
            const id = req.params.itemId;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await paymentCollection.deleteOne();
            res.send(result);
        });

        app.patch('/approvedContactRequest/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await paymentCollection.updateOne(query, updatedDoc);
            res.send(result);

        })

        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });

        })





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
    console.log(`Full Moon Matrimony running on port ${port}`);
    console.log(`FMM is waiting for DB ping...`);
})