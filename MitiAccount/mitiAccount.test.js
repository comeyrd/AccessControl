import mysql from "mysql2/promise";
import MitiAuth from "./mitiAccount";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import MitiAccount from "./mitiAccount";
const TEST_DB_NAME = `test_db_${Math.floor(Math.random() * 1000000)}`;

const mysqlConfigFirst = {
  host: "127.0.0.1",
  user: "toto",
  password: "password",
  database: "",
};

const mysqlConfig = {
  host: "localhost",
  user: "toto",
  password: "password",
  database: TEST_DB_NAME,
};

var mysqlPool;
let con;
describe("MitiAccount", () => {
  let account;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      account = new MitiAccount(mysqlPool);
      await account.init();
    } catch (e) {
      console.log(e);
    }
  });

  afterAll(async () => {
    mysqlPool.end();
    await con.query("DROP DATABASE " + TEST_DB_NAME + ";");
    await con.end();
  });

  describe("register and login", () => {
    it("Create userinfo", async () => {
      const randomValues = {};
      for (const key of account.readRow()) {
        randomValues[key] = Math.random().toString(36).substring(2, 15);
      }
      await account.create(randomValues, "12", account.userType.REGULAR);
    });
  });
});
