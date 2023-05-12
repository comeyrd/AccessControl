const mysql = require("mysql2/promise");

const mysqlConfig = {
  host: "127.0.0.1",
  user: "toto",
  password: "password",
};

async function createDatabase() {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    await con.execute("CREATE DATABASE testData;");
    console.log("Database created");
    await con.end();
  } catch (err) {
    console.error(err);
  }
}

async function dropDatabase() {
  try {
    const con = await mysql.createConnection(mysqlConfig);
    await con.execute("DROP DATABASE testData;");
    console.log("Database dropped");
    await con.end();
  } catch (err) {
    console.error(err);
  }
}

const main = async () => {
  await createDatabase();
  await dropDatabase();
};

// Call the functions to execute the queries

main();
