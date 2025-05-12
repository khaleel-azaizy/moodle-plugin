const express = require('express')
const { getDb, connectToDb } = require('./db')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { ObjectId } = require('mongodb');
const e = require('express');
const auth = require('./auth');
const moodleApi = require('./moodleApi');

const app = express()
app.use(express.json())
app.use(cookieParser());  
app.use(cors({origin: 'http://localhost:3000',credentials: true}));

let db

connectToDb((err) => {
  if(!err){
    app.listen('4000', () => {
      console.log('app listening on port 4000')
    })
    db = getDb()
  }
})
 
const JWT_SECRET = process.env.JWT_SECRET;

app.get('/api/courses/:userid', async (req, res) => {
  const { userid } = req.params;

  try {
    const courses = await moodleApi('core_enrol_get_users_courses', { userid });
    console.log('✅ Moodle response:', courses);
    res.json(courses);
  } catch (err) {
    console.error('❌ Moodle fetch failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch courses from Moodle' });
  }
});

app.get('/api/assignments', async (req, res) => {
  try {
    const data = await moodleApi('mod_assign_get_assignments');
    const allAssignments = data.courses.flatMap(c => c.assignments);
    res.json(allAssignments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

app.get('/api/quizzes', async (req, res) => {
  const courseids = [2, 3]; 
  try {
    const data = await moodleApi('mod_quiz_get_quizzes_by_courses', {
      'courseids[0]': courseids[0],
      'courseids[1]': courseids[1]
    });
    res.json(data.quizzes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});


app.get('/api/auto-login/:moodleId', async (req, res) => {
  const moodleId = parseInt(req.params.moodleId);

  try {
    const [moodleUser] = await moodleApi('core_user_get_users_by_field', {
      field: 'id',
      values: [moodleId],
    });

    if (!moodleUser) {
      return res.status(404).json({ error: 'Moodle user not found' });
    }

    let user = await db.collection('Users').findOne({ moodleId });

    if (!user) {
      const newUser = {
        moodleId,
        name: `${moodleUser.firstname} ${moodleUser.lastname}`,
        email: moodleUser.email,
        events: [],
        notes: [],
        createdAt: new Date(),
      };

      const result = await db.collection('Users').insertOne(newUser);
      user = await db.collection('Users').findOne({ _id: result.insertedId });
    }

    const id = user._id.toString();
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '1d' });

    await db.collection('UserTokens').updateOne(
      { userId: new ObjectId(id) },
      { $push: { tokens: token } },
      { upsert: true }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('userid', id, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Auto-login success' });
  } catch (err) {
    console.error('❌ Auto-login failed:', err.message);
    res.status(500).json({ error: 'Auto-login failed', details: err.message });
  }
});

   
  app.post('/register', (req, res) => {
    const User = req.body;
     
    db.collection('Users').findOne({ email: User.email })
    .then(doc =>{
      if(doc){   
        res.status(500).json(doc)
      } else{
        const saltRounds = 10;
        const hashedPassword =  bcrypt.hash(User.password, saltRounds);
        const newUser = ({
          email: User.email,
          name: User.name,
          password: hashedPassword,
        });
        db.collection('Users').insertOne(newUser);
        db.collection('UserTokens').insertOne({userId: newUser._id, tokens: []})
        res.json(200)
      }
    })
        
      });

    app.get('/refresh',auth, async (req, res) => {
      try {
        
        const { token } = req.cookies;
        
        if (!token) {
          return res.status(401).json({ error: 'No refresh token' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
       
        db.collection('UserTokens').findOne({ userId: new ObjectId(decoded.userId )})
        .then(doc =>{
          if(!doc.tokens.includes(token)){
            res.status(401).json({ error: 'Invalid refresh token' });
          } else{
            res.status(200).json();
          }
        })
      } catch (error) {}
    });

    app.post('/add-event/:userId',auth,async (req, res) => {
      try {
        
        const userId = req.params.userId;
        const eventData = req.body;
        console.log('Received event data:', eventData);
       
          for(let i=0;i<eventData.length;i++){
          await db.collection('Users').updateOne(
            { _id: new ObjectId(userId) },
            { $push: { events: { eventId: new ObjectId(), ...eventData[i] } } }
          );
        }
       
    
        res.status(200).send({ message: 'Event added successfully' });
      } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).send({ error: 'Failed to add event' });get-one-time-events
      }
    });

    app.get('/get-one-time-events/:userid', auth, async (req, res) => {
      try {
       
        const userId = req.params.userid;
        const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });
        if (user && user.events) {
          const oneTimeEvents = user.events.filter(event => event.isPermanent === false);
          res.status(200).json(oneTimeEvents);
        } else {
          res.status(404).json({ error: 'User or events not found' });
        }
      } catch (error) {
        console.error('Error fetching one-time events:', error);
        res.status(500).json({ error: 'Failed to fetch one-time events' });
      }
    });
  
    app.get('/get-events/:userid',auth, async (req, res) => {
      try {
        const userId = req.params.userid;
        const user = await db.collection('Users').findOne( { _id: new ObjectId(userId)  });
        res.status(200).json(user.events); 
      } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });

    app.delete('/delete-event/:userid/:id',auth, (req, res) => {
      
      const userId = req.params.userid;
      const eventId = req.params.id;
      
      db.collection('Users').updateOne({ _id: new ObjectId(userId) },
       { $pull: { events: { id: eventId } } })
        .then(() => {
          res.status(200).send({ message: 'Event deleted successfully' });
        })
        .catch((err) => {
          res.status(500).send({ error: 'Failed to delete event', details: err });
        });
    });

    app.put('/update-event/:userid/:id',auth, async (req, res) => {
      try {
        const eventId = req.params.id;
        const userId = req.params.userid;
        const updatedData = req.body;
        
        console.log('Received updated data:',updatedData)
        if ( !updatedData.date) {
          return res.status(400).send({ error: 'Missing required fields' });
        }
        
        const result = await db.collection('Users').updateOne(
          { _id: new ObjectId(userId), "events.id": eventId },
          { 
            $set: {
              
              "events.$.date": updatedData.date,
              
            } 
          }
        );
        

        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: 'Event not found' });
        }
    
        res.status(200).send({ message: 'Event updated successfully' });
      } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send({ error: 'Failed to update event', details: error.message });
      }
    });

    app.get('/get-notes/:userid',auth, async (req, res) => {
      try {
        const userId = req.params.userid;
        const user = await db.collection('Users').findOne( { _id: new ObjectId(userId)  });
        res.status(200).json(user.notes); 
      } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
      }
    });

    app.post('/add-note/:userId',auth, async (req, res) => {
      try {
        const userId = req.params.userId;
        const noteData = req.body; 
        await db.collection('Users').updateOne(
          { _id: new ObjectId(userId) },
          { $push: { notes: { noteId: noteData.noteId, description: noteData.description } } }
        );
    
        res.status(200).send({ message: 'note added successfully' });
      } catch (error) {
        console.error('Error adding notes:', error);
        res.status(500).send({ error: 'Failed to add notes' });
      }
    });

    app.delete('/delete-note/:userid/:noteid',auth, async (req, res) => {
      try {
        const userId = req.params.userid;
        const noteId = req.params.noteid;
        
        console.log('Received updated data:',noteId)
      
        const result = await db.collection('Users').updateOne(
          { _id: new ObjectId(userId)},
          { 
            $pull: {
            notes: {noteId: noteId}
            } 
          }
        );
        

        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: 'Event not found' });
        }
    
        res.status(200).send({ message: 'Event updated successfully' });
      } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send({ error: 'Failed to update event', details: error.message });
      }
    });

    app.put('/update-notes/:userid', auth, async (req, res) => {
      try {
        const userId = req.params.userid;
        const updatedOrder = req.body;

        if (!updatedOrder.every(note => note.noteId && note.description)) {
          return res.status(400).send({ error: 'Invalid data format. Each note must have noteId and description.' });
        }

        if (!Array.isArray(updatedOrder)) {
          return res.status(400).send({ error: 'Invalid data format. Expected an array of notes.' });
        }

        const result = await db.collection('Users').updateOne(
          { _id: new ObjectId(userId) },
          { $set: { notes: updatedOrder } }
        );

        res.status(200).send({ message: 'Notes order updated successfully' });
      } catch (error) {
        console.error('Error updating notes order:', error);
        res.status(500).send({ error: 'Failed to update notes order', details: error.message });
      }
    });

    app.post('/logout', async (req, res) => {
      const { token } = req.cookies;
      if (!token) {
        return res.status(401).json({ error: 'No refresh token' });
      }
      const decoded = jwt.verify(token, JWT_SECRET);

       db.collection('UserTokens').updateOne(
        { 
          userId: new ObjectId(decoded.userId) },
        { $pull: { tokens: token } }
      )
      .then(() => {
        res.clearCookie('token');
        res.status(200).json({ message: 'Logged out successfully' });
      })
      .catch((err) => {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Failed to logout' });
      });
   
  });
 