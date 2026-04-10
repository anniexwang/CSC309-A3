const { PositionTypeService } = require("../services/position-types");
const { getPagination } = require('../utils/pagination');


async function createPositionTypeController(req, res) {
    const { name, description, hidden } = req.body;

    if (!req.auth) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!name || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const newPositionType = await PositionTypeService.create(name, description, hidden);
        return res.status(201).json({
            id: newPositionType.position_type_id,
            name: newPositionType.name,
            description: newPositionType.description,
            hidden: newPositionType.hidden,
            num_qualified: 0
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

async function retrievePositionTypeController(req, res) {
    const { skip, take } = getPagination(req);
    const isAdmin = req.auth?.role === 'admin';
    const { keyword, name, hidden, num_qualified } = req.query;

    const valid_hidden = ["true", "false"];

    if (hidden !== undefined && !valid_hidden.includes(hidden)) {
        return res.status(400).json({ error: "Invalid hidden filter" });
    }

    const parsedHidden = hidden === undefined ? undefined : hidden === 'true';

    const valid_orders = ['asc', 'desc'];

    if (name && !valid_orders.includes(name)) {
        return res.status(400).json({ error: "Invalid name sort" });
    }

    if (num_qualified && !valid_orders.includes(num_qualified)) {
        return res.status(400).json({ error: "Invalid num_qualified sort" });
    }

    const filters = {
        keyword: keyword || null,
        hidden: isAdmin ? parsedHidden : false,
        nameOrder: name || 'asc',
        numQualifiedOrder: isAdmin ? num_qualified : null
    };

    try {
        const { positionTypes, count } = await PositionTypeService.retrieve(filters, skip, take, isAdmin);

        const results = positionTypes.map(positionType => {
            const data = {
                id: positionType.position_type_id,
                name: positionType.name,
                description: positionType.description
            }

            if (isAdmin) {
                data.hidden = positionType.hidden;
                data.num_qualified = positionType.num_qualified;
            }

            return data;
        });

        return res.status(200).json({ count, results });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

async function updatePositionTypeController(req, res) {
    try {
        const { name, description, hidden } = req.body;

        const positionTypeId = parseInt(req.params.positionTypeId);

        if (isNaN(positionTypeId)) return res.status(404).json({ message: "Invalid positionTypeId" });

        if (hidden !== undefined && typeof hidden !== 'boolean') {
            return res.status(400).json({ message: "Invalid hidden value" });
        }

        const data = {};

        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (hidden !== undefined) data.hidden = hidden;

        if (Object.keys(data).length === 0) return res.status(400).json({ message: "Empty payload" });

        const position = await PositionTypeService.get_position(positionTypeId);

        if (!position) {
            return res.status(404).json({ message: "Position type not found" });
        }

        const updatedPosition = await PositionTypeService.update(positionTypeId, data);

        const response = { id: positionTypeId };
        if (name !== undefined) response.name = updatedPosition.name;
        if (description !== undefined) response.description = updatedPosition.description;
        if (hidden !== undefined) response.hidden = updatedPosition.hidden;

        return res.status(200).json(response);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function deletePositionTypeController(req, res) {
    try {
        const positionTypeId = parseInt(req.params.positionTypeId);
        if (isNaN(positionTypeId)) {
            return res.status(404).json({ message: "Invalid position type ID" });
        }

        const result = await PositionTypeService.delete(positionTypeId);

        if (result === null) {
            return res.status(404).json({ error: "Position type doesn't exist" });
        }

        if (result === false) {
            return res.status(409).json({ error: "Conflict" });
        }

        return res.sendStatus(204);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = {
    createPositionTypeController,
    retrievePositionTypeController,
    updatePositionTypeController,
    deletePositionTypeController,
    otherRouteController
}