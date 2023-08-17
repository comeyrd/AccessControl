import mysql from "mysql2/promise";
import MitiAuth from "./mitiAuth";
import MitiSettings from "../MitiSettings/mitiSettings";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
const TEST_DB_NAME = `test_db_${Math.floor(Math.random() * 1000000)}`;

const mysqlConfigFirst = {
  host: "127.0.0.1",
  user: "toto",
  password: "password",
  database: "",
};

const userTypes = {
  ADMIN: "admin",
  REGULAR: "regular",
  PROTECTED: "protected",
};

const mysqlConfig = {
  host: "localhost",
  user: "toto",
  password: "password",
  database: TEST_DB_NAME,
};

let mysqlPool;
let con;
describe("MitiAuth", () => {
  let auth;
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      auth = new MitiAuth(mysqlPool, new MitiSettings(userTypes));
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
  //TODO concurrent
  describe("register and login", () => {
    //test where userType doesnt Matter
    for (const UserKeyType in userTypes) {
      it("should register and login a user", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof id).toBe("string");
        const token = await auth.login(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof token).toBe("string");
        const decoded = await auth.checkJWT(token);
        expect(decoded.type).toBe(userTypes[UserKeyType]);
        await auth.delete(token);
      });

      it("should throw an error when logging in with an incorrect password", async () => {
        const username = "baduserwrong";
        const password = "password";
        const wrongPassword = "wrongpass";
        await auth.register(username, password, userTypes[UserKeyType]);
        await expect(
          auth.login(username, wrongPassword, userTypes[UserKeyType])
        ).rejects.toThrow("Password does not match");
      });

      it("should throw an error when logging in with a non-existent user", async () => {
        const username = "noexistuser";
        const password = "noexistp";
        await expect(
          auth.login(username, password, userTypes[UserKeyType])
        ).rejects.toThrow("User not found");
      });

      it("should throw an error when bad params", async () => {
        const goodUs = "user";
        const goodPass = "pass";
        let badUs;
        let badPass;
        await expect(
          auth.login(badUs, goodPass, userTypes[UserKeyType])
        ).rejects.toThrow("Bad Params");
        await expect(
          auth.login(goodUs, badPass, userTypes[UserKeyType])
        ).rejects.toThrow("Bad Params");
      });

      it("update", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof id).toBe("string");
        const token = await auth.login(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof token).toBe("string");
        const newUser = "test2";
        const newPass = "test3";
        await auth.update(token, newUser, newPass);
        const newToken = await auth.login(
          newUser,
          newPass,
          userTypes[UserKeyType]
        );
        expect(typeof newToken).toBe("string");
        const decoded = await auth.checkJWT(token);
        expect(decoded.type).toBe(userTypes[UserKeyType]);
        await auth.delete(token);
      });

      it("testdelete", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof id).toBe("string");
        const token = await auth.login(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof token).toBe("string");
        await auth.delete(token);
        await expect(
          auth.login(username, password, userTypes[UserKeyType])
        ).rejects.toThrow("User not found");
      });

      it("testAlreadyExistinguser", async () => {
        const username = "testuser";
        const password = "testpass";
        const id = await auth.register(
          username,
          password,
          userTypes[UserKeyType]
        );
        expect(typeof id).toBe("string");
        await expect(
          auth.register(username, password, userTypes[UserKeyType])
        ).rejects.toThrow("User Already Exists");
      });
    }
    //test where userType Matter
    it("should throw an error when registering with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(
        auth.register(username, password, invalidType)
      ).rejects.toThrow("Invalid user type");
    });
  });
});
