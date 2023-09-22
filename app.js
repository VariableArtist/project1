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
const { Console } = require('winston/lib/winston/transports');
const dao = require('./utility/appDao');

const port = 3000;

AWS.config.update({

    region: 'us-east-1'

});

const docClient = new AWS.DynamoDB.DocumentClient();


// Table of Features ----------------------------------------------------------

// GENERAL FEATURES:
// -Test
// -Show all users
// -Register a new user
// -Login a user

// EMPLOYEE FEATURES: 
// -Make a new ticket
// -Show an employee's previous tickets
// -Show an employee's previous tickets by type

// MANAGER FEATURES:
// -Show all pending tickets
// -Show all previous tickets
// -Search and find a specific ticket
// -Update a pending ticket and post result to the previous ticket table
// -Delete a ticket 
// -Update a users role

// --------------------------------------------------------------------------


// (GENERAL FEATURE): Test
// GET request for testing connection
app.get('/', (req, res) => {
    res.send("hello world");
});

// (GENERAL FEATURE): Show all users
// GET request for all users
app.get('/users', (req, res) => {
    dao.getAllUsers()
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
            dao.getUsersWithUserName(data.username).then((userNameData) => {
                // console.log(data);
                if (userNameData.Count == 0) {
                    dao.registerNewUser(uuid.v4(), data.username, data.password)
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
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "Could not make new user." }));
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
            dao.getUsersWithUsernameAndPassword(data.username, data.password)
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
                    let type = "n/a"
                    if (data.type != null || data.type != "") {
                        type = data.type;
                    }

                    const newID = uuid.v4()
                    dao.addNewTicket(newID, data.amount, data.description, tokenData.username, type)
                        .then((newTicketData) => {
                            newDATA = newTicketData;
                            console.log(newTicketData);
                            console.log("New ticket created!");

                            dao.getTicketByID(newID)
                                .then((getTicketByIDdata) => {
                                    console.log(getTicketByIDdata)
                                    dao.moveTicketToTable('tickets_previous', getTicketByIDdata.Item)
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
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ message: 'Failed to identify newly added ticket!' }));
                                })
                        })
                        .catch((err) => {
                            console.log(err);
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Failed to add new ticket!' }));
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
                    dao.getTicketsWithUsername(tokenData.username)
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

// (EMPLOYEE FEATURE): Show an employes's previous tickets by type
// GET request for showing all previous tickets by type 
app.get('/tickets/previous/employee/type', (req, res) => {

    const requestUrl = req.query;
    console.log(requestUrl.type);

    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            console.log(tokenData);
            console.log(tokenData.username);
            console.log(requestUrl.type);
            if (tokenData.role === 'employee') {
                dao.getPreviousTicketsWithUsernameAndType(tokenData.username, requestUrl.type)
                    .then((ticketUsernameData) => {
                        console.log(ticketUsernameData);
                        if (ticketUsernameData.Count > 0) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: "Now displaying previous tickets", ticketUsernameData }));
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

});

// (MANGAER FEATURE): Show all pending tickets
// GET request for showing all the tickets 
app.get('/tickets/show', (req, res) => {

    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];
    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role === 'manager') {
                dao.getAllTickets()
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

// (MANAGER FEATURE): Show all previous tickets
app.get('/tickets/previous/all', (req, res) => {
    const token = req.headers.authorization.split(' ')[1]; // ['Bearer', '<token>'];

    verifyTokenAndReturnPayload(token)
        .then((tokenData) => {
            if (tokenData.role === 'manager') {
                dao.getAllTicketsFromTable('tickets_previous')
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
                dao.getTicketsWithID(requestUrl.id)
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
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: `Failed to find ticket(s) with ID` }));
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
                    dao.getTicketsWithID(requestUrl.id)
                        .then((getTicketWithIDdata) => {
                            if (getTicketWithIDdata.Count > 0) {
                                console.log(getTicketWithIDdata)

                                getTicketWithIDdata.Items[0].status = data.status;

                                dao.moveTicketToTable('tickets_approved_denied', getTicketWithIDdata.Items[0])
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                dao.deleteTicketByIdInTable('tickets_previous', requestUrl.id)
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                dao.moveTicketToTable('tickets_previous', getTicketWithIDdata.Items[0])
                                    .then((data) => { console.log(data); })
                                    .catch((err) => { console.log(err); });

                                dao.deleteTicketById(requestUrl.id)
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
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Failed to find ticket(s) with ID!' }));
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

// BUG REPORT: IT SAYS DELETES TICKETS WITH NO ID
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
                dao.deleteTicketById(requestUrl.id)
                    .then((data) => {
                        console.log(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Deleted Ticket" }));
                    })
                    .catch((err) => {
                        console.log(err);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Failed to delete ticket by ID!' }));
                    });
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Failed to Authenticate Token!' }));
        });

});

// (MANAGER FEATURE): Update user role
// PUT request for updating a users role
app.put('/user/change/role', (req, res) => {

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
                if (tokenData.role === 'manager') {
                    if ((data.role == null)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'It does not have a role property!' }));
                    }
                    else if ((data.role == "")) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'You need to type in a role!' }));
                    }
                    else if ((data.role == "employee") || (data.role == "manager")) {
                        dao.updateUserRole(requestUrl.id, data.role).then((updateUserRoleData) => {
                            console.log(updateUserRoleData);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: `Changed role to ${data.role}.` }));
                        })
                            .catch((err) => {
                                console.log(err);
                            })
                    }
                    else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'The role is not an employee or manager!' }));
                    }

                }
                else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `You are not a manager you are a / an ${tokenData.role}` }));
                }
            }).catch((err) => {

            });

    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

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