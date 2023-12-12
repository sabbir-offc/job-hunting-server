const express = require('express');
const cors = require('cors');
const app = express();
require("dotenv").config();
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


//middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:5173', 'https://job-hunting-cf12c.web.app'],
    credentials: true
}
));




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
        const blogsCollection = client.db("jobHuntingDB").collection("blogs");
        const usersCollection = client.db("jobHuntingDB").collection("users");
        const savedJobs = client.db("jobHuntingDB").collection("savedJobs");

        //verify Token
        const verifyToken = async (req, res, next) => {
            try {
                const { token } = req?.cookies;
                if (!token) {
                    return res.status(401).send({ message: 'unAuthorized' })
                }
                jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                    if (err) {
                        return res.status(401).send({ message: 'unAuthorized' })
                    }
                    req.user = decoded;
                    next()
                })
            } catch (error) {
                console.log(error.message)
            }

        }


        const gateMan = async (req, res, next) => {
            try {
                const { token } = req?.cookies;
                if (!token) {
                    return res.status(401).send({ message: 'unAuthorized' })
                }
                jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                    if (err) {
                        return res.status(401).send({ message: 'unAuthorized' })
                    }
                    req.data = decoded;
                    next()
                })
            } catch (error) {
                console.log(error.message)
            }
        }
        //jwt 
        app.post('/api/v1/auth/access-token', async (req, res) => {
            try {
                const userEmail = req.body
                const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
                    expiresIn: '2h'
                })
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'

                }).send({ success: true })
            } catch (error) {
                console.log(error.message)
            }

        })
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
                        minimum_salary: job.minimum_salary,
                        maximum_salary: job.maximum_salary,
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
                const jobId = application?.jobId
                const existingApplication = await applicationCollection.findOne({ jobId });
                if (existingApplication) {
                    await applicationCollection.updateOne(
                        { jobId },
                        { $set: application }
                    );
                    res.send({ message: "You Already applied to this job." });
                } else {
                    const result = await applicationCollection.insertOne(application);
                    res.send(result);
                }
            } catch (error) {
                console.log(error.message)
            }
        })

        app.post('/api/v1/job-application-number/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { job_application_number: 1 } }
            );
            res.send(result);
        })
        app.delete('/api/v1/applications/delete/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await applicationCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.log(error.message)
            }
        })
        app.get('/api/v1/applications', verifyToken, async (req, res) => {
            const user = req?.user;
            const userEmail = req.query.user_email;
            const category = req.query.job_category
            const filter = {}
            if (category) {
                filter.job_category = category
            }
            if (user?.email !== userEmail) {
                return res.status(403).send({ message: "forbidden access." })
            }


            if (userEmail) {
                filter.user_email = userEmail
            }
            const result = await applicationCollection.find(filter).toArray();
            res.send(result)
        })

        app.post('/api/v1/blogs', async (req, res) => {
            const blog = req.body;
            const result = await blogsCollection.insertOne(blog);
            res.send(result);
        })

        app.get('/api/v1/blogs', async (req, res) => {
            const result = await blogsCollection.find().toArray();
            res.send(result);
        })
        app.get('/api/v1/blogs/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await blogsCollection.findOne(query);
            res.send(result);
        })

        app.post('/api/v1/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })



        app.get('/api/v1/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })


        app.post('/api/v1/saved-jobs', async (req, res) => {
            try {
                const savedJob = req.body;
                const result = await savedJobs.insertOne(savedJob);
                res.send(result);
            } catch (error) {
                console.log(error.message)
            }
        })
        app.get('/api/v1/saved-jobs', gateMan, async (req, res) => {
            const user = req.data
            const userEmail = req.query?.email;
            let filter = {};
            if (userEmail) {
                filter.email = userEmail
            };
            if (user?.email !== userEmail) {
                return res.status(403).send({ message: "forbidden access." })
            };
            const result = await savedJobs.find(filter).toArray();
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

