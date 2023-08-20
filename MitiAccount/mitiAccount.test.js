import mysql from "mysql2/promise";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import MitiAccount from "./mitiAccount";
const TEST_DB_NAME = `test_db_${Math.floor(Math.random() * 1000000)}`;

import MitiSettings from "../MitiSettings/mitiSettings";
import MitiAuth from "../MitiAuth/mitiAuth";
const mysqlConfigFirst = {
  host: "127.0.0.1",
  user: "toto",
  password: "password",
  database: "",
};
const TableRows = {
  email: "VARCHAR(80)",
  fname: "VARCHAR(80)",
  lname: "VARCHAR(80)",
  phone: "VARCHAR(80)",
  address: "VARCHAR(80)",
};

const UserType = {
  ADMIN: "admin",
  REGULAR: "regular",
  GOOFY: "goofy",
};

const mysqlConfig = {
  host: "localhost",
  user: "toto",
  password: "password",
  database: TEST_DB_NAME,
};

let mysqlPool;
let con;
describe("MitiAccount", () => {
  let account;
  let auth;
  let th;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      auth = new MitiAuth(mysqlPool, new MitiSettings(UserType, TableRows));
      await auth.setupDatabase();
      account = new MitiAccount(
        mysqlPool,
        new MitiSettings(UserType, TableRows),
        auth
      );
      await account.setupDatabase();
      th = new acTestHelper(auth);
    } catch (e) {
      console.log(e);
    }
  });

  afterAll(async () => {
    mysqlPool.end();
    await con.query("DROP DATABASE " + TEST_DB_NAME + ";");
    await con.end();
  });

  describe("MitiAccount", () => {
    for (const UserKeyType in UserType) {
      it("Create userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        const decoded = await auth.checkJWT(token);
        await account.create(randomValues, token);
        const result = await account.read(token, UserType[UserKeyType]);
        randomValues["id"] = decoded.userId;
        let error = 0;
        for (const key in randomValues) {
          if (randomValues[key] !== result[key]) {
            error = error + 1;
          }
        }
        if (error !== 0) {
          throw new Error("Error in userinfoCreation");
        }
        await account.delete(token);
        await auth.delete(token);
      });
      it("Create & Update userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        await account.create(randomValues, token);
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }

        await account.update(randomValues, token);
        let error = 0;
        const result2 = await account.read(token);
        for (const key in randomValues) {
          if (randomValues[key] !== result2[key]) {
            error = error + 1;
          }
        }
        if (error !== 0) {
          throw new Error("Error in userinfoCreation");
        }
        await account.delete(token);
        await auth.delete(token);
      });
      it("Update not existing userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        await expect(account.update(randomValues, token)).rejects.toThrow(
          "No userinfo at this id"
        );
        await auth.delete(token);
      });
      it("Read not existing userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        await account.create(randomValues, token);
        await account.delete(token);
        await expect(account.read(token)).rejects.toThrow(
          "No userinfo at this id"
        );
        await auth.delete(token);
      });
      it("Delete not existing userinfo", async () => {
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        await expect(account.delete(token)).rejects.toThrow(
          "No userinfo at this id"
        );
        await auth.delete(token);
      });
      it("Create already existing userinfo", async () => {
        let randomValues = {};
        const token = await th.createNlogin(
          "username",
          "password",
          UserType[UserKeyType]
        );
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "12";
        await account.create(randomValues, token);
        await expect(account.create(randomValues, token)).rejects.toThrow(
          "User 'Account already existing"
        );
        await account.delete(token);
        await auth.delete(token);
      });
    }
  });
});
class acTestHelper {
  constructor(authen) {
    this.auth = authen;
  }
  async createNlogin(username, password, type) {
    const id = await this.auth.register(username, password, type);
    const token = await this.auth.login(username, password, type);
    return token;
  }
}
