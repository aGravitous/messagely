/** User class for message.ly */
const bcrypt = require("bcrypt");
const db = require("../db");
const  { BCRYPT_WORK_ROUNDS } = require("../config");


/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_ROUNDS); 
    const result = await db.query(
      `INSERT INTO users (
        username, 
        password, 
        first_name, 
        last_name, 
        phone,
        join_at,
        last_login_at)
             VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
             RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]);

    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]);
    const userPassword = result.rows[0];
    if (userPassword) {
      // Returns boolean:
      return await bcrypt.compare(password, userPassword.password); 
    }
    return false;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) { 

    let result = await db.query(
        `UPDATE users 
          SET last_login_at=current_timestamp
          WHERE username=$1
          RETURNING username`,
          [username]);

    if (!result.rows[0]) {
      throw new Error(`User ${username} not found`);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT
        username, 
        first_name, 
        last_name,
        phone
      FROM users`);

    return result.rows;

   }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async getUser(username) {
    const result = await db.query(
      `SELECT
        username,
        first_name,
        last_name,
        phone,
        join_at,
        last_login_at
      FROM users
      WHERE username=$1`,
      [username]);

    if (!result.rows[0]) {
      throw new Error(`User ${username} not found`);
    }

    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 

    const result = await db.query(
      `SELECT 
        m.id,
        m.to_username,
        f.first_name AS from_first_name,
        f.last_name AS from_last_name,
        f.phone AS from_phone,
        m.body,
        m.sent_at,
        m.read_at
      FROM messages AS m
        JOIN users AS f ON m.from_username = f.username
      WHERE f.username = $1`,
      [username]);

    if (!result.rows[0]) {
      throw new Error(`User ${username} not found`);
    }

    return result.rows;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) { 
    const result = await db.query(
      `SELECT 
        m.id,
        m.from_username,
        t.first_name AS from_first_name,
        t.last_name AS from_last_name,
        t.phone AS from_phone,
        m.body,
        m.sent_at,
        m.read_at
      FROM messages AS m
        JOIN users AS t ON m.to_username = t.username
      WHERE t.username = $1`,
      [username]);

    if (!result.rows) {
      throw new Error(`User ${username} not found`);
    }

    return result.rows;
  }
}


module.exports = User;