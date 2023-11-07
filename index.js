const express = require('express');
const cors = require('cors');
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


//middleware
app.use(express.json());
app.use(cors())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.klmlttn.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();
        const jobsCollection = client.db("jobHuntingDB").collection("jobs");
        const applicationCollection = client.db("jobHuntingDB").collection("application");



        // http://localhost:5000/api/v1/jobs?sortField=price&sortOrder=asc
        app.get('/api/v1/jobs', async (req, res) => {
            try {
                const email = req.query.user_email
                const category = req.query.job_category;
                const filter = {}
                if (category) {
                    filter.job_category = category
                }
                if (email) {
                    filter.user_email = email;
                }
                const result = await jobsCollection.find(filter).toArray();
                res.send(result);
            } catch (error) {
                console.log(error)
            }
        })

        app.post('/api/v1/jobs', async (req, res) => {
            try {
                const job = req.body;
                const result = await jobsCollection.insertOne(job);
                res.send(result);
            } catch (error) {
                console.log(error.message);
            }
        })
        //getting single jobs for showing the job details.
        app.get('/api/v1/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await jobsCollection.findOne(query);
                res.send(result)

            } catch (error) {
                console.log(error.message)
            }
        })
        app.put('/api/v1/jobs/:id', async (req, res) => {
            try {
                const job = req.body;
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };

                const updatedJob = {
                    $set: {
                        job_image: job.job_image,
                        job_title: job.job_title,
                        job_description: job.job_description,
                        job_category: job.job_category,
                        job_salary: job.job_salary,
                        job_posting_data: job.job_posting_data,
                        job_application_deadline: job.job_application_deadline,
                    },
                };
                const result = await jobsCollection.updateOne(filter, updatedJob, options);
                res.send(result);

            } catch (error) {
                console.log(error.message)
            }
        })

        app.delete('/api/v1/jobs/delete/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await jobsCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.log(error.message)
            }

        })

        app.post('/api/v1/make-application', async (req, res) => {
            try {
                const application = req.body;
                const result = await applicationCollection.insertOne(application);
                res.send(result);
            } catch (error) {
                console.log(error.message)
            }
        })
        app.get('/api/v1/applications', async (req, res) => {
            let query = {}
            const userEmail = req.query.user_email;
            if (userEmail) {
                query.user_email = userEmail
            }



            console.log(query)
            const result = await applicationCollection.find(query).toArray();
            res.send(result)
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



app.get('/', async (req, res) => {
    res.send('Job Hunting server is running.')
})


app.listen(port, () => {
    console.log(`Sever running on PORT: ${port}`)
})