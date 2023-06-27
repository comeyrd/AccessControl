import mysql from "mysql2/promise";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import MitiAccount from "./mitiAccount";
const TEST_DB_NAME = `test_db_${Math.floor(Math.random() * 1000000)}`;

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
  beforeAll(async () => {
    try {
      con = await mysql.createConnection(mysqlConfigFirst);
      await con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = await mysql.createPool(mysqlConfig);
      account = new MitiAccount(mysqlPool, UserType, TableRows);
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

  describe("MitiAccount", () => {
    for (const UserKeyType in UserType) {
      it("Create userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "12";
        await account.create(randomValues, id, UserType[UserKeyType]);
        const result = await account.read(id, UserType[UserKeyType]);
        randomValues["id"] = id;
        let error = 0;
        for (const key in randomValues) {
          if (randomValues[key] !== result[key]) {
            error = error + 1;
          }
        }
        if (error !== 0) {
          throw new Error("Error in userinfoCreation");
        }
        await account.delete(id, UserType[UserKeyType]);
      });
      it("Create & Update userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "24";
        await account.create(randomValues, id, UserType[UserKeyType]);

        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }

        await account.update(randomValues, id, UserType[UserKeyType]);
        let error = 0;
        const result2 = await account.read(id, UserType[UserKeyType]);
        for (const key in randomValues) {
          if (randomValues[key] !== result2[key]) {
            error = error + 1;
          }
        }
        if (error !== 0) {
          throw new Error("Error in userinfoCreation");
        }
        await account.delete(id, UserType[UserKeyType]);
      });
      it("Update not existing userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "34";
        await expect(
          account.update(randomValues, id, UserType[UserKeyType])
        ).rejects.toThrow("No userinfo at this id");
      });
      it("Read not existing userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "34";
        await account.create(randomValues, id, UserType[UserKeyType]);
        await account.delete(id, UserType[UserKeyType]);
        await expect(account.read(id, UserType[UserKeyType])).rejects.toThrow(
          "No userinfo at this id"
        );
      });
      it("Delete not existing userinfo", async () => {
        const id = "44";
        await expect(account.delete(id, UserType[UserKeyType])).rejects.toThrow(
          "No userinfo at this id"
        );
      });
      it("Create already existing userinfo", async () => {
        let randomValues = {};
        for (const key of account.readRow()) {
          randomValues[key] = Math.random().toString(36).substring(2, 15);
        }
        const id = "12";
        await account.create(randomValues, id, UserType[UserKeyType]);
        await expect(
          account.create(randomValues, id, UserType[UserKeyType])
        ).rejects.toThrow("User Info Already Existing");
        await account.delete(id, UserType[UserKeyType]);
      });
    }
  });
});
