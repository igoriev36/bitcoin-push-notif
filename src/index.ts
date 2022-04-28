import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import firebaseAccountCredential from './proj.json';
import dbConnect from './database';
import axios from 'axios';
import config from './config';
import RegistrationToken from './database/models/registrationToken';
import Alert from './database/models/alert';
import cron from 'node-cron';

const serviceAccount = firebaseAccountCredential as admin.ServiceAccount;

const notification_options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

dbConnect();

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

const sendNotification = async (registrationToken: string) => {
  try {
    const options = notification_options;
    const payload = {
      notification: {
        title: 'My first notification',
        body: 'There have been a 5% change on your bitcoin',
      },
    };
    return await admin.messaging().sendToDevice(registrationToken, payload, options);
  } catch (err) {
    throw err;
  }
};

app.post('/register-user', async (req, res) => {
  try {
    /* Registration token and userId will be sent from the app client,
    when the user installs or runs the app */
    const { userId, registrationToken } = req.body;
    if (userId === '' || !userId || registrationToken === '' || !registrationToken) {
      return res.status(422).json({ message: 'Invalid request body, expected valid userId and registration token' });
    }
    const userExist = await RegistrationToken.findOne({ user: userId });
    if (userExist) return res.status(409).json({ message: 'User already registered' });
    const newRegToken = {
      token: registrationToken,
      user: userId,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      // For now we set it as true, till we know if the user really has a bitcoin
      hasBitcoin: true,
    };
    const newAlert = {
      user: userId,
      // Initial Jan 1, 2010
      lastSend: 1262360134000,
      createdAt: new Date().getTime(),
    };

    // Create/Store Registration Token in our DB
    await RegistrationToken.create(newRegToken);

    // Create Alert
    await Alert.create(newAlert);

    return res.status(201).json({ message: 'User register successful' });
  } catch (err) {
    return res.status(500).json({ message: err.message || err });
  }
});

const sendNotificationOps = async () => {
  try {
    /* Fetch Latest, note that we will move this into the await Promise (Line 61)
    once we know how to fetch real user's bitcoin */
    const resp = await axios.get(`${config.COIN_MARKET_URL}/v1/cryptocurrency/listings/latest`, {
      headers: {
        'X-CMC_PRO_API_KEY': `${config.COIN_MARKET_API_KEY}`,
      },
    });

    // Example Bitcoin
    const usdBtc = resp.data.data[0].quote.USD;

    // We fetch all our user registration tokens
    let userTokens = await RegistrationToken.find();

    // Filter users who only has bitcoin
    userTokens.filter((u) => u.hasBitcoin);
    // Now date
    const date = new Date().getTime();

    // Loop through our users who has bitcoins
    await Promise.all(
      userTokens.map(async (tk) => {
        // Find user's alert object
        const alert = await Alert.findOne({ user: tk.user });

        // Checking difference in hrs between now and last time we sent a notification
        let diff = date - alert.lastSend;

        // Get hours in a millisecond
        diff = diff / 3.6e6;

        /* If there is a 5% or greater change on bitcoin and we haven't sent 
        alert in last 12 hrs then we send a notification */
        if (usdBtc.percent_change_1h >= 0.5 && diff >= 12) {
          const update = { avg_change: usdBtc.percent_change_1h, lastSend: date };
          await Alert.findOneAndUpdate({ user: tk.user }, update);

          // Send Notification
          await sendNotification(tk.token);
        }
      })
    );
  } catch (err) {
    console.log(err);
  }
};

// Cron job to run every hour
cron.schedule('0 * * * *', sendNotificationOps);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
