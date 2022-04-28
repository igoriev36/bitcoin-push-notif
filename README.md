### Readme

### User Setup

1. On the app client, after the user installs, or runs the app for the firstime, configure firebase and,
   retrieve the device registration token, you may check this (Android: https://firebase.google.com/docs/cloud-messaging/android/client, iOS: https://firebase.google.com/docs/cloud-messaging/ios/client)

2. Directly after retrieve a registration token, call our server api with a POST Request on route: `/register-user`

Example Req Body:

```json
{
  "registrationToken": "DEVICE_REGISTRATION_TOKEN",
  "userId": "USER_DB_ID"
}
```

Response (Status 201)

```json
{
  "message": "User register successful"
}
```

### Notifications

We have a cron job that runs each hour and fetches each users bitcoins and get the `percent_change_1h` from
https://coinmarketcap.com/

We then change if the percentage change from 1hr is greater or equal to 5% and then send a push notification to the user to inform the user about the bitcoin percentage change, Note that we only send the user a notification if we didn't send it in the past 12 hrs
