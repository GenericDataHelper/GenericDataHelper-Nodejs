require("dotenv").config();
class SQLManager {
  constructor() {
    const mysql = require('mysql');
    this.connection = mysql.createConnection({
      host     : process.env.DB_HOST,
      user     : process.env.DB_USER,
      password : process.env.DB_PW,
      database : process.env.DB_NAME,
      charset  : 'utf8mb4' 
    });
  }
}


module.exports = class Singleton {
  static #_instance;

  constructor() {
      throw "use instance()";
  }

  static instance() {
      if (!this.#_instance) {
        this.#_instance = new SQLManager().connection;
      }
      return this.#_instance;
  }
};