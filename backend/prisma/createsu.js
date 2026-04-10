/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js -- clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function seedAdmin() {
    const args = process.argv;

    if (args.length !== 5) {
        console.error(`usage: node prisma/createsu.js -- clive.su@mail.utoronto.ca SuperUser123!`);
        process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+~`|}{[\]:;?><,./-]).{8,20}$/;

    const email = args[3];
    const password = args[4];

    if (!emailRegex.test(email)) {
        console.error(`usage: email is not a real email`);
        process.exit(1);
    }

    if (!passRegex.test(password)) {
        console.error(`usage: password is not a real password`);
        process.exit(1);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const data = {
        email,
        password: passwordHash,
        role: "admin",
        isAdmin: true,
        activated: true
    };

    await prisma.user.create({ data });

    console.log(`Created activated admin: ${email}`);
}

seedAdmin()
    .catch((err) => {
        console.error(err.message || err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
