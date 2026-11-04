import type { IDatabase } from "pg-promise";
import { PostgresDatabaseSingleton } from "../../../utils/db.js";
import type { Repository } from "../../shared/infrastructure/repository.contract.js";
import type { LostObject } from "../domain/lost-object.entity.js";

export class LostObjectPostgresRepository implements Repository<LostObject> {
  private db: IDatabase<unknown>;

  constructor() {
    this.db = PostgresDatabaseSingleton.getDB();
  }

  findAll(): Promise<LostObject[]> {
    const lostObjects = this.db.any<LostObject>("SELECT * FROM lost_objects");
    return lostObjects;
  }

  findById(id: string): Promise<LostObject | null> {
    const lostObject = this.db.oneOrNone<LostObject>(
      "SELECT * FROM lost_objects WHERE id = $1",
      [id],
    );
    return lostObject;
  }

  create(entity: LostObject): Promise<LostObject> {
    const createdLostObject = this.db.one<LostObject>(
      "INSERT INTO lost_objects (id, name, description, location, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        entity.id,
        entity.name,
        entity.description,
        entity.location,
        entity.status,
      ],
    );
    return createdLostObject;
  }

  async update(
    id: string,
    entity: Partial<LostObject>,
  ): Promise<LostObject | null> {
    const existingLostObject = await this.findById(id);
    if (!existingLostObject) {
      return null;
    }

    const lostObject: LostObject = { ...existingLostObject, ...entity, id };

    const updatedLostObject = await this.db.oneOrNone<LostObject>(
      `UPDATE lost_objects
       SET name = $<name>,
        description = $<description>,
        location = $<location>,
        status = $<status>
       WHERE id = $<id>
       RETURNING *`,
      lostObject,
    );
    return updatedLostObject;
  }

  delete(id: string): Promise<boolean> {
    const deleted = this.db.result(
      "DELETE FROM lost_objects WHERE id = $1",
      [id],
      (result) => result.rowCount > 0,
    );
    return deleted;
  }
}
