const mysql = require("mysql2");
const MitiAuth = require("./mitiAuth");

const TEST_DB_NAME = `test_db_${Math.floor(Math.random() * 1000000)}`;

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "toto",
  password: "password",
});

const mysqlConfig = {
  host: "localhost",
  user: "toto",
  password: "password",
  database: TEST_DB_NAME,
};

var mysqlPool;

describe("MitiAuth", () => {
  let auth;
  beforeAll(async () => {
    try {
      con.connect();
      con.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      mysqlPool = mysql.createPool(mysqlConfig);
      mysqlPool.query("DROP TABLE IF EXISTS admin_users, regular_users;");
      auth = new MitiAuth(mysqlPool);
      await new Promise((resolve, reject) => {
        auth.init((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (err) {
      throw err;
    }
  });

  afterAll(() => {
    mysqlPool.end();
    con.query("DROP DATABASE " + TEST_DB_NAME + ";", (err, result) => {});
    con.end();
  });

  describe("register and login", () => {
    test("should register and login a regular user", async () => {
      const username = "testuser";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.REGULAR);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.REGULAR);
      expect(typeof token).toBe("string");
      const type = await auth.checkJWT(token);
      expect(type).toBe(auth.userType.REGULAR);
    });

    test("should register and login an admin user", async () => {
      const username = "testadmin";
      const password = "testpass";
      const id = await auth.register(username, password, auth.userType.ADMIN);
      expect(typeof id).toBe("string");
      const token = await auth.login(username, password, auth.userType.ADMIN);
      expect(typeof token).toBe("string");
      const type = await auth.checkJWT(token);
      expect(type).toBe(auth.userType.ADMIN);
    });

    test("should throw an error when registering with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(
        auth.register(username, password, invalidType)
      ).rejects.toThrow("Invalid user type");
    });

    test("should throw an error when logging in with an invalid user type", async () => {
      const username = "baduser";
      const password = "badpass";
      const invalidType = "invalid";
      await expect(auth.login(username, password, invalidType)).rejects.toThrow(
        "Invalid user type"
      );
    });

    test("should throw an error when logging in with an incorrect password", async () => {
      const username = "baduserwrong";
      const password = "password";
      const wrongPassword = "wrongpass";
      await auth.register(username, password, auth.userType.REGULAR);
      await expect(
        auth.login(username, wrongPassword, auth.userType.REGULAR)
      ).rejects.toThrow("Password does not match");
    });

    test("should throw an error when logging in with a non-existent user", async () => {
      const username = "noexistuser";
      const password = "noexistp";
      await expect(
        auth.login(username, password, auth.userType.REGULAR)
      ).rejects.toThrow("User not found");
    });
  });
});
