const { createLogger, transports, format, error } = require('winston');
const http = require('http');
const AWS = require('aws-sdk');
const uuid = require('uuid');

const port = 3000;

AWS.config.update({

    region: 'us-east-1'

});

const docClient = new AWS.DynamoDB.DocumentClient();

let loggedInUser = null;

const server = http.createServer((req, res) => {

    // GET request for all users
    if (req.method === 'GET' && req.url === '/users') {
        getAllUsers()
            .then((data) => {
                console.log(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now displaying users", data }));
            })
            .catch((err) => {
                console.log(err);
            });
    }
    // POST request for adding a new user using body raw JSON in postman
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
            else {
                getUsersWithUserName(data.username).then((userNameData) => {
                    // console.log(data);
                    if (userNameData.Count == 0) {
                        registerNewUser(uuid.v4(), data.username, data.password)
                            .then((newUserData) => {
                                console.log("Made New User!");
                                console.log(newUserData);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: "Added a new user!" }));
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                    }
                    else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "User Already Exists!" }));
                    }
                })
                    .catch((err) => {
                        console.log(err);
                    })
            }
        });
    }
    // GET request for who is logged in
    // POST request for loging in
    else if (req.method === 'POST' && req.url === '/login') {
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
            else {
                getUsersWithUsernameAndPassword(data.username, data.password)
                    .then((data) => {
                        console.log(data);
                        if (data.Count > 0) {
                            res.writeHead(200, { 'Content-Type': 'application/json', 'User-Logged-In': "RENAME-LATER" });
                            res.end(JSON.stringify({ message: "Welcome User" }));
                        }
                        else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "User with that password does not exist" }));
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
        })
    }
    // GET request for showing all the tickets
    else if (req.method === 'GET' && req.url === '/tickets/show') {
        getAllTickets()
            .then((data) => {
                console.log(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now displaying tickets", data }));
            })
            .catch((err) => {
                console.log(err);
            });
    }
    // POST request for adding new tickets
    else if (req.method === 'POST' && req.url === '/tickets/new') {

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
                addNewTicket(uuid.v4(), data.amount, data.description)
                    .then((data) => {
                        console.log(data);
                        console.log("New ticket created!");
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Added a new ticket" }));
                    })
                    .catch((err) => {
                        console.log(err);
                    });



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


function getAllUsers() {
    const params = {
        TableName: 'users'
    }

    return docClient.scan(params).promise();
}

function getUsersWithUserName(username) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username
        },
    }

    return docClient.scan(params).promise();
}

// getUsersWithPassword("pass1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getUsersWithPassword(password) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'password'
        },
        ExpressionAttributeValues: {
            ':value': password
        },
    }

    return docClient.scan(params).promise();
}

// getUsersWithUsernameAndPassword("user1", "pass1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getUsersWithUsernameAndPassword(username, password) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value AND #p = :value2',
        ExpressionAttributeNames: {
            '#c': 'username',
            '#p': 'password'

        },
        ExpressionAttributeValues: {
            ':value': username,
            ':value2': password
        },
        limit: 1
    }

    return docClient.scan(params).promise();
}

function registerNewUser(user_id, username, password) {
    const params = {
        TableName: 'users',
        Item: {
            username,
            password,
            role: 'employee',
            user_id
        }
    }

    return docClient.put(params).promise();
}

// getAllTickets().then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getAllTickets() {
    const params = {
        TableName: 'tickets'
    }

    return docClient.scan(params).promise();
}

// addNewTicket(uuid.v4(), 50.0, "none").then((data) => { console.log(data); }).catch((err) => { console.log(err); });;

function addNewTicket(ticket_id, amount, description) {
    const params = {
        TableName: 'tickets',
        Item: {
            ticket_id,
            amount,
            description,
            status: "pending",
            date: new Date().toLocaleDateString()
        }
    }

    return docClient.put(params).promise();
}

function addNewTicketV1(body, array) {
    body.role = "pending";
    body.date = new Date().toLocaleDateString();
    array.push(body);
    return array;
}


// console.log(checkForDuplicateUsernames("user3"));

function checkForDuplicateUsernames(username) {
    result = false;

    let holdingData = getUsersWithUserName(username).then((data) => {
        console.log(data);
        // console.log(data.Count);
        // if (data) {
        //     console.log("Found a duplicate!");
        //     result = true;
        //     return true;
        // }
        // else {
        //     console.log("No duplicate!");
        //     return false;
        // }
    })
        .catch((err) => {
            console.log(err);
        });

    console.log(holdingData);

    return result;

    // array.forEach(element => {
    //     // console.log(JSON.stringify(element.username) + "V.S." + JSON.stringify(data.username));
    //     // console.log(JSON.stringify(element.username) == JSON.stringify(data.username));
    //     if (JSON.stringify(element.username) == JSON.stringify(data.username)) {
    //         result = true;
    //     }
    // });

}

function test() {
    console.log("hello world");
}