/**
 * Lista bases de datos y usuarios de PostgreSQL.
 * Úsalo para encontrar tu base si no recuerdas el nombre.
 * Ejecutar: node list-databases.js
 */
const { Client } = require('pg');

const client = new Client({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: 'postgres',
});

async function main() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL.\n');

    const dbs = await client.query(`
      SELECT datname AS base_de_datos, pg_catalog.pg_get_userbyid(datdba) AS owner
      FROM pg_catalog.pg_database
      WHERE datistemplate = false
      ORDER BY datname
    `);
    console.log('--- Bases de datos ---');
    console.table(dbs.rows);

    const users = await client.query(`
      SELECT usename AS usuario FROM pg_catalog.pg_user ORDER BY usename
    `);
    console.log('--- Usuarios ---');
    console.table(users.rows);

    console.log('\nCallShip espera: usuario "callship", base "callship_db".');
    console.log('Si no existen, créalos en pgAdmin o con psql.');
  } catch (err) {
    console.error('Error (¿PostgreSQL instalado y servicio corriendo?):', err.message);
    if (err.message.includes('password')) {
      console.log('\nPon la contraseña de postgres: set PG_PASSWORD=tu_password y vuelve a ejecutar.');
    }
  } finally {
    await client.end();
  }
}

main();
