import type { Request, Response } from "express";
import type { LostObjectService } from "./lost-object.service.js";

export class LostObjectController {
  constructor(private lostObjectService: LostObjectService) {}

  async getAllLostObjects(_req: Request, res: Response) {
    const lostObjects = await this.lostObjectService.findAll();
    res.status(200).json(lostObjects);
  }

  async getLostObjectById(req: Request, res: Response) {
    const id = req.params.id;

    if (!id || typeof id !== "string") {
      res.status(400).json({ message: "Missing id" });
      return;
    }

    const lostObject = await this.lostObjectService.findById(id);

    if (!lostObject) {
      res.status(404).json({ message: "Lost object not found" });
      return;
    }

    res.status(200).json(lostObject);
  }

  async createLostObject(req: Request, res: Response) {
    const { name, description, location } = req.body ?? {};
    let { status } = req.body ?? {};

    if (!name || !description || !location) {
      res
        .status(400)
        .json({ message: "Name, description, and location are required" });
      return;
    }

    if (!status) {
      status = "stored";
    } else if (["returned", "stored"].includes(status) === false) {
      res
        .status(400)
        .json({ message: "Status must be 'returned' or 'stored'" });
      return;
    }

    const lostObject = await this.lostObjectService.create({
      id: crypto.randomUUID(),
      name,
      description,
      location,
      status: status ?? "stored",
    });

    res.status(201).json(lostObject);
  }

  async updateLostObject(req: Request, res: Response) {
    const id = req.params.id;
    if (!id || typeof id !== "string") {
      res.status(400).json({ message: "Missing id" });
      return;
    }

    const { name, description, location, status } = req.body ?? {};

    if (!name || !description || !location || !status) {
      res.status(400).json({
        message: "Name, description, location, and status are required",
      });
      return;
    }

    const lostObject = await this.lostObjectService.update(id, {
      name,
      description,
      location,
      status,
    });

    if (!lostObject) {
      res.status(404).json({ message: "Lost object not found" });
      return;
    }

    res.status(200).json(lostObject);
  }

  async deleteLostObject(req: Request, res: Response) {
    const id = req.params.id;
    if (!id || typeof id !== "string") {
      res.status(400).json({ message: "Missing or invalid id" });
      return;
    }

    const deleted = await this.lostObjectService.delete(id);

    if (!deleted) {
      res.status(404).json({ message: "Lost object not found" });
      return;
    }

    res.status(204).end();
  }
}
