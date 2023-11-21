const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const getLikes = async (tweetId) => {
  const lq = `SELECT count(*)AS cl FROM like WHERE tweet_id=11
  ;`;
  l = await db.all(lq);
  console.log(l);
  return l;
};

const getReplies = async (tweetId) => {
  const rq = `
  SELECT count(*)AS cr FROM like WHERE tweet_id=1
  ;`;
  r = await db.all(rq);
  console.log(r);
  return r;
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
//API 1
app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;

      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
//API 2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API 3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const tweetsQ = `
 SELECT
   username,
  tweet,
  date_time AS dateTime
FROM
  (follower JOIN tweet ON follower.following_user_id=tweet.user_id) AS T JOIN user ON user.user_id=follower.following_user_id
WHERE 
    follower.follower_user_id=2
ORDER BY
  date_time DESC
LIMIT 4`;
  feed = await db.all(tweetsQ);
  console.log(feed);
  response.send(feed);
  /* const lq = `
  SELECT count(*)AS cl FROM like WHERE tweet_id=11
  ;`;
  l = await db.all(lq);
  console.log(l[0].cr);
  response.send(l);
  const rq = `
  SELECT count(*)AS cr FROM like WHERE tweet_id=1
  ;`;
  r = await db.all(rq);
  console.log(r);
  response.send(r);*/
});

//API 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const getData = `
    SELECT
      name
    FROM
      user JOIN follower ON user.user_id= follower.following_user_id
    WHERE 
        follower_user_id=2`;
  const r = await db.all(getData);
  response.send(r);
  /*const q = `
  SELECT * FROM follower JOIN user ON follower.follower_user_id=user.user_id WHERE follower_user_id=2
  ;`;
  d = await db.all(q);
  //console.log(c);
  response.send(d);*/
});
//API 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const getD = `
    SELECT
      name
    FROM
      user JOIN follower ON user.user_id= follower.follower_user_id
    WHERE
        following_user_id=2`;
  const r = await db.all(getD);
  response.send(r);
});
//API 6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getD = `
    SELECT
      tweet,COUNT(like.like_id) AS likes,COUNT(reply.reply_id) AS replies,date_time AS dateTime
    FROM
      ((tweet JOIN follower ON tweet.user_id= follower.following_user_id) AS TA JOIN like ON TA.tweet_id=like.tweet_id) AS TB JOIN reply ON TB.tweet_id=reply.tweet_id 
    WHERE 
        tweet.tweet_id=${tweetId} AND follower.follower_user_id=2`;
  const r = await db.get(getD);
  console.log(r);
  if (r["tweet"] === null) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    response.send(r);
  }
});
//API 7
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getD = `
    SELECT
      *
    FROM
      ((tweet JOIN follower ON tweet.user_id= follower.following_user_id) AS TA JOIN like ON TA.tweet_id=like.tweet_id) AS TB JOIN reply ON TB.tweet_id=reply.tweet_id 
    WHERE 
        tweet.tweet_id=${tweetId} AND follower_user_id=2
      ;`;
    const r = await db.get(getD);
    console.log(r);
    const namesQ = `
        SELECT username AS likes
        FROM user JOIN like ON user.user_id=like.user_id
        WHERE like.tweet_id=${tweetId}`;
    const names = await db.all(namesQ);
    console.log(names);
    if (r === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      response.send(names);
    }
  }
);
//API 8
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const obj = { replies: "abc" };
    const getD = `
    SELECT
      name,reply AS replies
    FROM
      ((tweet JOIN follower ON tweet.user_id= follower.following_user_id) AS TA JOIN reply ON TA.tweet_id=reply.tweet_id ) AS TB JOIN user ON TB.follower_user_id=user.user_id
    WHERE 
        tweet.tweet_id=${tweetId} AND follower_user_id=2`;
    const r = await db.all(getD);
    console.log(r);
    console.log(r[0]);
    if (r[0] === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      obj.replies = r;
      response.send(obj);
    }
  }
);
//API 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const getD = `
    SELECT
      tweet,COUNT(like.tweet_id) AS likes,COUNT(reply.tweet_id) AS replies,tweet.date_time AS dateTime
    FROM
      (tweet JOIN like ON tweet.tweet_id=like.tweet_id) AS T JOIN reply ON T.tweet_id=reply.tweet_id
    WHERE 
        tweet.user_id=2`;
  /*const getD = `
    SELECT
      *
    FROM
      tweet
    WHERE 
        user_id=2
      ;`;*/
  const r = await db.all(getD);
  response.send(r);
});
//API 10
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const postTweetQuery = `
  INSERT INTO
    tweet (tweet)
  VALUES
    ('${tweet}')`;
  await db.run(postTweetQuery);
  response.send("Created a Tweet");
});
//API 11
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const dQ = `
  SELECT *
  FROM tweet
  WHERE user_id=2 AND tweet_id=${tweetId}`;
    const rdQ = await db.get(dQ);
    //console.log(rdQ[0]);
    console.log(rdQ);
    if (rdQ !== undefined) {
      const deleteTweetQuery = `DELETE FROM
    tweet
  WHERE
    tweet_id = ${tweetId}`;
      await db.run(deleteTweetQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
