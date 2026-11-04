import type { Repository } from "../../shared/infrastructure/repository.contract.js";
import type { LostObject } from "../domain/lost-object.entity.js";

export class LostObjectService {
  constructor(private lostObjectRepository: Repository<LostObject>) {}

  findAll(): Promise<LostObject[]> {
    return this.lostObjectRepository.findAll();
  }

  findById(id: string): Promise<LostObject | null> {
    return this.lostObjectRepository.findById(id);
  }

  create(entity: LostObject): Promise<LostObject> {
    return this.lostObjectRepository.create(entity);
  }

  update(id: string, entity: Partial<LostObject>): Promise<LostObject | null> {
    return this.lostObjectRepository.update(id, entity);
  }

  delete(id: string): Promise<boolean> {
    return this.lostObjectRepository.delete(id);
  }
}
