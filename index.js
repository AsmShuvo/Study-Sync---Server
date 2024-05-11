const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

app.use(morgan("dev"));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ezfvwv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const assignmentsCollection = client
      .db("assignmentDB")
      .collection("assignments");
    const submitCollection = client.db("assignmentDB").collection("submits");

    app.get("/assignments", async (req, res) => {
      const cursor = assignmentsCollection.find();
      const result = await cursor.toArray();
      res.send(result); // after this the localhost:5000/spots will show the data
    });
    app.post("/assignments", async (req, res) => {
      const newAssignment = req.body;
      console.log(newAssignment);
      const result = await assignmentsCollection.insertOne(newAssignment);
      // console.log(result);
      res.send(result);
    });

    app.get("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentsCollection.findOne(query);
      // console.log(result);
      res.send(result);
    });

    // delete items
    app.delete("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentsCollection.deleteOne(query);
      res.send(result);
    });

    // update assignmnet:
    app.put("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedAssignment = req.body;
      console.log(updatedAssignment);
      const assignment = {
        $set: {
          image: updatedAssignment.image,
          title: updatedAssignment.title,
          deadline: updatedAssignment.deadline,
          details: updatedAssignment.details,
          difficulty: updatedAssignment.difficulty,
          marks: updatedAssignment.marks,
        },
      };
      const result = await assignmentsCollection.updateOne(
        filter,
        assignment,
        options
      );
      res.send(result);
    });
    // post submitted assignments
    app.post("/submitted", async (req, res) => {
      const submittedAssignment = req.body;
      console.log(submittedAssignment);
      const result = await submitCollection.insertOne(submittedAssignment);
      // console.log(result);
      res.send(result);
    });

    // client side error
    app.use((req, res) => {
      res.status(404).send("not found");
    });

    // app.use((error, req, res, next) => {
    //   if (error) {
    //     res.status(500).send("server error");
    //   }
    // });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!!!!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("StudySync is running");
});
app.listen(port, () => {
  console.log(`server is runnig on port ${port}`);
});
