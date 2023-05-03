import type { Collections } from "./pocketbase-types";
import { pbNameToLabel } from "./misc";

export async function getProperties(collection: Collections) {
    let schemata = await fetch(`http://localhost:8001/schemas/${collection}`).then(it => it.json());
    return Array.from(schemata).map(it => {
        return  {
            type: it['type'],
            name: it['name'],
            label: pbNameToLabel(it['name']),
            input: undefined,
            required: it['required'],
            collection: it['collection'],
            multiSelect: it['options']?.maxSelect,
            maxSelect: it['options']?.maxSelect,
            schema: it
        };
    });
}