const { ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT | 5000;

// middleware
app.use(cors());
app.use(express.json());

// monoDB-----------------------

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wgolkq8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections----------
    const menuCollections = client.db("bistroDB").collection("menu");
    const reviewsCollections = client.db("bistroDB").collection("reviews");
    const cartsCollections = client.db("bistroDB").collection("carts");

    // api------------------
    // get menu data--------
    app.get("/menu", async (req, res) => {
      const cursor = menuCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // ---------------------
    // get menu data--------
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // ---------------------
    // post a cart data-----
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollections.insertOne(cartItem);
      res.send(result);
    });
    // ---------------------
    // get cart data using users email--------
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollections.find(query).toArray();
      res.send(result);
    });
    // --------------------
    // delete cart data by id----------

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollections.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
