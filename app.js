const { createLogger, transports, format } = require('winston');
const http = require('http');
const AWS = require('aws-sdk');

const port = 3000;

let users = [{ username: "user1", password: "pass1", role: "employee" }, { username: "user2", password: "pass2", role: "manager" }, { username: "user3", password: "pass3", role: "employee" }];

let tickets = [{ amount: 0.00, description: "blah", status: "pending", date: new Date().toLocaleDateString() }];



const server = http.createServer((req, res) => {

    // GET request for all users
    if (req.method === 'GET' && req.url === '/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = {
            message: "Now displaying users",
            users
        };
        res.end(JSON.stringify({ data, current: users }));
        showAllUsers();
    }
    // POST request for a new user using body raw JSON in postman
    else if (req.method === 'POST' && req.url === '/register') {

        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            const data = JSON.parse(body);


            if ((data.username == null) || (data.password == null)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'It does not have a username and password property!' }));
            }
            else if ((data.username == "") || (data.password == "")) {
                // console.log((JSON.stringify(data.username)));
                // console.log((JSON.stringify(data.password)));
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'You need to type in a username and Password!' }));
            }
            else if (checkForDuplicateUsernames(users, data)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'That user already exists!', current: users }));
                showAllUsers();
            }
            else {
                users = registerNewUser(data, users);

                console.log("New user...");
                console.log(data);
                console.log("created!");

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Added a new user", current: users }));
                showAllUsers();
            }

        });
    }
    else if (req.method === 'POST' && req.url === '/ticket') {

        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            const data = JSON.parse(body);

            console.log((JSON.stringify(data.amount)));
            console.log((JSON.stringify(data.description)));

            if ((data.amount == null) || (data.description == null)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'It does not have an amount and description property!' }));
            }
            else if ((data.amount == "") || (data.description == "")) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'You need to type in an amount and a description' }));
            }
            else {
                tickets = addNewTicket(data, tickets);

                console.log("New ticket...");
                console.log(data);
                console.log("created!");

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Added a new ticket", current: tickets }));
                showAllUsers();
            }

        });
    }

    // Get HTTP Test (SUCCESS)
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = { Status: "Working" };
        // the response endpoint can only be called once per request
        res.end(JSON.stringify(data));
    }

})

server.listen(port, () => {
    console.log(`Server is listening on port http://localhost:${port}`);
})

function showAllUsers() {
    //need at least 1 element for the foreach loop to work.
    users.forEach(element => {
        console.log(element);
    });
    // console.log(users);
}

function registerNewUser(body, array) {
    body.role = "employee";
    array.push(body);
    return array;
}

function addNewTicket(body, array) {
    body.role = "pending";
    body.date = new Date().toLocaleDateString();
    array.push(body);
    return array;
}

function test() {
    console.log("hello world");
}

function checkForDuplicateUsernames(array, data) {
    result = false;

    array.forEach(element => {
        // console.log(JSON.stringify(element.username) + "V.S." + JSON.stringify(data.username));
        // console.log(JSON.stringify(element.username) == JSON.stringify(data.username));
        if (JSON.stringify(element.username) == JSON.stringify(data.username)) {
            result = true;
        }
    });

    // Test Code to use outside this function
    // console.log(checkForDuplicateUsernames(users, {
    //     username: "user4",
    //     password: "pass2"
    // }))

    return result;
}

//#region
// Database Connection (Currently Works)
// // set your aws region

// AWS.config.update({

//     region: 'us-east-1'

// });

// // create a dynamoDB client

// const dynamoDB = new AWS.DynamoDB();

// // print a list of the tables

// dynamoDB.listTables({}, (err, data) => {

//     if (err) {

//         console.error('Error', err);

//     } else {

//         console.log('Tables:', data.TableNames);

//     }

// });

//#endregionendregion