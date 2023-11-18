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
const mitisett = new MitiSettings();
describe("MitiAccount", () => {
  let account;
  let auth;
  let th;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      auth = new MitiAuth(mysqlPool, mitisett);
      await auth.setupDatabase();
      account = new MitiAccount(mysqlPool, auth, mitisett);
      await account.setupDatabase();
      th = new AcTestHelper(auth);
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
    const users = mitisett.getUserTypes();
    for (const user in users) {
      it("Create userinfo", async () => {
        let randomValues = {};
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        const decoded = await auth.checkJWT(token);
        await account.create(randomValues, token);
        const result = await account.read(token, users[user]);
        let error = 0;
        for (const key in randomValues) {
          if (randomValues[key] !== result[key]) {
            error = error + 1;
            console.log(key);
          }
        }
        if (result["username"] !== "username") {
          error = error + 1;
        }
        if (error !== 0) {
          throw new Error("Error in userinfoCreation");
        }
        await account.delete(token);
        await auth.delete(token);
      });
      it("Create & Update userinfo", async () => {
        let randomValues = {};
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        console.log(await account.getScheme(token));

        await account.create(randomValues, token);
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
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
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        await expect(account.update(randomValues, token)).rejects.toThrow(
          account.NO_USER_INFO
        );
        await auth.delete(token);
      });
      it("Read not existing userinfo", async () => {
        let randomValues = {};
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        await account.create(randomValues, token);
        await account.delete(token);
        await expect(account.read(token)).rejects.toThrow(account.NO_USER_INFO);
        await auth.delete(token);
      });
      it("Delete not existing userinfo", async () => {
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        await expect(account.delete(token)).rejects.toThrow(
          account.NO_USER_INFO
        );
        await auth.delete(token);
      });
      it("Create already existing userinfo", async () => {
        let randomValues = {};
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        for (const key of mitisett.getUserFields(user)) {
          randomValues[key.name] = Math.random().toString(36).substring(2, 15);
        }
        await account.create(randomValues, token);
        await expect(account.create(randomValues, token)).rejects.toThrow(
          this.ACCOUNT_EXISTS
        );
        await account.delete(token);
        await auth.delete(token);
      });
      it("Create bad userinfo", async () => {
        let randomValues = {};
        let aaa = mitisett.getUserFields(user);
        for (let i = 0; i < 3; i++) {
          randomValues[aaa[i]] = Math.random().toString(36).substring(2, 15);
        }
        const token = await th.createNlogin(
          "username",
          "password",
          users[user]
        );
        await auth.checkJWT(token);
        expect(account.create(randomValues, token)).rejects.toThrow(
          "Invalid User Informations"
        );
        await auth.delete(token);
      });
    }
  });
});
class AcTestHelper {
  constructor(authen) {
    this.auth = authen;
  }
  async createNlogin(username, password, type) {
    await this.auth.register(username, password, type);
    const token = await this.auth.login(username, password, type);
    return token;
  }
}
