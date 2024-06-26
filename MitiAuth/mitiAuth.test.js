import mysql from "mysql2/promise";
import MitiSettings from "../MitiSettings/mitiSettings";
import MitiAuth from "./mitiAuth";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

let mysqlPool;
let con;
const mitisett = new MitiSettings();

describe("MitiAuth", () => {
  let auth;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      console.log(mitisett);
      auth = new MitiAuth(mysqlPool, mitisett);
      await auth.setupDatabase();
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
    //test where userType doesnt Matter
    const users = mitisett.getUserTypes();
    for (const user in users) {
      it("should register and login a user", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        const token = await auth.login(username, password, users[user]);
        expect(typeof token).toBe("string");
        const decoded = await auth.checkJWT(token);
        expect(decoded.type).toBe(users[user]);
        await auth.delete(token);
      });

      it("should throw an error when logging in with an incorrect password", async () => {
        const username = "baduserwrong";
        const password = "password";
        const wrongPassword = "wrongpass";
        await auth.register(username, password, users[user]);
        await expect(
          auth.login(username, wrongPassword, users[user])
        ).rejects.toThrow(auth.BAD_PASSWORD);
        let token = await auth.login(username, password, users[user])
        await auth.delete(token);
      });

      it("should throw an error when logging in with a non-existent user", async () => {
        const username = "noexistuser";
        const password = "noexistp";
        await expect(
          auth.login(username, password, users[user])
        ).rejects.toThrow(auth.USER_DONT_EXISTS);
      });

      it("should throw an error when bad params", async () => {
        const goodUs = "user";
        const goodPass = "pass";
        let badUs;
        let badPass;
        await expect(auth.login(badUs, goodPass, users[user])).rejects.toThrow(
          auth.BAD_PARAMS
        );
        await expect(auth.login(goodUs, badPass, users[user])).rejects.toThrow(
          this.BAD_PARAMS
        );
      });

      it("update", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        const token = await auth.login(username, password, users[user]);
        expect(typeof token).toBe("string");
        const newUser = "test2";
        const newPass = "test3";
        await auth.update(token, newUser, newPass);
        const newToken = await auth.login(newUser, newPass, users[user]);
        expect(typeof newToken).toBe("string");
        const decoded = await auth.checkJWT(token);
        expect(decoded.type).toBe(users[user]);
        await auth.delete(token);
      });

      it("testdelete", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        const token = await auth.login(username, password, users[user]);
        expect(typeof token).toBe("string");
        await auth.delete(token);
        await expect(
          auth.login(username, password, users[user])
        ).rejects.toThrow(this.USER_DONT_EXISTS);
      });

      it("testAlreadyExistinguser", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        await expect(
          auth.register(username, password, users[user])
        ).rejects.toThrow(this.USER_EXISTS);
        const token = await auth.login(username, password, users[user])
        await auth.delete(token);

      });
      it("badTokenTest", async () => {
        const badtoken = "test";
        await expect(auth.checkJWT(badtoken)).rejects.toThrow(
          auth.INVALID_TOKEN_ERROR
        );
      });
      it("logout", async () => {
        const username = "testuser2";
        const password = "testpass2";
        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        let token = await auth.login(username, password, users[user]);
        expect(typeof token).toBe("string");
        const decoded = await auth.checkJWT(token);
        expect(decoded.type).toBe(users[user]);
        const newtoken = await auth.logout(token);
        expect(auth.checkJWT(newtoken)).rejects.toThrow(
          auth.USER_DONT_EXISTS
        );
        token = await auth.login(username, password, users[user])
        await auth.delete(token);
      });
      it("reading username", async () => {
        const username = "baduser";
        const password = "badpass";

        const id = await auth.register(username, password, users[user]);
        expect(typeof id).toBe("string");
        const token = await auth.login(username, password, users[user]);
        const recUsername = await auth.getUsername(token);
        expect(recUsername).toBe(username);
        await auth.delete(token);
      });
    }
    //test where userType Matter
    it("should throw an error when registering with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(
        auth.register(username, password, invalidType)
      ).rejects.toThrow(auth.INVALID_USER_TYPE);
    });
  });
});
