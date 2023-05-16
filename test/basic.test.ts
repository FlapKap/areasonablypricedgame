import { tick } from 'svelte'
import { pb } from "../src/lib/pocketbase";
import { afterAll, beforeAll, beforeEach, test } from "vitest";
import * as child_process from "child_process";

let pbProcess = null;
let pbReady = null;

beforeAll(() => {
    console.log(process.cwd())
    pbProcess = child_process.spawn("./pocketbase.exe", ['serve'], {
        detached: true
    });
    pbReady = new Promise((resolve, reject) => {
        pbProcess.on('error', err => reject(err))
        pbProcess.stdout.on('data', data => resolve(data))
    })
})

beforeEach(async () => {
    await pbReady;
    await pb.admins.authWithPassword("test@test-test-test.com", "HjK9nca4vLzbcsB");
})

test('list users', async () => {
    const allUsers = await pb.collection("users").getFullList();
    console.log(allUsers)
    const onlyMe = await pb.collection("users").getFirstListItem("jon@zendata.dk")
    console.log("only me", onlyMe)
})

afterAll(() => {
    pbProcess.kill();
})