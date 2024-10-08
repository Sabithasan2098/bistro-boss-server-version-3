const { ObjectId, BSON } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT | 5000;

// for stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const userCollections = client.db("bistroDB").collection("users");
    const menuCollections = client.db("bistroDB").collection("menu");
    const reviewsCollections = client.db("bistroDB").collection("reviews");
    const cartsCollections = client.db("bistroDB").collection("carts");
    const paymentCollections = client.db("bistroDB").collection("payments");

    // api------------------
    // jwt related api-------------
    // JWT Token Generation
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h", // Expires in 1 hour
      });
      res.send({ token });
    });

    // JWT Middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }

      const token = req.headers.authorization.split(" ")[1]; // Extract the token
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded; // Correct assignment
        next(); // Proceed to the next middleware or route handler
      });
    };
    // isAdmin middleware----------
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };
    // post unique user data-------
    app.post("/users", async (req, res) => {
      const user = req.body;
      //to unique insert email if user doesn't exists
      const query = { email: user.email };
      const existingUser = await userCollections.findOne(query);
      if (existingUser) {
        return res.send({ message: "user's already exists", insertedId: null });
      } else {
        const result = await userCollections.insertOne(user);
        res.send(result);
      }
    });
    // get all users data------------
    app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });
    // create delete user-------------
    app.delete("/allUsers/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollections.deleteOne(query);
      res.send(result);
    });
    // update role of an user------
    app.patch(
      "/allUsers/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollections.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // check admin api-----
    app.get("/allUsers/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // menu api
    // post a menu data-----
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollections.insertOne(item);
      res.send(result);
    });
    // get menu data--------
    app.get("/menu", async (req, res) => {
      const cursor = menuCollections.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // ---------------------
    // get menu data by id--
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.findOne(query);
      res.send(result);
    });
    // delete a menu item---
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.deleteOne(query);
      res.send(result);
    });
    // update menu item
    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          recipe: item.recipe,
          image: item.image,
          category: item.category,
          price: item.price,
        },
      };
      const result = await menuCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // reviews api
    // get reviews data--------
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

    // stripe payment intent------------
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"], //its extra from other site
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // ----------------------------------
    // save the payment history----------

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollections.insertOne(payment);

      // now carefully delete cart when payment successfullt posted
      console.log(paymentResult);

      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartsCollections.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    });

    // get the payment data by user email-----------
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await paymentCollections.find(query).toArray();
      res.send(result);
    });

    // stats or analythics------------------------for admin------->

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollections.estimatedDocumentCount();
      const menuItems = await menuCollections.estimatedDocumentCount();
      const orders = await paymentCollections.estimatedDocumentCount();

      // get the revinue
      // const payments = await paymentCollections.find().toArray();
      // const revinue = payments.reduce(
      //   (total, payment) => total + payment.price,
      //   0
      // );
      // latest system------------------------->
      const payments = await paymentCollections
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevinue: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      const revinue = payments[0]?.totalRevinue || 0;

      res.send({ users, menuItems, orders, revinue });
    });

    // ------------------------------------->
    // stats

    app.get("/order-stats", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollections
        .aggregate([
          {
            $unwind: "$menuItemIds",
          },
          {
            $set: {
              menuItemIds: { $toObjectId: "$menuItemIds" },
            },
          },
          {
            $lookup: {
              from: "menu",
              localField: "menuItemIds",
              foreignField: "_id",
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems",
          },
          {
            $group: {
              _id: "$menuItems.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$menuItems.price" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              quantity: "$quantity",
              totalRevenue: "$revenue",
            },
          },
        ])
        .toArray();
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
