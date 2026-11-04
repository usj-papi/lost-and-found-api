import type { IDatabase } from "pg-promise";
import pgPromise from "pg-promise";

export class PostgresDatabaseSingleton {
  private static instance: PostgresDatabaseSingleton;

  private db: IDatabase<unknown>;

  private constructor() {
    const databaseUri = process.env.DATABASE_URI;

    if (!databaseUri) {
      throw new Error("DATABASE_URI environment variable is not set");
    }

    const databaseConfig = {
      connectionString: databaseUri,
    };

    const pgp = pgPromise();
    this.db = pgp(databaseConfig);
  }

  public static getDB(): IDatabase<unknown> {
    if (!PostgresDatabaseSingleton.instance) {
      PostgresDatabaseSingleton.instance = new PostgresDatabaseSingleton();
    }
    return PostgresDatabaseSingleton.instance.db;
  }
}
