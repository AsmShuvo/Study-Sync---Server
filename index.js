const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: [
      "https://studysync-3a9c1.firebaseapp.com",
      "https://studysync-3a9c1.web.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
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

// created middleware
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  console.log("in midleware:", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized_" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // err

    if (err) {
      console.log("err:", err);
      return res.status(401).send({ message: "You are unauthorized" });
    }
    // valid
    console.log("Value in token", decoded);
    req.user = decoded;

    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const assignmentsCollection = client
      .db("assignmentDB")
      .collection("assignments");
    const submitCollection = client.db("assignmentDB").collection("submits");

    // auth related API
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("jwt:", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 24 * 60 * 60 * 1000,
        })
        .send({ success: true });
    });

    app.get("/assignments", logger, async (req, res) => {
      const cursor = assignmentsCollection.find();
      const result = await cursor.toArray();
      res.send(result); // after this the localhost:5000/assignments will show the data
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
    app.get("/submitted/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await submitCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    // delete items
    app.delete("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentsCollection.deleteOne(query);
      res.send(result);
    });

    //=============== submitted ========
    app.get("/submitted", logger, verifyToken, async (req, res) => {
      console.log(req.cookies.token);
      console.log(req.query.email, req.user.email);
      if (req.query.email) {
        if (req.query.email != req.user.email) {
          console.log("forbidden email");
          return res.status(403).send({ message: "forbidden access" });
        }
      }
      console.log("Verified user");
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const cursor = submitCollection.find(query);
      const result = await cursor.toArray();
      res.send(result); // after this the localhost:5000/submitted will show the data
    });
    // update assignmnet:
    app.put("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const filter = { _id: new ObjectId(id) };
      console.log(filter);
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
          email: updatedAssignment.email,
        },
      };
      const result = await assignmentsCollection.updateOne(
        filter,
        assignment,
        options
      );
      res.send(result);
    });
    // update the review and marks
    app.put("/submitted/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const reviewedAssignment = req.body;
      console.log("Reviewd:", reviewedAssignment);
      const assignment = {
        $set: {
          email: reviewedAssignment.email,
          doc: reviewedAssignment.doc,
          obtained: reviewedAssignment.obtained,
          pending_status: reviewedAssignment.pending_status,
          feedback: reviewedAssignment.feedback,
          title: reviewedAssignment.title,
          marks: reviewedAssignment.marks,
          difficulty: reviewedAssignment.difficulty,
          details: reviewedAssignment.details,
        },
      };
      const result = await submitCollection.updateOne(
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

    // app.use((error, req, res, next) => {
    //   if (error) {
    //     res.status(500).send("server error");
    //   }
    // });

    // await client.db("admin").command({ ping: 1 });
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
  res.send("StudySync server is running");
});
app.listen(port, () => {
  console.log(`server is runnig on port ${port}`);
});
