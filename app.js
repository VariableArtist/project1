const { createLogger, transports, format, error } = require('winston');
const http = require('http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const uuid = require('uuid');
const url = require('node:url');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');

const port = 3000;

AWS.config.update({

    region: 'us-east-1'

});

const docClient = new AWS.DynamoDB.DocumentClient();

// GENERAL FEATURES:
// -Test
// -Show all users
// -Register a new user
// -Login a user

// EMPLOYEE FEATURES: 
// -Make a new ticket
// -Show an employee's previous tickets

// MANAGER FEATURES:
// -Show all pending tickets
// -Search and find a specific ticket
// -Update a pending ticket and post result to the previous ticket table
// -Delete a ticket 

// (GENERAL FEATURE): Test
// GET request for testing connection
app.get('/', (req, res) => {
    res.send("hello world");
});

// (GENERAL FEATURE): Show all users
// GET request for all users
app.get('/users', (req, res) => {
    getAllUsers()
        .then((data) => {
            console.log(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Now displaying users", data }));
        })
        .catch((err) => {
            console.log(err);
        });
});

// (GENERAL FEATURE): Register a new user
// POST request for adding a new user using body raw JSON in postman 
app.post('/register', (req, res) => {

    console.log("REGISTERING");

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
});

// (GENERAL FEATURE): Login a user
// POST request for logging in 
app.post('/login', (req, res) => {

    console.log("LOGIN");

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
                .then((userNameData) => {
                    console.log(userNameData);
                    if (userNameData.Count > 0) {
                        console.log(userNameData.Items[0].username);
                        console.log(userNameData.Items[0].role);

                        const token = createJWT(userNameData.Items[0].username, userNameData.Items[0].role)
                        res.writeHead(200, { 'Content-Type': 'application/json', 'User-Logged-In': `${userNameData.Items[0].username}`, 'Role': `${userNameData.Items[0].role}` });
                        res.end(JSON.stringify({ message: "Successfully Authenticated, Welcome User", role: userNameData.Items[0].role, token: token }));
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
    });
});

// (MANGAER FEATURE): Show all pending tickets
// GET request for showing all the tickets 
app.get('/tickets/show', (req, res) => {

    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role === 'manager') {
                getAllTickets()
                    .then((data) => {
                        console.log(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Now displaying current tickets", data }));
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `You are not a manager, you are a / an ${tokenData.role}` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
        })

});

// (EMPLOYEE FEATURE): Show an employee's previous tickets
// GET request for showing all previous tickets 
app.get('/tickets/previous/employee', (req, res) => {

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });

    req.on('end', () => {
        const data = JSON.parse(body);

        const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
        verifyTokenAndReturnPayload(token)
            .then((tokenData) => {
                if (tokenData.role === 'employee') {
                    getTicketsWithUsername(tokenData.username)
                        .then((ticketUsernameData) => {
                            console.log(ticketUsernameData);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Now displaying previous tickets", ticketUsernameData }));
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `You are not an employee, you are a/an ${tokenData.role}` }));
                }
            })
            .catch((err) => {
                console.log(err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
            });
    })

});

// (MANAGER FEATURE): Show all previous tickets
app.get('/tickets/previous/all', (req, res) => {
    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];

    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role === 'manager') {
                getAllTicketsFromTable('tickets_previous')
                    .then((data) => {
                        console.log(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Now displaying previous tickets", data }));
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `You are not a manager, you are a / an ${tokenData.role}` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
        });

});

// (MANAGER FEATURE): Search and find a specific ticket
// GET request for showing a specific ticket 
app.get('/tickets/find', (req, res) => {
    const requestUrl = req.query;
    console.log(requestUrl.id);

    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role === 'manager') {
                getTicketsWithID(requestUrl.id)
                    .then((getTicketByIDdata) => {
                        console.log(getTicketByIDdata);
                        if (getTicketByIDdata.Count > 0) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Now displaying ticket", getTicketByIDdata }));
                        }
                        else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: `Ticket Does not exist` }));
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
            else if (requestUrl == null || requestUrl.id == null || requestUrl.id == "") {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'No Query' }));
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `You are not an employee, you are a / an ${tokenData.role}` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
        });

});

// (MANAGER FEATURE): Update a pending ticket and post result to the previous ticket table
// put request for adding new tickets to the approve denied table 
// and deleting the coresponding ticket in the pending table 
app.put('/tickets/update', (req, res) => {
    const requestUrl = req.query;
    console.log(requestUrl.id);

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });

    req.on('end', () => {
        const data = JSON.parse(body);

        const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
        verifyTokenAndReturnPayload(token)
            .then((tokenData) => {
                if (tokenData.role !== 'manager') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `You are not a manager, you are a / an ${tokenData.role}` }));
                }
                else if (requestUrl == null || requestUrl.id == null || requestUrl.id == "") {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'No Query' }));
                }
                else if (data.status == null || data.status == "") {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'No "approved" or "denied" Status Writen' }));
                }
                else if (data.status == "approved" || data.status == "denied") {
                    getTicketsWithID(requestUrl.id)
                        .then((getTicketWithIDdata) => {
                            if (getTicketWithIDdata.Count > 0) {
                                console.log(getTicketWithIDdata)

                                getTicketWithIDdata.Items[0].status = data.status;

                                moveTicketToTable('tickets_approved_denied', getTicketWithIDdata.Items[0])
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                deleteTicketByIdInTable('tickets_previous', requestUrl.id)
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                moveTicketToTable('tickets_previous', getTicketWithIDdata.Items[0])
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                deleteTicketById(requestUrl.id)
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: "Now updating ticket", getTicketWithIDdata }));

                            }
                            else {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'Ticket Does Not Exist!' }));
                            }
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'No valid "approved" or "denied" Status Writen' }));
                }
            })
            .catch((err) => {
                console.log(err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
            });



    })

});

// (EMPLOYEE FEATURE): Make a new ticket
// POST request for adding new tickets 
app.post('/tickets/new', (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });

    req.on('end', () => {
        // console.log((JSON.stringify(data.amount)));
        // console.log((JSON.stringify(data.description)));
        const data = JSON.parse(body);

        const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
        verifyTokenAndReturnPayload(token)
            .then((tokenData) => {
                console.log(tokenData);
                if (tokenData.role != 'employee') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `You are not an employee, you are a/an ${tokenData.role}` }));
                }
                else if ((data.amount == null) || (data.description == null)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'It does not have an amount and description property!' }));
                }
                else if ((data.amount == "") || (data.description == "")) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'You need to type in an amount and a description' }));
                }
                else {
                    const newID = uuid.v4()
                    addNewTicket(newID, data.amount, data.description, tokenData.username)
                        .then((newTicketData) => {
                            newDATA = newTicketData;
                            console.log(newTicketData);
                            console.log("New ticket created!");

                            getTicketByID(newID)
                                .then((getTicketByIDdata) => {
                                    console.log(getTicketByIDdata)
                                    moveTicketToTable('tickets_previous', getTicketByIDdata.Item)
                                        .then((moveTicketToTableData) => {
                                            console.log(moveTicketToTableData);
                                            res.writeHead(200, { 'Content-Type': 'application/json' });
                                            res.end(JSON.stringify({
                                                message: "Added a new ticket",
                                                message2: "A Copy has been sent to the previous tickets table."
                                            }));
                                        })
                                        .catch((err) => { console.log(err); });
                                })
                                .catch((err) => {
                                    console.log(err);
                                })



                        })
                        .catch((err) => {
                            console.log(err);
                        });

                }
            })
            .catch((err) => {
                console.log(err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
            });

    });
});

// (MANAGER FEATURE): Delete a pending ticket
// Delete request for deleting tickets 
app.delete('/tickets/delete', (req, res) => {
    const requestUrl = req.query;
    console.log(requestUrl.id);

    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role !== 'manager') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `You are not a manager, you are a/an ${tokenData.role}` }));
            }
            else if (requestUrl == null || requestUrl.id == null || requestUrl.id == "") {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'No Query' }));
            }
            else {
                deleteTicketById(requestUrl.id)
                    .then((data) => {
                        console.log(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Deleted Ticket" }));
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
        });

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

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

function getAllTicketsFromTable(nameOfTable) {
    const params = {
        TableName: nameOfTable
    }

    return docClient.scan(params).promise();
}

// getTicketByID("53905e0f-2030-4110-bfb8-09a41d237fe1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketByID(ticket_id) {
    const params = {
        TableName: 'tickets',
        Key: {
            ticket_id
        }
    }

    return docClient.get(params).promise();
}


// getTicketsWithID("1e2854ea-7603-4467-a12f-9740d6d2a2c5").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketsWithID(ticket_id) {
    const params = {
        TableName: 'tickets',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'ticket_id'
        },
        ExpressionAttributeValues: {
            ':value': ticket_id,
        },
        limit: 1
    }

    return docClient.scan(params).promise();
}

function getTicketsWithUsername(username) {
    const params = {
        TableName: 'tickets_previous',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username,
        },
    }

    return docClient.scan(params).promise();
}


// addNewTicket(uuid.v4(), 50.0, "none").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function addNewTicket(ticket_id, amount, description, username) {
    const params = {
        TableName: 'tickets',
        Item: {
            ticket_id,
            amount,
            description,
            status: 'pending',
            date: new Date().toLocaleDateString(),
            username: username,
        },
    }

    return docClient.put(params).promise();
}

// testItem = {
//     ticket_id: uuid.v4(),
//     amount: 0.00,
//     description: "nada",
//     status: 'Approved',
//     date: new Date().toLocaleDateString()
// }

// moveTicketToTable('tickets_previous', testItem)
//     .then((data) => { console.log(data); })
//     .catch((err) => { console.log(err); });

function moveTicketToTable(nameOfTable, itemToAdd) {
    const params = {
        TableName: nameOfTable,
        Item: itemToAdd
    }

    return docClient.put(params).promise();
}

// deleteTicketById("53905e0f-2030-4110-bfb8-09a41d237fe1").then((data) => { console.log("ItemDelete"); }).catch((err) => { console.log(err); });

function deleteTicketById(ticket_id) {
    const params = {
        TableName: 'tickets',
        Key: {
            ticket_id
        }
    }

    return docClient.delete(params).promise();
}

function deleteTicketByIdInTable(nameOfTable, ticket_id) {
    const params = {
        TableName: nameOfTable,
        Key: {
            ticket_id
        }
    }

    return docClient.delete(params).promise();
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

function createJWT(username, role) {
    return jwt.sign({
        username,
        role,
    }, 'thisisasecret', {
        expiresIn: '1d'
    })
}

jwt.verify = Promise.promisify(jwt.verify); // Turn jwt.verify into a function that returns a promise


function verifyTokenAndReturnPayload(token) {
    return jwt.verify(token, 'thisisasecret');
}

function test() {
    console.log("hello world");
}