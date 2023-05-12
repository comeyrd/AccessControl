import mysql from "mysql2/promise";
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

var mysqlPool;
let con;
describe("MitiAuth", () => {
  let auth;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      await mysqlPool.query("DROP TABLE IF EXISTS admin_users, regular_users;");
      auth = new MitiAuth(mysqlPool);
      await auth.init();
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
    it("should register and login a regular user", async () => {
      const username = "testuser";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.REGULAR);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.REGULAR);
      expect(typeof token).toBe("string");
      const decoded = await auth.checkJWT(token);
      expect(decoded.type).toBe(auth.userType.REGULAR);
      await auth.delete(token);
    });

    it("should register and login an admin user", async () => {
      const username = "testadmin";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.ADMIN);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.ADMIN);
      expect(typeof token).toBe("string");
      const decoded = await auth.checkJWT(token);
      expect(decoded.type).toBe(auth.userType.ADMIN);
      await auth.delete(token);
    });

    it("should throw an error when registering with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(
        auth.register(username, password, invalidType)
      ).rejects.toThrow("Invalid user type");
    });

    it("should throw an error when logging in with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(auth.login(username, password, invalidType)).rejects.toThrow(
        "Invalid user type"
      );
    });

    it("should throw an error when logging in with an incorrect password", async () => {
      const username = "baduserwrong";
      const password = "password";
      const wrongPassword = "wrongpass";
      await auth.register(username, password, auth.userType.REGULAR);
      await expect(
        auth.login(username, wrongPassword, auth.userType.REGULAR)
      ).rejects.toThrow("Password does not match");
    });

    it("should throw an error when logging in with a non-existent user", async () => {
      const username = "noexistuser";
      const password = "noexistp";
      await expect(
        auth.login(username, password, auth.userType.REGULAR)
      ).rejects.toThrow("User not found");
    });

    it("should throw an error when bad params", async () => {
      const goodUs = "user";
      const goodPass = "pass";
      var badUs;
      var badPass;
      await expect(
        auth.login(badUs, goodPass, auth.userType.REGULAR)
      ).rejects.toThrow("Bad Params");
      var password;
      await expect(
        auth.login(goodUs, badPass, auth.userType.REGULAR)
      ).rejects.toThrow("Bad Params");
    });

    it("should throw an error when bad params", async () => {
      const goodUs = "user";
      const goodPass = "pass";
      var badUs;
      var badPass;
      await expect(
        auth.register(badUs, goodPass, auth.userType.REGULAR)
      ).rejects.toThrow("Bad Params");
      var password;
      await expect(
        auth.register(goodUs, badPass, auth.userType.REGULAR)
      ).rejects.toThrow("Bad Params");
    });
    it("update", async () => {
      const username = "testuser";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.REGULAR);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.REGULAR);
      expect(typeof token).toBe("string");
      const newUser = "test2";
      const newPass = "test3";
      await auth.update(token, newUser, newPass);
      const newToken = await auth.login(
        newUser,
        newPass,
        auth.userType.REGULAR
      );
      expect(typeof newToken).toBe("string");
      const decoded = await auth.checkJWT(token);
      expect(decoded.type).toBe(auth.userType.REGULAR);
      await auth.delete(token);
    });
    it("testdelete", async () => {
      const username = "testuser";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.REGULAR);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.REGULAR);
      expect(typeof token).toBe("string");
      await auth.delete(token);
      await expect(
        auth.login(username, password, auth.userType.REGULAR)
      ).rejects.toThrow("User not found");
    });
    it("testAlreadyExistinguser", async () => {
      const username = "testuser";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.REGULAR);
      expect(typeof id).toBe("string");
      await expect(
        auth.register(username, password, auth.userType.REGULAR)
      ).rejects.toThrow("User Already Exists");
    });
  });
});
