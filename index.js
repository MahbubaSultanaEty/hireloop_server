const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const logger = (req, res, next) => {
  console.log("Logger middleware LOGGed", req.params);
  next();
}


const uri = process.env.MONGO_URI;

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

    const database = client.db("hire_loop_db");
    const jobsCollection = database.collection("jobs");
    const compnayCollection = database.collection("company");
    const userCollection = database.collection('user')
    const applicationsCollection = database.collection('applications')
    const plansCollection = database.collection('plans');
    const subscriptionsCollection= database.collection('subscriptions')
    const sessionCollection= database.collection('session')

    // verification related 
    const verifyToken = async(req, res, next)=>{
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    return res.status(401).send({message: "unauthorized access"})
  }
  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" }) 
      }

      const query = { token: token };
      const session = await sessionCollection.findOne(query);
      console.log(session);
      const userId = session.userId;
      
      const userQuery = {
        _id: userId
      }
      const user = await userCollection.findOne(userQuery)
      req.user = user;
  next()
    }
    
    const verifySeeker = async (req, res, next) => {
      if (req.user?.role !== "seeker") {
        return res.status(403).send({message: "forbidden access"})
      }
      next()
    }

    const verifyRecruiter = async (req, res, next) => {
      if (req.user?.role !== 'recruiter') {
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    const verifyAdmin = async (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
    };
    

    app.get('/api/users', async (req, res) => {
      const cursor = userCollection.find().skip(6);
      const result = await cursor.toArray();
      res.send(result)
    })


    app.get("/api/jobs", async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/api/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await jobsCollection.findOne(query);
      res.send(result)
    })

    app.post("/api/jobs", async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date()
      }
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });


    // application related apis
    app.get('/api/applications',verifyToken,verifySeeker, async (req, res) => {
      const query = {};
      if (req.query.applicantId) {
        query.applicantId = req.query.applicantId;
        // check whther asking for this user or someone else
        console.log(req.user, req.query.applicantId);
        if (req.user._id.toString() !== req.query.applicantId) {
          return res.status(403).send({message: "forbidden access"})
        }
      }
      if (req.query.jobId) {
        query.jobId = req.query.jobId;
      }
      const cursor = applicationsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.post('/api/applications', async (req, res) => {
      const application = req.body;
      const result = await applicationsCollection.insertOne(application);
      res.send(result)
    })


    // company related api
    app.get('/api/companies', verifyToken, async (req, res) => {
      const cursor = compnayCollection.find().skip(3);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get("/api/my/companies", async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const result = await compnayCollection.find(query).toArray();
      res.send(result);
    });
    // get api for single company
    app.get('/api/companies/:id', async (req, res) => {
  const { ObjectId } = require('mongodb');
  const { id } = req.params;
  const result = await compnayCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});
    // PATCH update company by id
app.patch('/api/my/companies/:id',logger, verifyToken,verifyRecruiter, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await compnayCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.send(result);
});
  
    // patch company status
   app.patch(
  "/api/companies/:id/status",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await compnayCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { status },
      }
    );

    res.send(result);
  }
);

    app.post("/api/companies",verifyToken, verifyRecruiter, async (req, res) => {
      const company = req.body;
      const newCompany = {
        ...company,
        createdAt: new Date()
      }
      const result = await compnayCollection.insertOne(newCompany);
      res.send(result);
    });

    // plan related Api's
    app.get('/api/plans', async (req, res) => {
      const query = {}
      if (req.query.plan_id) {
        query.id= req.query.plan_id
      }
      const plan = await plansCollection.findOne(query);
      res.send(plan)
    })

    // subscription related api's
    app.post('/api/subscriptions', async (req, res) => {
      const data = req.body;
      const subsInfo = {
        ...data,
        createdAt: new Date()
      }
      const result = await subscriptionsCollection.insertOne(subsInfo);
      
      const filter = { email: data.email };
      const updateDocument = {
        $set: {
          plan: data.planId
        },
      };
      const updatedResult = await userCollection.updateOne(filter, updateDocument);
      res.send(updatedResult);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
