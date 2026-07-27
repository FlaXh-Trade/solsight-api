import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { ENTITIES } from "./entity-registry";

const connectionOptions: DataSourceOptions = process.env.DATABASE_URL
    ? {
          type: "postgres",
          url: process.env.DATABASE_URL
      }
    : {
          type: "postgres",
          host: process.env.DATABASE_HOST || "localhost",
          port: parseInt(process.env.DATABASE_PORT || "5432", 10),
          username: process.env.DATABASE_USERNAME || "postgres",
          password: process.env.DATABASE_PASSWORD || "password",
          database: process.env.DATABASE_NAME || "flaxh_trade"
      };

const dataSource = new DataSource({
    ...connectionOptions,
    entities: ENTITIES,
    migrations: [__dirname + "/migrations/*{.ts,.js}"],
    synchronize: false
});

export default dataSource;
