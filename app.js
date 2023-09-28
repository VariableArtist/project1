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
const util = require('./utility/appUtil');

const port = 3000;

AWS.config.update({

    region: 'us-east-1'

});

const docClient = new AWS.DynamoDB.DocumentClient();

// NEED TO FIX ALL CHUNK DATA USING THE BODY PARSER
app.use(bodyParser.json());

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
// -Show all previous tickets
// -Show all pending tickets
// -Update a pending ticket and post result to the previous ticket table
// -Search and find a specific ticket
// -Delete a ticket 
// -Get user by username
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
            // console.log(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Now displaying users.", data }));
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Failed to retrieve users.", data }));
        });
});

// (GENERAL FEATURE): Register a new user
// POST request for adding a new user using body raw JSON in postman 
app.post('/register', util.validateUsernameAndPassword, (req, res) => {

    // console.log(req.username);
    // console.log(req.password);

    dao.getUsersWithUserNameSI(req.username).then((userNameData) => {
        if (userNameData.Count == 0) {
            dao.registerNewUser(uuid.v4(), req.username, req.password)
                .then((newUserData) => {
                    // console.log("Made New User!");
                    // console.log(newUserData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "Registered a new user." }));
                })
                .catch((err) => {
                    console.log(err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "Failed to register new users.", data }));
                });
        }
        else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "User already exists." }));
        }
    })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Could not make new user." }));
        })

});

// (GENERAL FEATURE): Login a user
// POST request for logging in 
app.post('/login', util.validateUsernameAndPassword, (req, res) => {

    dao.getUsersWithUserNameSI(req.username, req.password)
        .then((userNameData) => {
            // console.log(userNameData);
            if (userNameData.Count > 0) {
                // console.log(userNameData.Items[0].username);
                // console.log(userNameData.Items[0].role);

                if (userNameData.Items[0].password == req.password) {
                    const token = util.createJWT(userNameData.Items[0].username, userNameData.Items[0].role)
                    res.writeHead(200, { 'Content-Type': 'application/json', 'User-Logged-In': `${userNameData.Items[0].username}`, 'Role': `${userNameData.Items[0].role}` });
                    res.end(JSON.stringify({ message: "Successfully Authenticated, Welcome User", role: userNameData.Items[0].role, token: token }));
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "User with that password does not exist" }));
                }

            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "User does not exist" }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Failed to get users." }));
        });
});

// (EMPLOYEE FEATURE): Make a new ticket
// POST request for adding new tickets 
app.post('/tickets/new', util.validateToken, util.validateEmployee, util.validateTicket, (req, res) => {
    let data = req.body;

    let type = "n/a"
    if (data.type != null && data.type != "") {
        type = data.type;
    }

    const newID = uuid.v4()
    dao.addNewTicket(newID, req.amount, req.description, req.username, type)
        .then((newTicketData) => {
            newDATA = newTicketData;
            // console.log(newTicketData);
            // console.log("New ticket created!");

            dao.getTicketWithID(newID)
                .then((getTicketByIDdata) => {
                    // console.log(getTicketByIDdata)
                    dao.moveTicketToTable('tickets_previous', getTicketByIDdata.Item)
                        .then((moveTicketToTableData) => {
                            // console.log(moveTicketToTableData);
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
});

// (EMPLOYEE FEATURE): Show an employee's previous tickets
// GET request for showing all previous tickets 
app.get('/tickets/previous/employee', util.validateToken, util.validateEmployee, (req, res) => {
    dao.getTicketsByUserNameSI(req.username)
        .then((ticketUsernameData) => {
            // console.log(ticketUsernameData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Now displaying previous tickets", tickets: ticketUsernameData }));
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Failed to get tickets with requested username.", ticketUsernameData }));
        });

});

// (EMPLOYEE FEATURE): Show an employes's previous tickets by type
// GET request for showing all previous tickets by type 
app.get('/tickets/previous/employee/type/', util.validateToken, util.validateEmployee, util.validateQuery, (req, res) => {
    dao.getPreviousTicketsWithUsernameAndTypeSI(req.username, req.queryId)
        .then((ticketUsernameData) => {
            // console.log(ticketUsernameData);
            if (ticketUsernameData.Count > 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now displaying employee's previous tickets by type.", ticketUsernameData }));
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Employee has no tickets with that type.` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Ticket Does not exist.` }));
        });

});

// (MANAGER FEATURE): Show all previous tickets
app.get('/tickets/previous/all', util.validateToken, util.validateManager, (req, res) => {

    dao.getAllTicketsFromTable('tickets_previous')
        .then((data) => {
            // console.log(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Now displaying previous tickets.", data }));
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Failed to get tickets from tickets_previous table.` }));
        });

});

// (MANGAER FEATURE): Show all pending tickets
// GET request for showing all the tickets 
app.get('/tickets/pending/all', util.validateToken, util.validateManager, (req, res) => {

    dao.getAllTickets()
        .then((data) => {
            // console.log(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Now displaying pending tickets.", data }));
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Failed to get tickets from tickets_pending table.` }));
        });

});

// (MANAGER FEATURE): Search and find a specific ticket
// GET request for showing a specific ticket 
app.get('/tickets/pending/find/', util.validateToken, util.validateManager, util.validateQuery, (req, res) => {
    dao.getTicketsWithIdQuery(req.queryId)
        .then((getTicketByIDdata) => {
            // console.log(getTicketByIDdata);
            if (getTicketByIDdata.Count > 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now displaying ticket", ticket: getTicketByIDdata.Items[0] }));
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
});

// (MANAGER FEATURE): Update a pending ticket and post result to the previous ticket table
// put request for adding new tickets to the approve denied table 
// and deleting the coresponding ticket in the pending table 
app.put('/tickets/pending/update/', util.validateToken, util.validateManager, util.validateQuery, util.validateTicketStatus, (req, res) => {

    dao.getTicketsWithIdQuery(req.queryId)
        .then((getTicketWithIDdata) => {
            if (getTicketWithIDdata.Count > 0) {
                // console.log(getTicketWithIDdata)

                getTicketWithIDdata.Items[0].status = req.status;

                dao.moveTicketToTable('tickets_approved_denied', getTicketWithIDdata.Items[0])
                    .then((data) => {
                        // console.log(data);
                    })
                    .catch((err) => { console.log(err); });

                dao.deleteTicketByIdInTable('tickets_previous', req.queryId)
                    .then((data) => {
                        // console.log(data);
                    })
                    .catch((err) => { console.log(err); });

                dao.moveTicketToTable('tickets_previous', getTicketWithIDdata.Items[0])
                    .then((data) => {
                        // console.log(data);
                    })
                    .catch((err) => { console.log(err); });

                dao.deleteTicketById(req.queryId)
                    .then((data) => {
                        // console.log(data);
                    })
                    .catch((err) => { console.log(err); });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now updating ticket", ticket: getTicketWithIDdata.Items[0] }));

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

});

// (MANAGER FEATURE): Delete a pending ticket
// Delete request for deleting tickets 
app.delete('/tickets/pending/delete/', util.validateToken, util.validateManager, util.validateQuery, (req, res) => {

    dao.getTicketsWithIdQuery(req.queryId)
        .then((getTicketWithIDdata) => {
            if (getTicketWithIDdata.Count > 0) {

                getTicketWithIDdata.Items[0].status = "denied";

                dao.moveTicketToTable('tickets_previous', getTicketWithIDdata.Items[0])
                    .then((data) => {
                        // console.log(data);
                    })
                    .catch((err) => { console.log(err); });

                dao.deleteTicketByIdInTable('tickets_pending', req.queryId)
                    .then((data) => {
                        // console.log(data);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: "Deleted Ticket", ticket: getTicketWithIDdata.Items[0] }));
                    })
                    .catch((err) => {
                        console.log(err);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Failed to delete ticket by ID!' }));
                    });
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
        })

});

// (MANAGER FEATURE): Get user by username
// GET request for retrieving a user by username
app.get('/users/find/', util.validateToken, util.validateManager, util.validateQuery, (req, res) => {
    dao.getUsersWithUserNameSI(req.queryId)
        .then((getUsersWithUserNameData) => {
            // console.log(getTicketByIDdata);
            if (getUsersWithUserNameData.Count > 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "Now displaying user with username", getUsersWithUserNameData: getUsersWithUserNameData.Items[0] }));
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `User does not exist` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Failed to find user with username` }));
        });
});

// (MANAGER FEATURE): Update user role
// PUT request for updating a users role
app.put('/user/change/role/', util.validateToken, util.validateManager, util.validateQuery, util.validateRole, (req, res) => {

    dao.getUsersWithUserNameSI(req.queryId)
        .then((getUsersWithUserNameData) => {
            // console.log(getTicketByIDdata);
            if (getUsersWithUserNameData.Count > 0) {
                dao.updateUserRole(getUsersWithUserNameData.Items[0].user_id, req.roleToAssign).then((updateUserRoleData) => {
                    // console.log(updateUserRoleData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `Changed role to ${req.roleToAssign}.` }));
                })
                    .catch((err) => {
                        console.log(err);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: `Failed to change users role.` }));
                    })
            }
            else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `User does not exist` }));
            }
        })
        .catch((err) => {
            console.log(err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Failed to find user with username` }));
        });



});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

